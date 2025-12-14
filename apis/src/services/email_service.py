"""
Email Service with SMTP Connection Pooling
Handles sending HTML emails with retry logic and rate limiting
"""

import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
from datetime import datetime, timedelta
import time

from ..config.settings import settings
from ..utils.logger import get_logger

logger = get_logger("EmailService", level="DEBUG", json_format=False)


class EmailService:
    """Service for sending emails with connection pooling and retry logic"""
    
    def __init__(self):
        self.smtp_host = settings.smtp_host
        self.smtp_port = settings.smtp_port
        self.smtp_username = settings.smtp_username
        self.smtp_password = settings.smtp_password
        self.from_email = settings.smtp_from_email
        self.connection_timeout = settings.smtp_connection_timeout
        self.max_emails_per_hour = settings.max_emails_per_hour
        self.email_delay_seconds = settings.email_delay_seconds
        
        # Connection pool
        self._connection: Optional[smtplib.SMTP] = None
        self._connection_created_at: Optional[datetime] = None
        self._connection_email_count = 0
        
        # Rate limiting
        self._emails_sent_this_hour = 0
        self._hour_start_time = datetime.utcnow()
        
        logger.info(f"EmailService initialized: {self.smtp_host}:{self.smtp_port}, max_emails_per_hour={self.max_emails_per_hour}")
    
    def _get_connection(self) -> smtplib.SMTP:
        """Get or create SMTP connection with pooling"""
        current_time = datetime.utcnow()
        
        # Check if connection is stale (older than 5 minutes or sent 100+ emails)
        if self._connection is not None:
            connection_age = (current_time - self._connection_created_at).total_seconds()
            if connection_age > 300 or self._connection_email_count >= 100:
                logger.debug(f"Connection stale (age: {connection_age}s, emails: {self._connection_email_count}), closing...")
                try:
                    self._connection.quit()
                except Exception as e:
                    logger.warning(f"Error closing stale connection: {e}")
                self._connection = None
        
        # Create new connection if needed
        if self._connection is None:
            logger.debug(f"Creating new SMTP connection to {self.smtp_host}:{self.smtp_port}")
            try:
                self._connection = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=self.connection_timeout)
                self._connection.starttls()
                self._connection.login(self.smtp_username, self.smtp_password)
                self._connection_created_at = current_time
                self._connection_email_count = 0
                logger.info("SMTP connection established successfully")
            except Exception as e:
                logger.error(f"Failed to create SMTP connection: {e}")
                raise
        
        return self._connection
    
    def _check_rate_limit(self):
        """Check and enforce rate limiting"""
        current_time = datetime.utcnow()
        
        # Reset counter if hour has passed
        if (current_time - self._hour_start_time).total_seconds() >= 3600:
            logger.debug(f"Hour passed, resetting rate limit counter (was {self._emails_sent_this_hour})")
            self._emails_sent_this_hour = 0
            self._hour_start_time = current_time
        
        # Check if we've hit the limit
        if self._emails_sent_this_hour >= self.max_emails_per_hour:
            wait_time = 3600 - (current_time - self._hour_start_time).total_seconds()
            logger.warning(f"Rate limit reached ({self.max_emails_per_hour} emails/hour), need to wait {wait_time:.0f}s")
            raise Exception(f"Rate limit reached. Wait {wait_time:.0f} seconds before sending more emails.")
    
    async def send_html_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        max_retries: int = 3
    ) -> bool:
        """
        Send HTML email with retry logic
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML content of the email
            max_retries: Maximum number of retry attempts (default: 3)
            
        Returns:
            True if email sent successfully, False otherwise
        """
        logger.debug(f"Attempting to send email to {to_email}: '{subject}'")
        
        # Check rate limit
        try:
            self._check_rate_limit()
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            return False
        
        # Retry loop with exponential backoff
        for attempt in range(max_retries):
            try:
                # Create message
                message = MIMEMultipart('alternative')
                message['From'] = self.from_email
                message['To'] = to_email
                message['Subject'] = subject
                
                # Attach HTML content
                html_part = MIMEText(html_content, 'html')
                message.attach(html_part)
                
                # Get connection and send
                connection = self._get_connection()
                connection.send_message(message)
                
                # Update counters
                self._connection_email_count += 1
                self._emails_sent_this_hour += 1
                
                logger.info(f"✅ Email sent successfully to {to_email} (attempt {attempt + 1}/{max_retries})")
                return True
                
            except Exception as e:
                logger.warning(f"❌ Failed to send email to {to_email} (attempt {attempt + 1}/{max_retries}): {e}")
                
                # Close connection on error
                if self._connection is not None:
                    try:
                        self._connection.quit()
                    except:
                        pass
                    self._connection = None
                
                # If this wasn't the last attempt, wait with exponential backoff
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # 1s, 2s, 4s
                    logger.debug(f"Waiting {wait_time}s before retry...")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"Failed to send email to {to_email} after {max_retries} attempts")
                    return False
        
        return False
    
    async def send_batch_with_delay(
        self,
        emails: List[tuple],  # List of (to_email, subject, html_content) tuples
        batch_size: int = 50
    ) -> dict:
        """
        Send batch of emails with delay between sends
        
        Args:
            emails: List of (to_email, subject, html_content) tuples
            batch_size: Number of emails to send before taking a break
            
        Returns:
            Dictionary with success/failure counts
        """
        total = len(emails)
        success_count = 0
        failure_count = 0
        
        logger.info(f"Starting batch email send: {total} emails, batch_size={batch_size}, delay={self.email_delay_seconds}s")
        
        for i, (to_email, subject, html_content) in enumerate(emails, 1):
            # Send email
            success = await self.send_html_email(to_email, subject, html_content)
            
            if success:
                success_count += 1
            else:
                failure_count += 1
            
            # Log progress
            if i % 10 == 0:
                logger.info(f"Progress: {i}/{total} emails sent ({success_count} success, {failure_count} failed)")
            
            # Delay between emails (except after last email)
            if i < total:
                await asyncio.sleep(self.email_delay_seconds)
            
            # Take a longer break after each batch
            if i % batch_size == 0 and i < total:
                logger.info(f"Completed batch of {batch_size}, taking 30s break...")
                await asyncio.sleep(30)
        
        logger.info(f"Batch send complete: {success_count} success, {failure_count} failed out of {total} total")
        
        return {
            "total": total,
            "success": success_count,
            "failed": failure_count
        }
    
    def close(self):
        """Close SMTP connection"""
        if self._connection is not None:
            try:
                self._connection.quit()
                logger.debug("SMTP connection closed")
            except Exception as e:
                logger.warning(f"Error closing SMTP connection: {e}")
            finally:
                self._connection = None


# Global singleton instance
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """Get or create the global email service instance"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service


def shutdown_email_service():
    """Shutdown the global email service instance"""
    global _email_service
    if _email_service is not None:
        _email_service.close()
        _email_service = None
