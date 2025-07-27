"""
Abstract database service interface
This allows switching between Redis, SQLite, and PostgreSQL with minimal code changes
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from datetime import datetime

class DatabaseService(ABC):
    """Abstract base class for database services"""
    
    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the database connection and tables"""
        pass
    
    @abstractmethod
    async def close(self) -> None:
        """Close database connections"""
        pass
    
    @abstractmethod
    async def ping(self) -> bool:
        """Check if database is accessible"""
        pass
    
    # User operations
    @abstractmethod
    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        pass
    
    @abstractmethod
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        pass
    
    @abstractmethod
    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        pass
    
    @abstractmethod
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        pass
    
    @abstractmethod
    async def update_user(self, user_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user data"""
        pass
    
    @abstractmethod
    async def delete_user(self, user_id: str) -> bool:
        """Delete a user"""
        pass
    
    # Post operations
    @abstractmethod
    async def create_post(self, post_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new post"""
        pass
    
    @abstractmethod
    async def get_post_by_id(self, post_id: str) -> Optional[Dict[str, Any]]:
        """Get post by ID"""
        pass
    
    @abstractmethod
    async def get_posts(self, 
                       limit: int = 10, 
                       offset: int = 0, 
                       filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Get posts with pagination and filters"""
        pass
    
    @abstractmethod
    async def update_post(self, post_id: str, post_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update post data"""
        pass
    
    @abstractmethod
    async def delete_post(self, post_id: str) -> bool:
        """Delete a post"""
        pass
    
    @abstractmethod
    async def get_posts_by_user(self, user_id: str, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        """Get posts by a specific user"""
        pass
    
    @abstractmethod
    async def get_posts_by_tag(self, tag_name: str, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        """Get posts by tag"""
        pass
    
    # Comment operations
    @abstractmethod
    async def create_comment(self, comment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new comment"""
        pass
    
    @abstractmethod
    async def get_comments_by_post(self, post_id: str) -> List[Dict[str, Any]]:
        """Get all comments for a post"""
        pass
    
    @abstractmethod
    async def update_comment(self, comment_id: str, comment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update comment data"""
        pass
    
    @abstractmethod
    async def delete_comment(self, comment_id: str) -> bool:
        """Delete a comment"""
        pass
    
    # Tag operations
    @abstractmethod
    async def create_tag(self, tag_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new tag"""
        pass
    
    @abstractmethod
    async def get_all_tags(self) -> List[Dict[str, Any]]:
        """Get all tags"""
        pass
    
    @abstractmethod
    async def get_tag_by_name(self, tag_name: str) -> Optional[Dict[str, Any]]:
        """Get tag by name"""
        pass
    
    @abstractmethod
    async def update_tag_stats(self, tag_name: str, posts_count: int) -> None:
        """Update tag statistics"""
        pass
    
    # Reaction operations
    @abstractmethod
    async def add_reaction(self, post_id: str, user_id: str, reaction_type: str) -> Dict[str, Any]:
        """Add a reaction to a post"""
        pass
    
    @abstractmethod
    async def remove_reaction(self, post_id: str, user_id: str, reaction_type: str) -> bool:
        """Remove a reaction from a post"""
        pass
    
    @abstractmethod
    async def get_post_reactions(self, post_id: str) -> List[Dict[str, Any]]:
        """Get all reactions for a post"""
        pass
    
    # Search operations
    @abstractmethod
    async def search_posts(self, query: str, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        """Search posts by content"""
        pass
    
    @abstractmethod
    async def search_users(self, query: str, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        """Search users by name or username"""
        pass
