"""
Mock Database Service Implementation
Provides in-memory storage for testing and development
"""

import logging
import aiosqlite
import json
import random
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import uuid4
from pathlib import Path

from .base import DatabaseService
from ...models.user import User
from ...models.post import Post, PostType, PostStatus
from ...models.tag import Tag
from ...models.comment import Comment
from ...config.settings import settings

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
        # Add reaction and event structures
        self.reactions: Dict[str, Dict[str, Any]] = {}
        self.user_events: Dict[str, Dict[str, Any]] = {}
        self.event_types: Dict[str, Dict[str, Any]] = {}
        self.post_tags: Dict[str, List[str]] = {}  # post_id -> list of tag_ids
        self.initialized = False
    
    async def initialize(self) -> None:
        """Initialize the mock database and load sample data from SQLite"""
        logger.info("Initializing Mock database with sample data from SQLite")
        
        # Load sample data from SQLite if available
        await self._load_sample_data_from_sqlite()
        
        logger.info("✅ Mock database initialized with sample data")
        self.initialized = True
    
    async def _load_sample_data_from_sqlite(self) -> None:
        """Load sample data from SQLite database into memory"""
        try:
            db_path = settings.sqlite_path
            if db_path.startswith("./"):
                db_path = Path(db_path).resolve()
            
            logger.debug(f"🔍 Mock service looking for SQLite database at: {db_path}")
            
            if not Path(db_path).exists():
                logger.warning(f"❌ SQLite database not found at {db_path}, using empty mock data")
                logger.debug("📝 Mock service will operate with empty data structures")
                return
            
            logger.debug(f"✅ Found SQLite database, starting data loading process...")
            
            async with aiosqlite.connect(db_path) as db:
                # Load users
                logger.debug("📊 Loading users from SQLite...")
                async with db.execute("SELECT id, username, display_name, email, bio, location, avatar_url, is_verified FROM users") as cursor:
                    rows = await cursor.fetchall()
                    logger.debug(f"📋 Found {len(rows)} users in SQLite database")
                    for i, row in enumerate(rows, 1):
                        user = User(
                            id=row[0],
                            username=row[1],
                            display_name=row[2],
                            email=row[3],
                            bio=row[4] or "",
                            location=row[5] or "",
                            avatar_url=row[6] or "",
                            is_verified=bool(row[7]),
                            created_at=datetime.now(timezone.utc),
                            updated_at=datetime.now(timezone.utc)
                        )
                        self.users[user.id] = user
                        self.users_by_username[user.username] = user.id
                        logger.debug(f"[{i}/{len(rows)}] Loaded user: {user.username}")
                
                # Load tags
                logger.debug("📊 Loading tags from SQLite...")
                async with db.execute("SELECT id, name, description, color, category FROM tag_types") as cursor:
                    rows = await cursor.fetchall()
                    logger.debug(f"📋 Found {len(rows)} tags in SQLite database")
                    for i, row in enumerate(rows, 1):
                        tag = Tag(
                            id=row[0],
                            name=row[1],
                            description=row[2] or "",
                            color=row[3] or "#666666",
                            posts_count=0,  # Will be calculated later
                            created_at=datetime.now(timezone.utc),
                            updated_at=datetime.now(timezone.utc)
                        )
                        self.tags[tag.id] = tag
                        self.tags_by_name[tag.name] = tag.id
                        logger.debug(f"[{i}/{len(rows)}] Loaded tag: {tag.name}")
                
                # Load posts with content
                logger.debug("📊 Loading posts from SQLite...")
                async with db.execute("""
                    SELECT p.id, p.post_type_id, p.title, p.feed_content, p.author_id, p.status,
                           p.created_ts, p.updated_ts, pc.content
                    FROM posts p
                    LEFT JOIN posts_content pc ON p.id = pc.post_id AND pc.is_current = 1
                    WHERE p.status = 'published'
                """) as cursor:
                    rows = await cursor.fetchall()
                    logger.debug(f"📋 Found {len(rows)} posts in SQLite database")
                    for i, row in enumerate(rows, 1):
                        # Map post_type_id to PostType enum
                        post_type_map = {
                            'posts': PostType.LONG_FORM,
                            'thoughts': PostType.THOUGHTS,
                            'llm-short': PostType.AI_SUMMARY,
                            'llm-long': PostType.DOCUMENTATION,
                            'block-diagram': PostType.DIAGRAM,
                            'code-snippet': PostType.CODE,
                            'discussion': PostType.DISCUSSION
                        }
                        
                        post_type = post_type_map.get(row[1], PostType.LONG_FORM)
                        
                        post = Post(
                            id=row[0],
                            type=post_type,
                            title=row[2],
                            content=row[8] or row[3],  # Use full content if available, otherwise feed_content
                            feed_content=row[3],
                            author_id=row[4],
                            status=PostStatus.PUBLISHED,
                            created_at=datetime.fromisoformat(row[6].replace('Z', '+00:00')) if row[6] else datetime.now(timezone.utc),
                            updated_at=datetime.fromisoformat(row[7].replace('Z', '+00:00')) if row[7] else datetime.now(timezone.utc),
                            tags=[],  # Will be loaded separately
                            reactions=[],
                            comments=[],
                            stats={'views': 0, 'likes': 0, 'comments': 0}
                        )
                        self.posts[post.id] = post
                        logger.debug(f"[{i}/{len(rows)}] Loaded post: {post.title[:50]}...")
                
                logger.info(f"🎉 Mock service successfully loaded: {len(self.users)} users, {len(self.tags)} tags, {len(self.posts)} posts from SQLite")
                
        except Exception as e:
            logger.error(f"❌ Failed to load sample data from SQLite into Mock service: {e}")
            import traceback
            logger.debug(f"🐛 Mock data loading error traceback: {traceback.format_exc()}")
            # Don't raise - Mock service should continue with empty data
            logger.warning("⚠️ Mock service continuing with empty data structures")
    
    async def close(self) -> None:
        """Close the mock database"""
        logger.info("Mock database closed")
        self.initialized = False
    
    async def ping(self) -> bool:
        """Check database connectivity (always True for mock)"""
        return True
    
    async def execute_bootstrap(self, sql_content: str) -> bool:
        """Execute bootstrap SQL script (no-op for mock)"""
        logger.debug(f"🔧 Mock bootstrap called with {len(sql_content)} characters of SQL content")
        logger.debug("📝 Mock service doesn't execute SQL - loads sample data from SQLite instead")
        logger.info("✅ Mock bootstrap executed (no-op - uses sample data loading)")
        return True
    
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
    
    # SQLite-compatible methods that return Dict format
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID (SQLite-compatible format)"""
        user = self.users.get(user_id)
        if user:
            return {
                'id': user.id,
                'username': user.username,
                'display_name': user.display_name,
                'email': user.email,
                'bio': user.bio,
                'location': user.location,
                'avatar_url': user.avatar_url,
                'is_verified': user.is_verified,
                'is_active': True
            }
        return None
    
    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username (SQLite-compatible format)"""
        user_id = self.users_by_username.get(username)
        if user_id:
            return await self.get_user_by_id(user_id)
        return None
    
    async def get_users(self, skip: int = 0, limit: int = 10) -> List[Dict[str, Any]]:
        """Get list of users with pagination (returns List of Dict for compatibility)"""
        users = list(self.users.values())[skip:skip + limit]
        result = []
        for user in users:
            result.append({
                'id': user.id,
                'username': user.username,
                'display_name': user.display_name,
                'email': user.email,
                'bio': user.bio,
                'location': user.location,
                'avatar_url': user.avatar_url,
                'is_verified': user.is_verified,
                'is_active': True
            })
        return result
    
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
    
    async def get_tag_by_id(self, tag_id: str) -> Optional[Dict[str, Any]]:
        """Get tag by ID (returns Dict for compatibility)"""
        tag = self.tags.get(tag_id)
        if tag:
            return {
                'id': tag.id,
                'name': tag.name,
                'description': tag.description,
                'color': tag.color,
                'posts_count': tag.posts_count,
                'is_active': True,
                'created_at': tag.created_at.isoformat() if tag.created_at else None,
                'updated_at': tag.updated_at.isoformat() if tag.updated_at else None
            }
        return None
    
    async def get_tag_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get tag by name (returns Dict for compatibility)"""
        tag_id = self.tags_by_name.get(name)
        if tag_id:
            return await self.get_tag_by_id(tag_id)
        return None
    
    async def get_tags(self) -> List[Dict[str, Any]]:
        """Get all tags (returns List of Dict for compatibility)"""
        tags = []
        for tag in self.tags.values():
            tags.append({
                'id': tag.id,
                'name': tag.name,
                'description': tag.description,
                'color': tag.color,
                'posts_count': tag.posts_count,
                'is_active': True,
                'created_at': tag.created_at.isoformat() if tag.created_at else None,
                'updated_at': tag.updated_at.isoformat() if tag.updated_at else None
            })
        return tags
    
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
    
    async def get_recent_comments(self, skip: int = 0, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent comments across all posts"""
        # Get all comments and convert to dict format
        all_comments = []
        for comment in self.comments.values():
            # Get user info
            user = self.users.get(comment.author_id)
            # Get post info
            post = self.posts.get(comment.post_id)
            
            if user and post:
                comment_dict = {
                    'id': comment.id,
                    'post_id': comment.post_id,
                    'author_id': comment.author_id,
                    'content': comment.content,
                    'parent_discussion_id': comment.parent_id,
                    'is_edited': False,  # Mock value
                    'created_ts': comment.created_at,
                    'updated_ts': comment.updated_at,
                    'display_name': user.display_name,
                    'username': user.username,
                    'post_title': post.title
                }
                all_comments.append(comment_dict)
        
        # Sort by created_ts descending (most recent first)
        all_comments.sort(key=lambda c: c['created_ts'], reverse=True)
        
        # Apply pagination
        return all_comments[skip:skip + limit]
    
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
    
    # ============================================
    # REACTION OPERATIONS
    # ============================================
    
    async def add_reaction(self, target_id: str, user_id: str, reaction_type: str, target_type: str = 'post') -> Dict[str, Any]:
        """Add a reaction to a post, discussion, or tag"""
        reaction_id = str(uuid.uuid4())
        
        # Create the reaction
        reaction = {
            'id': reaction_id,
            'target_id': target_id,
            'target_type': target_type,
            'user_id': user_id,
            'reaction_type': reaction_type,
            'event_type_id': reaction_type,
            'created_ts': datetime.now(timezone.utc).isoformat()
        }
        
        # Store the reaction (use composite key to ensure uniqueness per user/target/type)
        reaction_key = f"{target_id}:{user_id}:{reaction_type}:{target_type}"
        self.reactions[reaction_key] = reaction
        
        logger.info(f"Added reaction: {reaction_type} to {target_type} {target_id} by user {user_id}")
        return reaction
    
    async def remove_reaction(self, target_id: str, user_id: str, reaction_type: str, target_type: str = 'post') -> bool:
        """Remove a reaction from a post, discussion, or tag"""
        reaction_key = f"{target_id}:{user_id}:{reaction_type}:{target_type}"
        
        if reaction_key in self.reactions:
            del self.reactions[reaction_key]
            logger.info(f"Removed reaction: {reaction_type} from {target_type} {target_id} by user {user_id}")
            return True
        
        return False
    
    async def get_reactions(self, target_id: str, target_type: str = 'post') -> List[Dict[str, Any]]:
        """Get reactions for a target (post, discussion, tag)"""
        reactions = []
        
        for reaction in self.reactions.values():
            if reaction['target_id'] == target_id and reaction['target_type'] == target_type:
                # Add user info
                user = self.users.get(reaction['user_id'])
                if user:
                    reaction_with_user = reaction.copy()
                    reaction_with_user.update({
                        'username': user.username,
                        'display_name': user.display_name
                    })
                    reactions.append(reaction_with_user)
        
        return reactions
    
    async def get_post_reactions(self, post_id: str) -> List[Dict[str, Any]]:
        """Get reactions for a post"""
        return await self.get_reactions(post_id, 'post')
    
    async def get_discussion_reactions(self, discussion_id: str) -> List[Dict[str, Any]]:
        """Get reactions for a discussion/comment"""
        return await self.get_reactions(discussion_id, 'discussion')
    
    # ============================================
    # EVENT LOGGING OPERATIONS
    # ============================================
    
    async def log_user_event(self, event_data: Dict[str, Any]) -> str:
        """Log a user event"""
        event_id = event_data.get('id', str(uuid.uuid4()))
        
        event = {
            'id': event_id,
            'user_id': event_data['user_id'],
            'event_type_id': event_data['event_type_id'],
            'target_type': event_data.get('target_type'),
            'target_id': event_data.get('target_id'),
            'metadata': event_data.get('metadata', {}),
            'created_ts': datetime.now(timezone.utc).isoformat()
        }
        
        self.user_events[event_id] = event
        logger.info(f"Logged user event: {event_data['event_type_id']} for user {event_data['user_id']}")
        return event_id
    
    # ============================================
    # DATABASE QUERY OPERATIONS
    # ============================================
    
    async def execute_query(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """Execute a query and return results (mock implementation)"""
        # This is a simplified mock - in a real implementation you'd parse SQL
        # For now, we'll handle specific queries that are commonly used
        
        if "SELECT DISTINCT r.target_id FROM reactions r" in query and "event-favorite" in query:
            # This is the favorite tags query
            user_id = params[0] if params else None
            if user_id:
                favorite_tags = []
                for reaction in self.reactions.values():
                    if (reaction['user_id'] == user_id and 
                        reaction['reaction_type'] == 'event-favorite' and 
                        reaction['target_type'] == 'tag'):
                        favorite_tags.append({'target_id': reaction['target_id']})
                return favorite_tags
        
        # For other queries, return empty result
        logger.warning(f"Mock execute_query not implemented for: {query[:100]}...")
        return []
    
    async def execute_command(self, command: str, params: tuple = ()) -> bool:
        """Execute a command (INSERT, UPDATE, DELETE) (mock implementation)"""
        logger.warning(f"Mock execute_command not implemented for: {command[:100]}...")
        return True
    
    # ============================================
    # TAG ASSOCIATION OPERATIONS
    # ============================================

    async def associate_tags_with_post(self, author_id: str, post_id: str, tag_names: List[str]) -> bool:
        """Associate tags with a post"""
        try:
            if post_id not in self.post_tags:
                self.post_tags[post_id] = []
            
            for tag_name in tag_names:
                # Find or create tag
                tag = await self.get_tag_by_name(tag_name)
                if not tag:
                    # Create new tag
                    tag = Tag(
                        id=f"tag-{uuid4()}",
                        name=tag_name,
                        description="",
                        color="#666666",
                        posts_count=0,
                        created_by=author_id
                    )
                    await self.create_tag(tag)
                
                # Associate with post
                if tag.id not in self.post_tags[post_id]:
                    self.post_tags[post_id].append(tag.id)
            
            logger.info(f"Associated {len(tag_names)} tags with post {post_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to associate tags with post: {e}")
            return False
    
    async def get_post_tags(self, post_id: str) -> List[Dict[str, Any]]:
        """Get tags for a specific post"""
        tag_ids = self.post_tags.get(post_id, [])
        tags = []
        
        for tag_id in tag_ids:
            tag = self.tags.get(tag_id)
            if tag:
                tags.append({
                    'id': tag.id,
                    'name': tag.name,
                    'description': tag.description,
                    'color': tag.color,
                    'is_active': True
                })
        
        return tags

    async def update_post_tags(self, author_id: str, post_id: str, tag_names: List[str]) -> bool:
        """Update tags for a post by removing existing associations and creating new ones"""
        try:
            # Remove existing tag associations for this post
            if post_id in self.post_tags:
                del self.post_tags[post_id]
            
            # Add new tag associations
            self.post_tags[post_id] = []
            for tag_name in tag_names:
                # Find existing tag by name
                tag_id = None
                for tid, tag in self.tags.items():
                    if tag.name == tag_name:
                        tag_id = tid
                        break
                
                # Create tag if doesn't exist
                if not tag_id:
                    import uuid
                    from src.models.tag import Tag
                    tag_id = str(uuid.uuid4())
                    self.tags[tag_id] = Tag(
                        id=tag_id,
                        name=tag_name,
                        description=f"Auto-created tag: {tag_name}",
                        color="#24A890"
                    )
                
                # Associate tag with post
                self.post_tags[post_id].append(tag_id)
            
            logger.info(f"Updated tags for post {post_id}: {tag_names}")
            return True
        except Exception as e:
            logger.error(f"Failed to update tags for post {post_id}: {e}")
            return False
    
    # ============================================
    # DISCUSSION/COMMENT OPERATIONS
    # ============================================
    
    async def get_post_discussions(self, post_id: str) -> List[Dict[str, Any]]:
        """Get discussions for a post"""
        # Convert comments to discussion format
        comments = await self.get_comments_by_post(post_id)
        discussions = []
        
        for comment in comments:
            discussion = {
                'id': comment.id,
                'post_id': comment.post_id,
                'author_id': comment.author_id,
                'content': comment.content,
                'username': 'mock_user',
                'display_name': 'Mock User',
                'avatar_url': '',
                'created_ts': comment.created_at.isoformat(),
                'is_deleted': False,
                'thread_path': '',
                'thread_level': 0
            }
            discussions.append(discussion)
        
        return discussions
    
    async def create_discussion(self, discussion_data: Dict[str, Any]) -> str:
        """Create a new discussion/comment"""
        # Convert discussion to comment format
        comment = Comment(
            id=discussion_data.get('id', f"comment-{uuid4()}"),
            post_id=discussion_data['post_id'],
            author_id=discussion_data['author_id'],
            content=discussion_data['content'],
            parent_id=discussion_data.get('parent_discussion_id')
        )
        
        created_comment = await self.create_comment(comment)
        return created_comment.id
