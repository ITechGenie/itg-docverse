"""
SQLite Database Service Implementation
Provides SQLite-specific database operations
"""

import aiosqlite
import logging
import json
from typing import List, Dict, Any, Optional
from pathlib import Path

from .base import DatabaseService
from ...config.settings import settings

logger = logging.getLogger(__name__)


class SQLiteService(DatabaseService):
    """SQLite database service implementation"""
    
    def __init__(self):
        self.db_path = settings.database_url.replace("sqlite:///", "")
        if self.db_path.startswith("./"):
            self.db_path = Path(self.db_path).resolve()
        self.connection = None
        
    async def initialize(self):
        """Initialize SQLite database connection"""
        try:
            # Ensure directory exists
            db_path = Path(self.db_path)
            db_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Test connection
            async with aiosqlite.connect(self.db_path) as db:
                # Enable foreign key constraints
                await db.execute("PRAGMA foreign_keys = ON")
                await db.commit()
                
            logger.info(f"✅ SQLite database initialized: {self.db_path}")
            
        except Exception as e:
            logger.error(f"Failed to initialize SQLite database: {e}")
            raise
            
    async def close(self):
        """Close database connection"""
        if self.connection:
            await self.connection.close()
            self.connection = None
        logger.info("🔧 SQLite database connection closed")
        
    async def ping(self):
        """Check database connectivity"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("SELECT 1")
            return True
        except Exception as e:
            logger.error(f"SQLite ping failed: {e}")
            return False
            
    async def execute_bootstrap(self, sql_content: str):
        """Execute bootstrap SQL script"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Enable foreign key constraints
                await db.execute("PRAGMA foreign_keys = ON")
                
                # Split SQL content into individual statements
                statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
                
                for statement in statements:
                    if statement.strip():
                        try:
                            await db.execute(statement)
                        except Exception as stmt_error:
                            logger.warning(f"Statement execution warning: {stmt_error}")
                            logger.debug(f"Statement: {statement[:100]}...")
                
                await db.commit()
                logger.info("✅ Bootstrap SQL executed successfully")
                
        except Exception as e:
            logger.error(f"Bootstrap execution failed: {e}")
            raise
            
    async def execute_query(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """Execute a query and return results"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = aiosqlite.Row  # Enable column access by name
                cursor = await db.execute(query, params)
                rows = await cursor.fetchall()
                
                # Convert rows to dictionaries
                return [dict(row) for row in rows]
                
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
            
    async def execute_command(self, command: str, params: tuple = ()) -> bool:
        """Execute a command (INSERT, UPDATE, DELETE)"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("PRAGMA foreign_keys = ON")
                await db.execute(command, params)
                await db.commit()
                return True
                
        except Exception as e:
            logger.error(f"Command execution failed: {e}")
            raise
            
    # User operations
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        results = await self.execute_query(
            "SELECT * FROM users WHERE id = ? AND is_active = ?",
            (user_id, True)
        )
        return results[0] if results else None
        
    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        results = await self.execute_query(
            "SELECT * FROM users WHERE username = ? AND is_active = ?",
            (username, True)
        )
        return results[0] if results else None
        
    async def create_user(self, user_data: Dict[str, Any]) -> str:
        """Create a new user"""
        await self.execute_command(
            """INSERT INTO users (id, username, display_name, email, bio, location, 
                                website, avatar_url, created_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
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
            WHERE p.status = ? AND p.is_latest = ?
        """
        params = [status, True]
        
        if author_id:
            query += " AND p.author_id = ?"
            params.append(author_id)
            
        if post_type:
            query += " AND pt.name = ?"
            params.append(post_type)
            
        query += " ORDER BY p.created_ts DESC LIMIT ? OFFSET ?"
        params.extend([limit, skip])
        
        return await self.execute_query(query, tuple(params))
        
    async def get_post_by_id(self, post_id: str) -> Optional[Dict[str, Any]]:
        """Get post by ID"""
        results = await self.execute_query(
            """SELECT p.*, pt.name as post_type_name, u.username, u.display_name,
                      u.email, u.avatar_url, pc.content
               FROM posts p
               JOIN post_types pt ON p.post_type_id = pt.id
               JOIN users u ON p.author_id = u.id
               LEFT JOIN posts_content pc ON p.id = pc.post_id AND pc.is_current = ?
               WHERE p.id = ?""",
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
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
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
                   VALUES (?, ?, ?, ?, ?, ?)""",
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
            "SELECT * FROM tag_types WHERE is_active = ? ORDER BY name",
            (True,)
        )
        
    async def get_post_tags(self, post_id: str) -> List[Dict[str, Any]]:
        """Get tags for a specific post"""
        return await self.execute_query(
            """SELECT tt.* FROM tag_types tt
               JOIN post_tags pt ON tt.id = pt.tag_id
               WHERE pt.post_id = ? AND tt.is_active = ?""",
            (post_id, True)
        )
        
    # Reaction operations
    async def add_reaction(self, reaction_data: Dict[str, Any]) -> str:
        """Add a reaction"""
        await self.execute_command(
            """INSERT OR REPLACE INTO reactions 
               (id, event_type_id, user_id, target_type, target_id, target_revision, reaction_value)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
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
               WHERE r.target_type = 'post' AND r.target_id = ?
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
               WHERE pd.post_id = ? AND pd.is_deleted = ?
               ORDER BY pd.thread_path, pd.created_ts""",
            (post_id, False)
        )
        
    async def create_discussion(self, discussion_data: Dict[str, Any]) -> str:
        """Create a new discussion/comment"""
        await self.execute_command(
            """INSERT INTO post_discussions 
               (id, post_id, post_revision, parent_discussion_id, author_id, 
                content, content_type, thread_level, thread_path, created_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
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
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
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
            "SELECT * FROM user_stats WHERE user_id = ?",
            (user_id,)
        )
        return results[0] if results else None
        
    async def update_user_stats(self, user_id: str, stats: Dict[str, Any]) -> bool:
        """Update user statistics"""
        await self.execute_command(
            """INSERT OR REPLACE INTO user_stats 
               (user_id, posts_count, comments_count, reactions_given, 
                reactions_received, tags_followed, followers_count, 
                following_count, total_views)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id, stats.get('posts_count', 0), stats.get('comments_count', 0),
                stats.get('reactions_given', 0), stats.get('reactions_received', 0),
                stats.get('tags_followed', 0), stats.get('followers_count', 0),
                stats.get('following_count', 0), stats.get('total_views', 0)
            )
        )
        return True
