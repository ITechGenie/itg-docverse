"""
Redis Database Service Implementation
Provides Redis-based storage for ITG DocVerse
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import uuid4

import redis.asyncio as redis
from redis.asyncio import Redis

from .base import DatabaseService
from ...models.user import User
from ...models.post import Post, PostType, PostStatus
from ...models.tag import Tag
from ...models.comment import Comment
from ...config.settings import settings

logger = logging.getLogger(__name__)

class RedisService(DatabaseService):
    """Redis implementation of DatabaseService"""
    
    def __init__(self):
        self.redis_client: Optional[Redis] = None
        self._connection_params = {
            'host': settings.redis_host,
            'port': settings.redis_port,
            'password': settings.redis_password,
            'db': settings.redis_db,
            'decode_responses': True,
            'socket_keepalive': True,
            'socket_keepalive_options': {},
            'health_check_interval': 30
        }
    
    async def initialize(self) -> None:
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.Redis(**self._connection_params)
            
            # Test connection
            await self.redis_client.ping()
            logger.info("✅ Redis connection established successfully")
            
            # Initialize indexes and data structures
            await self._initialize_indexes()
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to Redis: {e}")
            raise
    
    async def close(self) -> None:
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Redis connection closed")
    
    async def ping(self) -> bool:
        """Check database connectivity"""
        try:
            if self.redis_client:
                await self.redis_client.ping()
                return True
            return False
        except Exception as e:
            logger.error(f"Redis ping failed: {e}")
            return False
    
    async def execute_bootstrap(self, sql_content: str) -> bool:
        """Execute bootstrap SQL script (no-op for Redis)"""
        logger.info("Redis bootstrap executed (no-op)")
        return True
    
    async def _initialize_indexes(self) -> None:
        """Initialize Redis indexes and data structures"""
        try:
            # Create index sets if they don't exist
            await self.redis_client.sadd("indexes:users", "initialized")
            await self.redis_client.sadd("indexes:posts", "initialized")
            await self.redis_client.sadd("indexes:tags", "initialized")
            await self.redis_client.sadd("indexes:comments", "initialized")
            
            # Initialize counters if they don't exist
            if not await self.redis_client.exists("counters:users"):
                await self.redis_client.set("counters:users", 0)
            if not await self.redis_client.exists("counters:posts"):
                await self.redis_client.set("counters:posts", 0)
            if not await self.redis_client.exists("counters:tags"):
                await self.redis_client.set("counters:tags", 0)
            if not await self.redis_client.exists("counters:comments"):
                await self.redis_client.set("counters:comments", 0)
                
            logger.info("Redis indexes initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis indexes: {e}")
            raise
    
    def _serialize_model(self, obj: Any) -> str:
        """Serialize model object to JSON string"""
        if hasattr(obj, 'model_dump'):
            # Pydantic model
            data = obj.model_dump()
        else:
            # Regular object
            data = obj.__dict__.copy()
        
        # Convert datetime objects to ISO strings
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
        
        return json.dumps(data, default=str)
    
    def _deserialize_model(self, data: str, model_class) -> Any:
        """Deserialize JSON string to model object"""
        if not data:
            return None
        
        try:
            obj_data = json.loads(data)
            
            # Convert ISO strings back to datetime objects
            for key, value in obj_data.items():
                if isinstance(value, str) and key.endswith('_at'):
                    try:
                        obj_data[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                    except (ValueError, AttributeError):
                        pass
            
            return model_class(**obj_data)
        except Exception as e:
            logger.error(f"Failed to deserialize {model_class.__name__}: {e}")
            return None
    
    # ============================================
    # USER OPERATIONS
    # ============================================
    
    async def create_user(self, user: User) -> User:
        """Create a new user"""
        try:
            # Generate ID if not provided
            if not user.id:
                user.id = f"user-{uuid4()}"
            
            # Set timestamps
            now = datetime.now(timezone.utc)
            user.created_at = user.created_at or now
            user.updated_at = now
            
            # Store user data
            user_key = f"user:{user.id}"
            await self.redis_client.set(user_key, self._serialize_model(user))
            
            # Add to indexes
            await self.redis_client.sadd("indexes:users", user.id)
            await self.redis_client.set(f"user:username:{user.username}", user.id)
            await self.redis_client.set(f"user:email:{user.email}", user.id)
            
            # Update counter
            await self.redis_client.incr("counters:users")
            
            logger.info(f"Created user: {user.username}")
            return user
            
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            raise
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID (returns Dict for compatibility)"""
        try:
            user_key = f"user:{user_id}"
            user_data = await self.redis_client.get(user_key)
            if user_data:
                user_dict = json.loads(user_data)
                return {
                    'id': user_dict.get('id'),
                    'username': user_dict.get('username'),
                    'display_name': user_dict.get('display_name'),
                    'email': user_dict.get('email'),
                    'bio': user_dict.get('bio', ''),
                    'location': user_dict.get('location', ''),
                    'avatar_url': user_dict.get('avatar_url', ''),
                    'is_verified': user_dict.get('is_verified', False),
                    'is_active': True
                }
            return None
        except Exception as e:
            logger.error(f"Failed to get user {user_id}: {e}")
            return None
    
    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username (returns Dict for compatibility)"""
        try:
            user_id = await self.redis_client.get(f"user:username:{username}")
            if user_id:
                return await self.get_user_by_id(user_id.decode() if isinstance(user_id, bytes) else user_id)
            return None
        except Exception as e:
            logger.error(f"Failed to get user by username {username}: {e}")
            return None
    
    async def get_users(self, skip: int = 0, limit: int = 10) -> List[Dict[str, Any]]:
        """Get list of users with pagination (returns List of Dict for compatibility)"""
        try:
            user_ids = await self.redis_client.smembers("indexes:users")
            user_ids = list(user_ids)[skip:skip + limit]
            
            users = []
            for user_id in user_ids:
                if user_id != "initialized":  # Skip the initialization marker
                    decoded_id = user_id.decode() if isinstance(user_id, bytes) else user_id
                    user = await self.get_user_by_id(decoded_id)
                    if user:
                        users.append(user)
            
            return users
        except Exception as e:
            logger.error(f"Failed to get users: {e}")
            return []
    
    # ============================================
    # TAG OPERATIONS  
    # ============================================
    
    async def create_tag(self, tag: Tag) -> Tag:
        """Create a new tag"""
        try:
            # Generate ID if not provided
            if not tag.id:
                tag.id = f"tag-{uuid4()}"
            
            # Set timestamps
            now = datetime.now(timezone.utc)
            tag.created_at = tag.created_at or now
            tag.updated_at = now
            
            # Store tag data
            tag_key = f"tag:{tag.id}"
            await self.redis_client.set(tag_key, self._serialize_model(tag))
            
            # Add to indexes
            await self.redis_client.sadd("indexes:tags", tag.id)
            await self.redis_client.set(f"tag:name:{tag.name}", tag.id)
            
            # Update counter
            await self.redis_client.incr("counters:tags")
            
            logger.info(f"Created tag: {tag.name}")
            return tag
            
        except Exception as e:
            logger.error(f"Failed to create tag: {e}")
            raise
    
    async def get_tag_by_id(self, tag_id: str) -> Optional[Dict[str, Any]]:
        """Get tag by ID (returns Dict for compatibility)"""
        try:
            tag_key = f"tag:{tag_id}"
            tag_data = await self.redis_client.get(tag_key)
            if tag_data:
                tag_dict = json.loads(tag_data)
                return {
                    'id': tag_dict.get('id'),
                    'name': tag_dict.get('name'),
                    'description': tag_dict.get('description', ''),
                    'color': tag_dict.get('color', '#666666'),
                    'posts_count': tag_dict.get('posts_count', 0),
                    'is_active': True,
                    'created_at': tag_dict.get('created_at'),
                    'updated_at': tag_dict.get('updated_at')
                }
            return None
        except Exception as e:
            logger.error(f"Failed to get tag {tag_id}: {e}")
            return None
    
    async def get_tag_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get tag by name (returns Dict for compatibility)"""
        try:
            tag_id = await self.redis_client.get(f"tag:name:{name}")
            if tag_id:
                decoded_id = tag_id.decode() if isinstance(tag_id, bytes) else tag_id
                return await self.get_tag_by_id(decoded_id)
            return None
        except Exception as e:
            logger.error(f"Failed to get tag by name {name}: {e}")
            return None
    
    async def get_tags(self) -> List[Dict[str, Any]]:
        """Get all tags (returns List of Dict for compatibility)"""
        try:
            tag_ids = await self.redis_client.smembers("indexes:tags")
            
            tags = []
            for tag_id in tag_ids:
                if tag_id != "initialized":  # Skip the initialization marker
                    decoded_id = tag_id.decode() if isinstance(tag_id, bytes) else tag_id
                    tag = await self.get_tag_by_id(decoded_id)
                    if tag:
                        tags.append(tag)
            
            return tags
        except Exception as e:
            logger.error(f"Failed to get tags: {e}")
            return []
    
    # ============================================
    # POST OPERATIONS
    # ============================================
    
    async def create_post(self, post: Post) -> Post:
        """Create a new post"""
        try:
            # Generate ID if not provided
            if not post.id:
                if post.post_type == PostType.THOUGHTS:
                    # Generate random 7-digit number for thoughts
                    import random
                    post.id = f"thoughts-{random.randint(1000000, 9999999)}"
                else:
                    post.id = f"post-{uuid4()}"
            
            # Set timestamps
            now = datetime.now(timezone.utc)
            post.created_at = post.created_at or now
            post.updated_at = now
            
            # Store post data
            post_key = f"post:{post.id}"
            await self.redis_client.set(post_key, self._serialize_model(post))
            
            # Add to indexes
            await self.redis_client.sadd("indexes:posts", post.id)
            await self.redis_client.zadd(f"posts:by_date", {post.id: post.created_at.timestamp()})
            await self.redis_client.sadd(f"posts:by_author:{post.author_id}", post.id)
            await self.redis_client.sadd(f"posts:by_status:{post.status.value}", post.id)
            await self.redis_client.sadd(f"posts:by_type:{post.post_type.value}", post.id)
            
            # Add tag associations
            if post.tags:
                for tag_id in post.tags:
                    await self.redis_client.sadd(f"posts:by_tag:{tag_id}", post.id)
            
            # Update counter
            await self.redis_client.incr("counters:posts")
            
            logger.info(f"Created post: {post.id}")
            return post
            
        except Exception as e:
            logger.error(f"Failed to create post: {e}")
            raise
    
    async def get_post_by_id(self, post_id: str) -> Optional[Post]:
        """Get post by ID"""
        try:
            post_key = f"post:{post_id}"
            post_data = await self.redis_client.get(post_key)
            return self._deserialize_model(post_data, Post)
        except Exception as e:
            logger.error(f"Failed to get post {post_id}: {e}")
            return None
    
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
        try:
            # Start with all posts of the requested status
            post_ids = await self.redis_client.smembers(f"posts:by_status:{status.value}")
            
            # Apply filters
            if author_id:
                author_posts = await self.redis_client.smembers(f"posts:by_author:{author_id}")
                post_ids = post_ids.intersection(author_posts)
            
            if tag_id:
                tag_posts = await self.redis_client.smembers(f"posts:by_tag:{tag_id}")
                post_ids = post_ids.intersection(tag_posts)
            
            if post_type:
                type_posts = await self.redis_client.smembers(f"posts:by_type:{post_type.value}")
                post_ids = post_ids.intersection(type_posts)
            
            # Convert to list and sort by date (newest first)
            post_list = []
            for post_id in post_ids:
                if post_id != "initialized":
                    post = await self.get_post_by_id(post_id)
                    if post:
                        post_list.append(post)
            
            # Sort by created_at descending
            post_list.sort(key=lambda p: p.created_at, reverse=True)
            
            # Apply pagination
            return post_list[skip:skip + limit]
            
        except Exception as e:
            logger.error(f"Failed to get posts: {e}")
            return []
    
    async def update_post(self, post_id: str, updates: Dict[str, Any]) -> Optional[Post]:
        """Update a post"""
        try:
            post = await self.get_post_by_id(post_id)
            if not post:
                return None
            
            # Apply updates
            for key, value in updates.items():
                if hasattr(post, key):
                    setattr(post, key, value)
            
            # Update timestamp
            post.updated_at = datetime.now(timezone.utc)
            
            # Save updated post
            post_key = f"post:{post_id}"
            await self.redis_client.set(post_key, self._serialize_model(post))
            
            logger.info(f"Updated post: {post_id}")
            return post
            
        except Exception as e:
            logger.error(f"Failed to update post {post_id}: {e}")
            raise
    
    async def delete_post(self, post_id: str) -> bool:
        """Delete a post"""
        try:
            post = await self.get_post_by_id(post_id)
            if not post:
                return False
            
            # Remove from all indexes
            await self.redis_client.srem("indexes:posts", post_id)
            await self.redis_client.zrem("posts:by_date", post_id)
            await self.redis_client.srem(f"posts:by_author:{post.author_id}", post_id)
            await self.redis_client.srem(f"posts:by_status:{post.status.value}", post_id)
            await self.redis_client.srem(f"posts:by_type:{post.post_type.value}", post_id)
            
            # Remove tag associations
            if post.tags:
                for tag_id in post.tags:
                    await self.redis_client.srem(f"posts:by_tag:{tag_id}", post_id)
            
            # Delete the post data
            await self.redis_client.delete(f"post:{post_id}")
            
            # Delete associated comments
            comment_ids = await self.redis_client.smembers(f"comments:by_post:{post_id}")
            for comment_id in comment_ids:
                await self.delete_comment(comment_id)
            
            # Update counter
            await self.redis_client.decr("counters:posts")
            
            logger.info(f"Deleted post: {post_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete post {post_id}: {e}")
            return False
    
    # ============================================
    # COMMENT OPERATIONS
    # ============================================
    
    async def create_comment(self, comment: Comment) -> Comment:
        """Create a new comment"""
        try:
            # Generate ID if not provided
            if not comment.id:
                comment.id = f"comment-{uuid4()}"
            
            # Set timestamps
            now = datetime.now(timezone.utc)
            comment.created_at = comment.created_at or now
            comment.updated_at = now
            
            # Store comment data
            comment_key = f"comment:{comment.id}"
            await self.redis_client.set(comment_key, self._serialize_model(comment))
            
            # Add to indexes
            await self.redis_client.sadd("indexes:comments", comment.id)
            await self.redis_client.sadd(f"comments:by_post:{comment.post_id}", comment.id)
            await self.redis_client.sadd(f"comments:by_author:{comment.author_id}", comment.id)
            
            # Update counter
            await self.redis_client.incr("counters:comments")
            
            logger.info(f"Created comment: {comment.id}")
            return comment
            
        except Exception as e:
            logger.error(f"Failed to create comment: {e}")
            raise
    
    async def get_comment_by_id(self, comment_id: str) -> Optional[Comment]:
        """Get comment by ID"""
        try:
            comment_key = f"comment:{comment_id}"
            comment_data = await self.redis_client.get(comment_key)
            return self._deserialize_model(comment_data, Comment)
        except Exception as e:
            logger.error(f"Failed to get comment {comment_id}: {e}")
            return None
    
    async def get_comments_by_post(self, post_id: str) -> List[Comment]:
        """Get comments for a post"""
        try:
            comment_ids = await self.redis_client.smembers(f"comments:by_post:{post_id}")
            
            comments = []
            for comment_id in comment_ids:
                comment = await self.get_comment_by_id(comment_id)
                if comment:
                    comments.append(comment)
            
            # Sort by created_at ascending (oldest first)
            comments.sort(key=lambda c: c.created_at)
            return comments
            
        except Exception as e:
            logger.error(f"Failed to get comments for post {post_id}: {e}")
            return []
    
    async def delete_comment(self, comment_id: str) -> bool:
        """Delete a comment"""
        try:
            comment = await self.get_comment_by_id(comment_id)
            if not comment:
                return False
            
            # Remove from indexes
            await self.redis_client.srem("indexes:comments", comment_id)
            await self.redis_client.srem(f"comments:by_post:{comment.post_id}", comment_id)
            await self.redis_client.srem(f"comments:by_author:{comment.author_id}", comment_id)
            
            # Delete the comment data
            await self.redis_client.delete(f"comment:{comment_id}")
            
            # Update counter
            await self.redis_client.decr("counters:comments")
            
            logger.info(f"Deleted comment: {comment_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete comment {comment_id}: {e}")
            return False
    
    # ============================================
    # SEARCH OPERATIONS
    # ============================================
    
    async def search_posts(self, query: str, limit: int = 10) -> List[Post]:
        """Search posts by content (simple implementation)"""
        try:
            # Get all published posts
            posts = await self.get_posts(limit=1000, status=PostStatus.PUBLISHED)
            
            # Simple text search in title and content
            query_lower = query.lower()
            matching_posts = []
            
            for post in posts:
                if (query_lower in post.title.lower() or 
                    query_lower in post.content.lower()):
                    matching_posts.append(post)
            
            # Sort by relevance (simple: count of query occurrences)
            def relevance_score(post):
                title_matches = post.title.lower().count(query_lower)
                content_matches = post.content.lower().count(query_lower)
                return title_matches * 2 + content_matches  # Title matches weighted higher
            
            matching_posts.sort(key=relevance_score, reverse=True)
            return matching_posts[:limit]
            
        except Exception as e:
            logger.error(f"Failed to search posts: {e}")
            return []
    
    # ============================================
    # STATS OPERATIONS
    # ============================================
    
    async def get_stats(self) -> Dict[str, int]:
        """Get application statistics"""
        try:
            stats = {}
            stats['users'] = int(await self.redis_client.get("counters:users") or 0)
            stats['posts'] = int(await self.redis_client.get("counters:posts") or 0)
            stats['tags'] = int(await self.redis_client.get("counters:tags") or 0)
            stats['comments'] = int(await self.redis_client.get("counters:comments") or 0)
            return stats
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {}
    
    # ============================================
    # REACTION OPERATIONS
    # ============================================
    
    async def add_reaction(self, target_id: str, user_id: str, reaction_type: str, target_type: str = 'post') -> Dict[str, Any]:
        """Add a reaction to a post, discussion, or tag"""
        try:
            reaction_id = str(uuid4())
            
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
            
            # Store the reaction
            reaction_key = f"reaction:{reaction_id}"
            await self.redis_client.set(reaction_key, json.dumps(reaction))
            
            # Add to indexes
            await self.redis_client.sadd(f"reactions:target:{target_id}:{target_type}", reaction_id)
            await self.redis_client.sadd(f"reactions:user:{user_id}", reaction_id)
            await self.redis_client.sadd(f"reactions:type:{reaction_type}", reaction_id)
            
            # Create unique constraint key (one reaction per user/target/type combination)
            constraint_key = f"reaction:constraint:{target_id}:{user_id}:{reaction_type}:{target_type}"
            await self.redis_client.set(constraint_key, reaction_id)
            
            logger.info(f"Added reaction: {reaction_type} to {target_type} {target_id} by user {user_id}")
            return reaction
            
        except Exception as e:
            logger.error(f"Failed to add reaction: {e}")
            raise
    
    async def remove_reaction(self, target_id: str, user_id: str, reaction_type: str, target_type: str = 'post') -> bool:
        """Remove a reaction from a post, discussion, or tag"""
        try:
            # Find existing reaction
            constraint_key = f"reaction:constraint:{target_id}:{user_id}:{reaction_type}:{target_type}"
            reaction_id = await self.redis_client.get(constraint_key)
            
            if not reaction_id:
                return False
            
            # Remove the reaction
            reaction_key = f"reaction:{reaction_id}"
            await self.redis_client.delete(reaction_key)
            
            # Remove from indexes
            await self.redis_client.srem(f"reactions:target:{target_id}:{target_type}", reaction_id)
            await self.redis_client.srem(f"reactions:user:{user_id}", reaction_id)
            await self.redis_client.srem(f"reactions:type:{reaction_type}", reaction_id)
            
            # Remove constraint
            await self.redis_client.delete(constraint_key)
            
            logger.info(f"Removed reaction: {reaction_type} from {target_type} {target_id} by user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to remove reaction: {e}")
            return False
    
    async def get_reactions(self, target_id: str, target_type: str = 'post') -> List[Dict[str, Any]]:
        """Get reactions for a target (post, discussion, tag)"""
        try:
            reaction_ids = await self.redis_client.smembers(f"reactions:target:{target_id}:{target_type}")
            reactions = []
            
            for reaction_id in reaction_ids:
                reaction_key = f"reaction:{reaction_id}"
                reaction_data = await self.redis_client.get(reaction_key)
                
                if reaction_data:
                    reaction = json.loads(reaction_data)
                    
                    # Add user info
                    user = await self.get_user_by_id(reaction['user_id'])
                    if user:
                        reaction.update({
                            'username': user.username,
                            'display_name': user.display_name
                        })
                    
                    reactions.append(reaction)
            
            return reactions
            
        except Exception as e:
            logger.error(f"Failed to get reactions: {e}")
            return []
    
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
        try:
            event_id = event_data.get('id', str(uuid4()))
            
            event = {
                'id': event_id,
                'user_id': event_data['user_id'],
                'event_type_id': event_data['event_type_id'],
                'target_type': event_data.get('target_type'),
                'target_id': event_data.get('target_id'),
                'metadata': event_data.get('metadata', {}),
                'created_ts': datetime.now(timezone.utc).isoformat()
            }
            
            # Store the event
            event_key = f"event:{event_id}"
            await self.redis_client.set(event_key, json.dumps(event))
            
            # Add to indexes
            await self.redis_client.sadd(f"events:user:{event_data['user_id']}", event_id)
            await self.redis_client.sadd(f"events:type:{event_data['event_type_id']}", event_id)
            
            # Add to timeline (sorted by timestamp)
            timestamp = datetime.now(timezone.utc).timestamp()
            await self.redis_client.zadd(f"events:timeline:{event_data['user_id']}", {event_id: timestamp})
            
            logger.info(f"Logged user event: {event_data['event_type_id']} for user {event_data['user_id']}")
            return event_id
            
        except Exception as e:
            logger.error(f"Failed to log user event: {e}")
            raise
    
    # ============================================
    # DATABASE QUERY OPERATIONS
    # ============================================
    
    async def execute_query(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """Execute a query and return results (Redis implementation)"""
        try:
            # Handle specific queries that are commonly used
            if "SELECT DISTINCT r.target_id FROM reactions r" in query and "event-favorite" in query:
                # This is the favorite tags query
                user_id = params[0] if params else None
                if user_id:
                    # Get all reactions of type 'event-favorite' for this user
                    reaction_ids = await self.redis_client.smembers(f"reactions:user:{user_id}")
                    favorite_tags = []
                    
                    for reaction_id in reaction_ids:
                        reaction_key = f"reaction:{reaction_id}"
                        reaction_data = await self.redis_client.get(reaction_key)
                        
                        if reaction_data:
                            reaction = json.loads(reaction_data)
                            if (reaction.get('reaction_type') == 'event-favorite' and 
                                reaction.get('target_type') == 'tag'):
                                favorite_tags.append({'target_id': reaction['target_id']})
                    
                    return favorite_tags
            
            # For other queries, log warning and return empty result
            logger.warning(f"Redis execute_query not implemented for: {query[:100]}...")
            return []
            
        except Exception as e:
            logger.error(f"Failed to execute query: {e}")
            return []
    
    async def execute_command(self, command: str, params: tuple = ()) -> bool:
        """Execute a command (INSERT, UPDATE, DELETE) (Redis implementation)"""
        try:
            # For Redis, most commands are handled by specific methods
            logger.warning(f"Redis execute_command not implemented for: {command[:100]}...")
            return True
            
        except Exception as e:
            logger.error(f"Failed to execute command: {e}")
            return False
    
    # ============================================
    # TAG ASSOCIATION OPERATIONS
    # ============================================
    
    async def associate_tags_with_post(self, post_id: str, tag_names: List[str]) -> bool:
        """Associate tags with a post"""
        try:
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
                        posts_count=0
                    )
                    await self.create_tag(tag)
                
                # Associate with post
                await self.redis_client.sadd(f"post:tags:{post_id}", tag.id)
                await self.redis_client.sadd(f"tag:posts:{tag.id}", post_id)
            
            logger.info(f"Associated {len(tag_names)} tags with post {post_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to associate tags with post: {e}")
            return False
    
    async def get_post_tags(self, post_id: str) -> List[Dict[str, Any]]:
        """Get tags for a specific post"""
        try:
            tag_ids = await self.redis_client.smembers(f"post:tags:{post_id}")
            tags = []
            
            for tag_id in tag_ids:
                tag = await self.get_tag_by_id(tag_id)
                if tag:
                    tags.append({
                        'id': tag.id,
                        'name': tag.name,
                        'description': tag.description,
                        'color': tag.color,
                        'is_active': True
                    })
            
            return tags
            
        except Exception as e:
            logger.error(f"Failed to get post tags: {e}")
            return []
    
    # ============================================
    # DISCUSSION/COMMENT OPERATIONS
    # ============================================
    
    async def get_post_discussions(self, post_id: str) -> List[Dict[str, Any]]:
        """Get discussions for a post"""
        try:
            # Convert comments to discussion format
            comments = await self.get_comments_by_post(post_id)
            discussions = []
            
            for comment in comments:
                # Get user info
                user = await self.get_user_by_id(comment.author_id)
                
                discussion = {
                    'id': comment.id,
                    'post_id': comment.post_id,
                    'author_id': comment.author_id,
                    'content': comment.content,
                    'username': user.username if user else 'unknown',
                    'display_name': user.display_name if user else 'Unknown User',
                    'avatar_url': user.avatar_url if user else '',
                    'created_ts': comment.created_at.isoformat(),
                    'is_deleted': False,
                    'thread_path': '',
                    'thread_level': 0
                }
                discussions.append(discussion)
            
            return discussions
            
        except Exception as e:
            logger.error(f"Failed to get post discussions: {e}")
            return []
    
    async def create_discussion(self, discussion_data: Dict[str, Any]) -> str:
        """Create a new discussion/comment"""
        try:
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
            
        except Exception as e:
            logger.error(f"Failed to create discussion: {e}")
            raise
