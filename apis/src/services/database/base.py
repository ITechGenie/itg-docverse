"""
Abstract Database Service Interface
Defines the contract for all database implementations
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any

from ...models.user import User
from ...models.post import Post, PostType, PostStatus
from ...models.tag import Tag
from ...models.comment import Comment

class DatabaseService(ABC):
    """Abstract base class for database services"""
    
    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the database connection"""
        pass
    
    @abstractmethod
    async def close(self) -> None:
        """Close the database connection"""
        pass
    
    # ============================================
    # USER OPERATIONS
    # ============================================
    
    @abstractmethod
    async def create_user(self, user: User) -> User:
        """Create a new user"""
        pass
    
    @abstractmethod
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        pass
    
    @abstractmethod
    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        pass
    
    @abstractmethod
    async def get_users(self, skip: int = 0, limit: int = 10) -> List[User]:
        """Get list of users with pagination"""
        pass
    
    # ============================================
    # TAG OPERATIONS
    # ============================================
    
    @abstractmethod
    async def create_tag(self, tag: Tag) -> Tag:
        """Create a new tag"""
        pass
    
    @abstractmethod
    async def get_tag_by_id(self, tag_id: str) -> Optional[Tag]:
        """Get tag by ID"""
        pass
    
    @abstractmethod
    async def get_tag_by_name(self, name: str) -> Optional[Tag]:
        """Get tag by name"""
        pass
    
    @abstractmethod
    async def get_tags(self) -> List[Tag]:
        """Get all tags"""
        pass
    
    # ============================================
    # POST OPERATIONS
    # ============================================
    
    @abstractmethod
    async def create_post(self, post: Post) -> Post:
        """Create a new post"""
        pass
    
    @abstractmethod
    async def get_post_by_id(self, post_id: str) -> Optional[Post]:
        """Get post by ID"""
        pass
    
    @abstractmethod
    async def get_posts(
        self, 
        skip: int = 0, 
        limit: int = 10, 
        author_id: Optional[str] = None,
        tag_id: Optional[str] = None,
        post_type: Optional[PostType] = None,
        status: PostStatus = PostStatus.PUBLISHED
    ) -> List[Post]:
        """Get posts with filtering and pagination"""
        pass
    
    @abstractmethod
    async def update_post(self, post_id: str, updates: Dict[str, Any]) -> Optional[Post]:
        """Update a post"""
        pass
    
    @abstractmethod
    async def delete_post(self, post_id: str) -> bool:
        """Delete a post"""
        pass
    
    # ============================================
    # COMMENT OPERATIONS
    # ============================================
    
    @abstractmethod
    async def create_comment(self, comment: Comment) -> Comment:
        """Create a new comment"""
        pass
    
    @abstractmethod
    async def get_comment_by_id(self, comment_id: str) -> Optional[Comment]:
        """Get comment by ID"""
        pass
    
    @abstractmethod
    async def get_comments_by_post(self, post_id: str) -> List[Comment]:
        """Get comments for a post"""
        pass
    
    @abstractmethod
    async def delete_comment(self, comment_id: str) -> bool:
        """Delete a comment"""
        pass
    
    # ============================================
    # SEARCH OPERATIONS
    # ============================================
    
    @abstractmethod
    async def search_posts(self, query: str, limit: int = 10) -> List[Post]:
        """Search posts by content"""
        pass
    
    # ============================================
    # STATS OPERATIONS
    # ============================================
    
    @abstractmethod
    async def get_stats(self) -> Dict[str, int]:
        """Get application statistics"""
        pass
