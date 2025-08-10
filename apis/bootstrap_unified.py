#!/usr/bin/env python3
"""
ITG DocVerse Database Bootstrap Script
Creates initial sample data for the application using centralized bootstrap data
"""

import asyncio
import logging
from typing import List

from src.services.database.factory import DatabaseServiceFactory
from src.config.settings import settings
from bootstrap_data import BootstrapData

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseBootstrap:
    """Bootstrap the database with initial sample data"""
    
    def __init__(self):
        self.db_service = DatabaseServiceFactory.create_service()
    
    async def initialize(self):
        """Initialize the database connection"""
        await self.db_service.initialize()
        logger.info("Database service initialized")
    
    async def run_bootstrap(self):
        """Run the complete bootstrap process"""
        logger.info("🚀 Starting ITG DocVerse database bootstrap...")
        logger.info(f"   Database type: {settings.database_type}")
        
        try:
            # Initialize database connection
            await self.initialize()
            
            # Get centralized bootstrap data
            users = BootstrapData.get_users()
            tags = BootstrapData.get_tags()
            posts = BootstrapData.get_posts(users, tags)
            comments = BootstrapData.get_comments(posts, users)
            
            # Create data using service layer
            created_users = []
            for user in users:
                try:
                    created_user = await self.db_service.create_user(user)
                    created_users.append(created_user)
                    logger.info(f"Created user: {user.username}")
                except Exception as e:
                    logger.warning(f"User {user.username} might already exist: {e}")
            
            created_tags = []
            for tag in tags:
                try:
                    created_tag = await self.db_service.create_tag(tag)
                    created_tags.append(created_tag)
                    logger.info(f"Created tag: {tag.name}")
                except Exception as e:
                    logger.warning(f"Tag {tag.name} might already exist: {e}")
            
            created_posts = []
            for post in posts:
                try:
                    created_post = await self.db_service.create_post(post)
                    created_posts.append(created_post)
                    logger.info(f"Created post: {post.title[:50]}...")
                except Exception as e:
                    logger.warning(f"Post {post.title[:30]} might already exist: {e}")
            
            created_comments = []
            for comment in comments:
                try:
                    created_comment = await self.db_service.create_comment(comment)
                    created_comments.append(created_comment)
                    logger.info(f"Created comment on post: {comment.post_id}")
                except Exception as e:
                    logger.warning(f"Comment on {comment.post_id} might already exist: {e}")
            
            logger.info("✅ Bootstrap completed successfully!")
            logger.info(f"   Created {len(created_users)} users")
            logger.info(f"   Created {len(created_tags)} tags") 
            logger.info(f"   Created {len(created_posts)} posts")
            logger.info(f"   Created {len(created_comments)} comments")
            
        except Exception as e:
            logger.error(f"❌ Bootstrap failed: {e}")
            raise
        finally:
            # Close database connection
            await self.db_service.close()
            logger.info("Database connection closed")

async def main():
    """Main bootstrap function"""
    bootstrap = DatabaseBootstrap()
    await bootstrap.run_bootstrap()

if __name__ == "__main__":
    asyncio.run(main())
