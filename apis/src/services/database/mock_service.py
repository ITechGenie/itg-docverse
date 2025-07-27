"""
Mock Database Service Implementation
Provides in-memory storage for testing and development
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import uuid4

from .base import DatabaseService
from ...models.user import User
from ...models.post import Post, PostType, PostStatus
from ...models.tag import Tag
from ...models.comment import Comment

logger = logging.getLogger(__name__)

class MockDatabaseService(DatabaseService):
    """In-memory mock implementation of DatabaseService"""
    
    def __init__(self):
        self.users: Dict[str, User] = {}
        self.users_by_username: Dict[str, str] = {}
        self.tags: Dict[str, Tag] = {}
        self.tags_by_name: Dict[str, str] = {}
        self.posts: Dict[str, Post] = {}
        self.comments: Dict[str, Comment] = {}
        self.comments_by_post: Dict[str, List[str]] = {}
        self.initialized = False
    
    async def initialize(self) -> None:
        """Initialize the mock database"""
        logger.info("✅ Mock database initialized")
        self.initialized = True
    
    async def close(self) -> None:
        """Close the mock database"""
        logger.info("Mock database closed")
        self.initialized = False
    
    # ============================================
    # USER OPERATIONS
    # ============================================
    
    async def create_user(self, user: User) -> User:
        """Create a new user"""
        if not user.id:
            user.id = f"user-{uuid4()}"
        
        now = datetime.now(timezone.utc)
        user.created_at = user.created_at or now
        user.updated_at = now
        
        self.users[user.id] = user
        self.users_by_username[user.username] = user.id
        
        logger.info(f"Created user: {user.username}")
        return user
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return self.users.get(user_id)
    
    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        user_id = self.users_by_username.get(username)
        if user_id:
            return self.users.get(user_id)
        return None
    
    async def get_users(self, skip: int = 0, limit: int = 10) -> List[User]:
        """Get list of users with pagination"""
        users = list(self.users.values())
        return users[skip:skip + limit]
    
    # ============================================
    # TAG OPERATIONS
    # ============================================
    
    async def create_tag(self, tag: Tag) -> Tag:
        """Create a new tag"""
        if not tag.id:
            tag.id = f"tag-{uuid4()}"
        
        now = datetime.now(timezone.utc)
        tag.created_at = tag.created_at or now
        tag.updated_at = now
        
        self.tags[tag.id] = tag
        self.tags_by_name[tag.name] = tag.id
        
        logger.info(f"Created tag: {tag.name}")
        return tag
    
    async def get_tag_by_id(self, tag_id: str) -> Optional[Tag]:
        """Get tag by ID"""
        return self.tags.get(tag_id)
    
    async def get_tag_by_name(self, name: str) -> Optional[Tag]:
        """Get tag by name"""
        tag_id = self.tags_by_name.get(name)
        if tag_id:
            return self.tags.get(tag_id)
        return None
    
    async def get_tags(self) -> List[Tag]:
        """Get all tags"""
        return list(self.tags.values())
    
    # ============================================
    # POST OPERATIONS
    # ============================================
    
    async def create_post(self, post: Post) -> Post:
        """Create a new post"""
        if not post.id:
            if post.post_type == PostType.THOUGHTS:
                import random
                post.id = f"thoughts-{random.randint(1000000, 9999999)}"
            else:
                post.id = f"post-{uuid4()}"
        
        now = datetime.now(timezone.utc)
        post.created_at = post.created_at or now
        post.updated_at = now
        
        self.posts[post.id] = post
        
        logger.info(f"Created post: {post.id}")
        return post
    
    async def get_post_by_id(self, post_id: str) -> Optional[Post]:
        """Get post by ID"""
        return self.posts.get(post_id)
    
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
        posts = []
        
        for post in self.posts.values():
            # Filter by status
            if post.status != status:
                continue
            
            # Filter by author
            if author_id and post.author_id != author_id:
                continue
            
            # Filter by tag
            if tag_id and (not post.tags or tag_id not in post.tags):
                continue
            
            # Filter by type
            if post_type and post.post_type != post_type:
                continue
            
            posts.append(post)
        
        # Sort by created_at descending
        posts.sort(key=lambda p: p.created_at, reverse=True)
        
        return posts[skip:skip + limit]
    
    async def update_post(self, post_id: str, updates: Dict[str, Any]) -> Optional[Post]:
        """Update a post"""
        post = self.posts.get(post_id)
        if not post:
            return None
        
        for key, value in updates.items():
            if hasattr(post, key):
                setattr(post, key, value)
        
        post.updated_at = datetime.now(timezone.utc)
        
        logger.info(f"Updated post: {post_id}")
        return post
    
    async def delete_post(self, post_id: str) -> bool:
        """Delete a post"""
        if post_id in self.posts:
            del self.posts[post_id]
            
            # Delete associated comments
            if post_id in self.comments_by_post:
                comment_ids = self.comments_by_post[post_id].copy()
                for comment_id in comment_ids:
                    await self.delete_comment(comment_id)
            
            logger.info(f"Deleted post: {post_id}")
            return True
        return False
    
    # ============================================
    # COMMENT OPERATIONS
    # ============================================
    
    async def create_comment(self, comment: Comment) -> Comment:
        """Create a new comment"""
        if not comment.id:
            comment.id = f"comment-{uuid4()}"
        
        now = datetime.now(timezone.utc)
        comment.created_at = comment.created_at or now
        comment.updated_at = now
        
        self.comments[comment.id] = comment
        
        # Add to post's comment list
        if comment.post_id not in self.comments_by_post:
            self.comments_by_post[comment.post_id] = []
        self.comments_by_post[comment.post_id].append(comment.id)
        
        logger.info(f"Created comment: {comment.id}")
        return comment
    
    async def get_comment_by_id(self, comment_id: str) -> Optional[Comment]:
        """Get comment by ID"""
        return self.comments.get(comment_id)
    
    async def get_comments_by_post(self, post_id: str) -> List[Comment]:
        """Get comments for a post"""
        comment_ids = self.comments_by_post.get(post_id, [])
        comments = []
        
        for comment_id in comment_ids:
            comment = self.comments.get(comment_id)
            if comment:
                comments.append(comment)
        
        # Sort by created_at ascending
        comments.sort(key=lambda c: c.created_at)
        return comments
    
    async def delete_comment(self, comment_id: str) -> bool:
        """Delete a comment"""
        comment = self.comments.get(comment_id)
        if not comment:
            return False
        
        # Remove from comments dict
        del self.comments[comment_id]
        
        # Remove from post's comment list
        if comment.post_id in self.comments_by_post:
            try:
                self.comments_by_post[comment.post_id].remove(comment_id)
                if not self.comments_by_post[comment.post_id]:
                    del self.comments_by_post[comment.post_id]
            except ValueError:
                pass
        
        logger.info(f"Deleted comment: {comment_id}")
        return True
    
    # ============================================
    # SEARCH OPERATIONS
    # ============================================
    
    async def search_posts(self, query: str, limit: int = 10) -> List[Post]:
        """Search posts by content"""
        query_lower = query.lower()
        matching_posts = []
        
        for post in self.posts.values():
            if post.status != PostStatus.PUBLISHED:
                continue
            
            if (query_lower in post.title.lower() or 
                query_lower in post.content.lower()):
                matching_posts.append(post)
        
        # Sort by relevance (simple: count of query occurrences)
        def relevance_score(post):
            title_matches = post.title.lower().count(query_lower)
            content_matches = post.content.lower().count(query_lower)
            return title_matches * 2 + content_matches
        
        matching_posts.sort(key=relevance_score, reverse=True)
        return matching_posts[:limit]
    
    # ============================================
    # STATS OPERATIONS
    # ============================================
    
    async def get_stats(self) -> Dict[str, int]:
        """Get application statistics"""
        return {
            'users': len(self.users),
            'posts': len(self.posts),
            'tags': len(self.tags),
            'comments': len(self.comments)
        }
