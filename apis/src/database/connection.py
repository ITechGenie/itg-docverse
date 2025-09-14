"""
Database connection factory
This factory creates the appropriate database service based on configuration
"""

from functools import lru_cache
from src.config.settings import get_settings
from src.database.base import DatabaseService

@lru_cache()
def get_database_service() -> DatabaseService:
    """
    Factory function to get the appropriate database service
    based on configuration
    """
    from ..services.database.factory import DatabaseServiceFactory
    return DatabaseServiceFactory.create_service()
