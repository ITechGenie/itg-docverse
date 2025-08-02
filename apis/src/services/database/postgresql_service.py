"""
PostgreSQL Database Service Implementation
Provides PostgreSQL-specific database operations
"""

import asyncpg
import logging
import json
from typing import List, Dict, Any, Optional

from .base import DatabaseService
from ...config.settings import settings

logger = logging.getLogger(__name__)


class PostgreSQLService(DatabaseService):
    """PostgreSQL database service implementation"""
    
    def __init__(self):
        self.connection_pool = None
        self.database_url = settings.database_url
        
    async def initialize(self):
        """Initialize PostgreSQL database connection pool"""
        try:
            # Create connection pool
            self.connection_pool = await asyncpg.create_pool(
                self.database_url,
                min_size=2,
                max_size=settings.db_pool_size,
                command_timeout=60
            )
            
            # Test connection
            async with self.connection_pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
                
            logger.info("✅ PostgreSQL database pool initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize PostgreSQL database: {e}")
            raise
            
    async def close(self):
        """Close database connection pool"""
        if self.connection_pool:
            await self.connection_pool.close()
            self.connection_pool = None
        logger.info("🔧 PostgreSQL database pool closed")
        
    async def ping(self):
        """Check database connectivity"""
        try:
            if not self.connection_pool:
                return False
                
            async with self.connection_pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            return True
        except Exception as e:
            logger.error(f"PostgreSQL ping failed: {e}")
            return False
            
    async def execute_bootstrap(self, sql_content: str):
        """Execute bootstrap SQL script"""
        try:
            async with self.connection_pool.acquire() as conn:
                # Split SQL content into individual statements
                statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
                
                for statement in statements:
                    if statement.strip():
                        try:
                            await conn.execute(statement)
                        except Exception as stmt_error:
                            logger.warning(f"Statement execution warning: {stmt_error}")
                            logger.debug(f"Statement: {statement[:100]}...")
                
                logger.info("✅ Bootstrap SQL executed successfully")
                
        except Exception as e:
            logger.error(f"Bootstrap execution failed: {e}")
            raise
            
    async def execute_query(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """Execute a query and return results"""
        try:
            async with self.connection_pool.acquire() as conn:
                # Convert positional parameters to PostgreSQL format ($1, $2, etc.)
                pg_query = query.replace('?', lambda x: f'${query[:query.find(x.group())].count("?") + 1}')
                
                rows = await conn.fetch(pg_query, *params)
                
                # Convert records to dictionaries
                return [dict(row) for row in rows]
                
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
            
    async def execute_command(self, command: str, params: tuple = ()) -> bool:
        """Execute a command (INSERT, UPDATE, DELETE)"""
        try:
            async with self.connection_pool.acquire() as conn:
                # Convert positional parameters to PostgreSQL format
                pg_command = command.replace('?', lambda x: f'${command[:command.find(x.group())].count("?") + 1}')
                
                await conn.execute(pg_command, *params)
                return True
                
        except Exception as e:
            logger.error(f"Command execution failed: {e}")
            raise
            
    # User operations
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        results = await self.execute_query(
            "SELECT * FROM users WHERE id = $1 AND is_active = $2",
            (user_id, True)
        )
        return results[0] if results else None
        
    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        results = await self.execute_query(
            "SELECT * FROM users WHERE username = $1 AND is_active = $2",
            (username, True)
        )
        return results[0] if results else None
        
    async def create_user(self, user_data: Dict[str, Any]) -> str:
        """Create a new user"""
        await self.execute_command(
            """INSERT INTO users (id, username, display_name, email, bio, location, 
                                website, avatar_url, created_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
            (
                user_data['id'], user_data['username'], user_data['display_name'],
                user_data['email'], user_data.get('bio'), user_data.get('location'),
                user_data.get('website'), user_data.get('avatar_url'),
                user_data.get('created_by', 'system')
            )
        )
        return user_data['id']
        
    # Post operations
    async def get_posts(self, skip: int = 0, limit: int = 10, 
                       author_id: Optional[str] = None,
                       post_type: Optional[str] = None,
                       status: str = "published") -> List[Dict[str, Any]]:
        """Get posts with optional filters"""
        query = """
            SELECT p.*, pt.name as post_type_name, u.username, u.display_name,
                   u.email, u.avatar_url
            FROM posts p
            JOIN post_types pt ON p.post_type_id = pt.id
            JOIN users u ON p.author_id = u.id
            WHERE p.status = $1 AND p.is_latest = $2
        """
        params = [status, True]
        param_count = 2
        
        if author_id:
            param_count += 1
            query += f" AND p.author_id = ${param_count}"
            params.append(author_id)
            
        if post_type:
            param_count += 1
            query += f" AND pt.name = ${param_count}"
            params.append(post_type)
            
        param_count += 1
        query += f" ORDER BY p.created_ts DESC LIMIT ${param_count}"
        params.append(limit)
        
        param_count += 1
        query += f" OFFSET ${param_count}"
        params.append(skip)
        
        return await self.execute_query(query, tuple(params))
        
    async def get_post_by_id(self, post_id: str) -> Optional[Dict[str, Any]]:
        """Get post by ID"""
        results = await self.execute_query(
            """SELECT p.*, pt.name as post_type_name, u.username, u.display_name,
                      u.email, u.avatar_url, pc.content
               FROM posts p
               JOIN post_types pt ON p.post_type_id = pt.id
               JOIN users u ON p.author_id = u.id
               LEFT JOIN posts_content pc ON p.id = pc.post_id AND pc.is_current = $1
               WHERE p.id = $2""",
            (True, post_id)
        )
        return results[0] if results else None
        
    async def create_post(self, post_data: Dict[str, Any]) -> str:
        """Create a new post"""
        # Insert post record
        await self.execute_command(
            """INSERT INTO posts (id, post_type_id, title, feed_content, cover_image_url,
                                author_id, status, revision, read_time, project_id,
                                branch_name, git_url, document_type, created_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)""",
            (
                post_data['id'], post_data['post_type_id'], post_data['title'],
                post_data.get('feed_content'), post_data.get('cover_image_url'),
                post_data['author_id'], post_data.get('status', 'draft'),
                post_data.get('revision', 0), post_data.get('read_time', 0),
                post_data.get('project_id'), post_data.get('branch_name'),
                post_data.get('git_url'), post_data.get('document_type'),
                post_data.get('created_by', post_data['author_id'])
            )
        )
        
        # Insert content if provided
        if 'content' in post_data:
            await self.execute_command(
                """INSERT INTO posts_content (id, post_id, revision, content, is_current, created_by)
                   VALUES ($1, $2, $3, $4, $5, $6)""",
                (
                    f"{post_data['id']}-content-{post_data.get('revision', 0)}",
                    post_data['id'], post_data.get('revision', 0),
                    post_data['content'], True,
                    post_data.get('created_by', post_data['author_id'])
                )
            )
            
        return post_data['id']
        
    # Tag operations
    async def get_tags(self) -> List[Dict[str, Any]]:
        """Get all active tags"""
        return await self.execute_query(
            "SELECT * FROM tag_types WHERE is_active = $1 ORDER BY name",
            (True,)
        )
        
    async def get_post_tags(self, post_id: str) -> List[Dict[str, Any]]:
        """Get tags for a specific post"""
        return await self.execute_query(
            """SELECT tt.* FROM tag_types tt
               JOIN post_tags pt ON tt.id = pt.tag_id
               WHERE pt.post_id = $1 AND tt.is_active = $2""",
            (post_id, True)
        )
        
    # Reaction operations
    async def add_reaction(self, reaction_data: Dict[str, Any]) -> str:
        """Add a reaction"""
        await self.execute_command(
            """INSERT INTO reactions 
               (id, event_type_id, user_id, target_type, target_id, target_revision, reaction_value)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (event_type_id, user_id, target_type, target_id) 
               DO UPDATE SET reaction_value = EXCLUDED.reaction_value, updated_ts = CURRENT_TIMESTAMP""",
            (
                reaction_data['id'], reaction_data['event_type_id'],
                reaction_data['user_id'], reaction_data['target_type'],
                reaction_data['target_id'], reaction_data.get('target_revision'),
                reaction_data.get('reaction_value', 1)
            )
        )
        return reaction_data['id']
        
    async def get_post_reactions(self, post_id: str) -> List[Dict[str, Any]]:
        """Get reactions for a post"""
        return await self.execute_query(
            """SELECT r.*, et.name as reaction_type, et.icon, et.color,
                      u.username, u.display_name
               FROM reactions r
               JOIN event_types et ON r.event_type_id = et.id
               JOIN users u ON r.user_id = u.id
               WHERE r.target_type = 'post' AND r.target_id = $1
               ORDER BY r.created_ts DESC""",
            (post_id,)
        )
        
    # Comment/Discussion operations
    async def get_post_discussions(self, post_id: str) -> List[Dict[str, Any]]:
        """Get discussions for a post"""
        return await self.execute_query(
            """SELECT pd.*, u.username, u.display_name, u.avatar_url
               FROM post_discussions pd
               JOIN users u ON pd.author_id = u.id
               WHERE pd.post_id = $1 AND pd.is_deleted = $2
               ORDER BY pd.thread_path, pd.created_ts""",
            (post_id, False)
        )
        
    async def create_discussion(self, discussion_data: Dict[str, Any]) -> str:
        """Create a new discussion/comment"""
        await self.execute_command(
            """INSERT INTO post_discussions 
               (id, post_id, post_revision, parent_discussion_id, author_id, 
                content, content_type, thread_level, thread_path, created_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)""",
            (
                discussion_data['id'], discussion_data['post_id'],
                discussion_data.get('post_revision'), discussion_data.get('parent_discussion_id'),
                discussion_data['author_id'], discussion_data['content'],
                discussion_data.get('content_type', 'text'),
                discussion_data.get('thread_level', 0), discussion_data.get('thread_path', ''),
                discussion_data.get('created_by', discussion_data['author_id'])
            )
        )
        return discussion_data['id']
        
    # Analytics operations
    async def log_user_event(self, event_data: Dict[str, Any]) -> str:
        """Log a user event"""
        await self.execute_command(
            """INSERT INTO user_events 
               (id, user_id, event_type_id, target_type, target_id, session_id,
                ip_address, user_agent, metadata)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
            (
                event_data['id'], event_data['user_id'], event_data['event_type_id'],
                event_data.get('target_type'), event_data.get('target_id'),
                event_data.get('session_id'), event_data.get('ip_address'),
                event_data.get('user_agent'), json.dumps(event_data.get('metadata', {}))
            )
        )
        return event_data['id']
        
    # Statistics operations
    async def get_user_stats(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user statistics"""
        results = await self.execute_query(
            "SELECT * FROM user_stats WHERE user_id = $1",
            (user_id,)
        )
        return results[0] if results else None
        
    async def update_user_stats(self, user_id: str, stats: Dict[str, Any]) -> bool:
        """Update user statistics"""
        await self.execute_command(
            """INSERT INTO user_stats 
               (user_id, posts_count, comments_count, reactions_given, 
                reactions_received, tags_followed, followers_count, 
                following_count, total_views)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (user_id) 
               DO UPDATE SET 
                   posts_count = EXCLUDED.posts_count,
                   comments_count = EXCLUDED.comments_count,
                   reactions_given = EXCLUDED.reactions_given,
                   reactions_received = EXCLUDED.reactions_received,
                   tags_followed = EXCLUDED.tags_followed,
                   followers_count = EXCLUDED.followers_count,
                   following_count = EXCLUDED.following_count,
                   total_views = EXCLUDED.total_views,
                   updated_ts = CURRENT_TIMESTAMP""",
            (
                user_id, stats.get('posts_count', 0), stats.get('comments_count', 0),
                stats.get('reactions_given', 0), stats.get('reactions_received', 0),
                stats.get('tags_followed', 0), stats.get('followers_count', 0),
                stats.get('following_count', 0), stats.get('total_views', 0)
            )
        )
        return True
