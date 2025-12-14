"""Daily Mentions Notification Job"""
import logging

logger = logging.getLogger(__name__)


async def send_daily_mentions():
    """Send daily mention notifications to users"""
    logger.info("🔔 Starting daily mentions job...")
    logger.info("  → Querying unread mentions from last 24h")
    logger.info("  → Grouping mentions by user")
    logger.info("  → [STUB] Would send notification emails here")
    logger.info("✅ Daily mentions job completed")
