"""
Database connection factory
This factory creates the appropriate database service based on configuration
"""

from functools import lru_cache
from src.config.settings import get_settings
from src.database.base import DatabaseService

# Import database implementations (will be created later)
# from src.database.redis_service import RedisService
# from src.database.sqlite_service import SQLiteService
# from src.database.postgres_service import PostgreSQLService

class MockDatabaseService(DatabaseService):
    """Mock database service for initial setup"""
    
    async def initialize(self) -> None:
        print("🔧 Mock database service initialized")
    
    async def close(self) -> None:
        print("🔧 Mock database service closed")
    
    async def ping(self) -> bool:
        return True
    
    # Mock implementations of all abstract methods
    async def create_user(self, user_data): return user_data
    async def get_user_by_id(self, user_id): return None
    async def get_user_by_username(self, username): return None
    async def get_user_by_email(self, email): return None
    async def update_user(self, user_id, user_data): return user_data
    async def delete_user(self, user_id): return True
    
    async def create_post(self, post_data): return post_data
    async def get_post_by_id(self, post_id): return None
    async def get_posts(self, limit=10, offset=0, filters=None): return []
    async def update_post(self, post_id, post_data): return post_data
    async def delete_post(self, post_id): return True
    async def get_posts_by_user(self, user_id, limit=10, offset=0): return []
    async def get_posts_by_tag(self, tag_name, limit=10, offset=0): return []
    
    async def create_comment(self, comment_data): return comment_data
    async def get_comments_by_post(self, post_id): return []
    async def update_comment(self, comment_id, comment_data): return comment_data
    async def delete_comment(self, comment_id): return True
    
    async def create_tag(self, tag_data): return tag_data
    async def get_all_tags(self): return []
    async def get_tag_by_name(self, tag_name): return None
    async def update_tag_stats(self, tag_name, posts_count): pass
    
    async def add_reaction(self, post_id, user_id, reaction_type): return {}
    async def remove_reaction(self, post_id, user_id, reaction_type): return True
    async def get_post_reactions(self, post_id): return []
    
    async def search_posts(self, query, limit=10, offset=0): return []
    async def search_users(self, query, limit=10, offset=0): return []

@lru_cache()
def get_database_service() -> DatabaseService:
    """
    Factory function to get the appropriate database service
    based on configuration
    """
    from ..services.database.factory import DatabaseServiceFactory
    return DatabaseServiceFactory.create_service()
