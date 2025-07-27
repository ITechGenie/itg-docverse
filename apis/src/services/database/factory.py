"""
Database Service Factory
Creates the appropriate database service based on configuration
"""

import logging
from typing import Type

from .base import DatabaseService
from .mock_service import MockDatabaseService
from .redis_service import RedisService
from .sqlite_service import SQLiteService
from .postgresql_service import PostgreSQLService
from ...config.settings import settings

logger = logging.getLogger(__name__)

class DatabaseServiceFactory:
    """Factory for creating database service instances"""
    
    @staticmethod
    def create_service() -> DatabaseService:
        """Create database service based on configuration"""
        db_type = settings.database_type.lower()
        
        # For testing, temporarily use MockDatabaseService
        logger.info("Creating Mock database service for testing")
        return MockDatabaseService()
        
        if db_type == "redis":
            logger.info("Creating Redis database service")
            return RedisService()
        
        elif db_type == "sqlite":
            logger.info("Creating SQLite database service")
            return SQLiteService()
        
        elif db_type == "postgresql":
            logger.info("Creating PostgreSQL database service")
            return PostgreSQLService()
        
        elif db_type == "mock":
            logger.info("Creating Mock database service")
            return MockDatabaseService()
        
        else:
            logger.warning(f"Unknown database type '{db_type}', using mock service")
            return MockDatabaseService()
