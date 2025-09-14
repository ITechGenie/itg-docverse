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
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID (returns Dict for compatibility)"""
        pass
    
    @abstractmethod
    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username (returns Dict for compatibility)"""
        pass
    
    @abstractmethod
    async def get_users(self, skip: int = 0, limit: int = 10) -> List[Dict[str, Any]]:
        """Get list of users with pagination (returns List of Dict for compatibility)"""
        pass
    
    @abstractmethod
    async def get_user_roles(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user roles and permissions"""
        pass

    # Role type operations
    @abstractmethod
    async def get_role_types(self) -> List[Dict[str, Any]]:
        """Get available role types"""
        pass

    @abstractmethod
    async def assign_role_to_user(self, user_id: str, role_id: str, assigned_by: str = None) -> bool:
        """Assign a role to a user"""
        pass

    @abstractmethod
    async def remove_role_from_user(self, user_id: str, role_id: str) -> bool:
        """Remove a role assignment from a user"""
        pass
    
    # ============================================
    # TAG OPERATIONS
    # ============================================
    
    @abstractmethod
    async def create_tag(self, tag: Tag) -> Tag:
        """Create a new tag"""
        pass
    
    @abstractmethod
    async def get_tag_by_id(self, tag_id: str) -> Optional[Dict[str, Any]]:
        """Get tag by ID (returns Dict for compatibility)"""
        pass
    
    @abstractmethod
    async def get_tag_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get tag by name (returns Dict for compatibility)"""
        pass
    
    @abstractmethod
    async def get_tags(self) -> List[Dict[str, Any]]:
        """Get all tags (returns List of Dict for compatibility)"""
        pass
    
    # ============================================
    # POST OPERATIONS
    # ============================================
    
    @abstractmethod
    async def create_post(self, post: Post) -> Post:
        """Create a new post"""
        pass
    
    @abstractmethod
    async def get_post_by_id(self, post_id: str) -> Optional[Dict[str, Any]]:
        """Get post by ID (returns Dict for compatibility)"""
        pass
    
    @abstractmethod
    async def get_posts(
        self, 
        skip: int = 0, 
        limit: int = 10, 
        author_id: Optional[str] = None,
        tag_id: Optional[str] = None,
        trending: Optional[bool] = None,
        post_type: Optional[str] = None,
        status: str = "published"
    ) -> List[Dict[str, Any]]:
        """Get posts with filtering and pagination (returns List of Dict for compatibility)"""
        pass
    
    @abstractmethod
    async def update_post(self, post_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
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
    async def get_recent_comments(self, skip: int = 0, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent comments across all posts"""
        pass
    
    @abstractmethod
    async def delete_comment(self, comment_id: str) -> bool:
        """Delete a comment"""
        pass
    
    # ============================================
    # SEARCH OPERATIONS
    # ============================================
    
    @abstractmethod
    async def search_posts(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search posts by content (returns List of Dict for compatibility)"""
        pass
    
    # ============================================
    # STATS OPERATIONS
    # ============================================
    
    @abstractmethod
    async def get_stats(self) -> Dict[str, int]:
        """Get application statistics"""
        pass
    
    # ============================================
    # REACTION OPERATIONS  
    # ============================================
    
    @abstractmethod
    async def add_reaction(self, target_id: str, user_id: str, reaction_type: str, target_type: str = 'post') -> Dict[str, Any]:
        """Add a reaction to a post, discussion, or tag"""
        pass
    
    @abstractmethod
    async def remove_reaction(self, target_id: str, user_id: str, reaction_type: str, target_type: str = 'post') -> bool:
        """Remove a reaction from a post, discussion, or tag"""
        pass
    
    @abstractmethod
    async def get_reactions(self, target_id: str, target_type: str = 'post') -> List[Dict[str, Any]]:
        """Get reactions for a target (post, discussion, tag)"""
        pass
    
    @abstractmethod
    async def get_post_reactions(self, post_id: str) -> List[Dict[str, Any]]:
        """Get reactions for a post"""
        pass
    
    @abstractmethod
    async def get_discussion_reactions(self, discussion_id: str) -> List[Dict[str, Any]]:
        """Get reactions for a discussion/comment"""
        pass
    
    # ============================================
    # EVENT LOGGING OPERATIONS
    # ============================================
    
    @abstractmethod
    async def log_user_event(self, event_data: Dict[str, Any]) -> str:
        """Log a user event"""
        pass
    
    # ============================================
    # DATABASE OPERATIONS
    # ============================================
    
    @abstractmethod
    async def ping(self) -> bool:
        """Check database connectivity"""
        pass
    
    @abstractmethod
    async def execute_bootstrap(self, sql_content: str) -> bool:
        """Execute bootstrap SQL script"""
        pass
    
    @abstractmethod
    async def execute_query(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """Execute a query and return results"""
        pass
    
    @abstractmethod
    async def execute_command(self, command: str, params: tuple = ()) -> bool:
        """Execute a command (INSERT, UPDATE, DELETE)"""
        pass
    
    # ============================================
    # TAG ASSOCIATION OPERATIONS
    # ============================================
    
    @abstractmethod
    async def associate_tags_with_post(self, author_id: str, post_id: str, tag_names: List[str]) -> bool:
        """Associate tags with a post"""
        pass
    
    @abstractmethod
    async def get_post_tags(self, post_id: str) -> List[Dict[str, Any]]:
        """Get tags for a specific post"""
        pass
    
    @abstractmethod
    async def update_post_tags(self, author_id: str, post_id: str, tag_names: List[str]) -> bool:
        """Update tags for a post by removing existing associations and creating new ones"""
        pass
    
    # ============================================
    # DISCUSSION/COMMENT OPERATIONS
    # ============================================
    
    @abstractmethod
    async def get_post_discussions(self, post_id: str) -> List[Dict[str, Any]]:
        """Get discussions for a post"""
        pass
    
    @abstractmethod
    async def create_discussion(self, discussion_data: Dict[str, Any]) -> str:
        """Create a new discussion/comment"""
        pass

    # ============================================
    # FILE UPLOAD OPERATIONS
    # ============================================
    
    @abstractmethod
    async def create_content_upload(self, upload_data: Dict[str, Any]) -> bool:
        """Create a new file upload record"""
        pass
    
    @abstractmethod
    async def get_content_upload(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Get file upload data by ID"""
        pass
    
    @abstractmethod
    async def get_user_uploads(self, user_id: str, visibility: Optional[str] = None, 
                              tags: Optional[List[str]] = None, search: Optional[str] = None,
                              sort_by: str = "recent", limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Get user's uploaded files with filtering"""
        pass
    
    @abstractmethod
    async def count_user_uploads(self, user_id: str, visibility: Optional[str] = None, 
                                tags: Optional[List[str]] = None, search: Optional[str] = None) -> int:
        """Count user's uploaded files with filtering"""
        pass
    
    @abstractmethod
    async def update_content_upload(self, file_id: str, update_data: Dict[str, Any]) -> bool:
        """Update file upload metadata"""
        pass
    
    @abstractmethod
    async def get_upload_tags(self, file_id: str) -> List[Dict[str, Any]]:
        """Get tags associated with a file upload"""
        pass
    
    @abstractmethod
    async def associate_tags_with_upload(self, user_id: str, file_id: str, tag_names: List[str]) -> bool:
        """Associate tags with a file upload"""
        pass
    
    @abstractmethod
    async def update_upload_tags(self, user_id: str, file_id: str, tag_names: List[str]) -> bool:
        """Update tags for a file upload"""
        pass
