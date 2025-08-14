"""
Database Service Factory
Creates the appropriate database service based on configuration
"""

import logging
from typing import Type, Optional

from .base import DatabaseService
from .mock_service import MockDatabaseService
from .redis_service import RedisService
from .sqlite_service import SQLiteService
from .postgresql_service import PostgreSQLService
from ...config.settings import settings

logger = logging.getLogger(__name__)

class DatabaseServiceFactory:
    """Factory for creating database service instances"""
    
    _instance: Optional[DatabaseService] = None
    _initialized: bool = False
    
    @classmethod
    def create_service(cls) -> DatabaseService:
        """Create database service based on configuration - Singleton pattern"""
        if cls._instance is not None:
            return cls._instance
            
        db_type = settings.database_type.lower()

        logger.info(f"Creating singleton database service of type: {db_type}")
        
        if db_type == "redis":
            logger.info("Creating Redis database service")
            cls._instance = RedisService()
        
        elif db_type == "sqlite":
            logger.info("Creating SQLite database service")
            cls._instance = SQLiteService()
        
        elif db_type == "postgresql":
            logger.info("Creating PostgreSQL database service")
            cls._instance = PostgreSQLService()
        
        elif db_type == "mock":
            logger.info("Creating Mock database service")
            cls._instance = MockDatabaseService()
        
        else:
            logger.warning(f"Unknown database type '{db_type}', defaulting to SQLite service")
            cls._instance = SQLiteService()
            
        return cls._instance
    
    @classmethod 
    async def initialize_service(cls) -> DatabaseService:
        """Get or create and initialize the database service"""
        service = cls.create_service()
        
        if not cls._initialized:
            await service.initialize()
            cls._initialized = True
            logger.info("✅ Singleton database service initialized")
        
        return service
    
    @classmethod
    async def close_service(cls):
        """Close the database service connection"""
        if cls._instance is not None:
            await cls._instance.close()
            cls._instance = None
            cls._initialized = False
            logger.info("🔧 Singleton database service closed")
