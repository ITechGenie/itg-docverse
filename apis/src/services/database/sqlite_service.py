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
        """Initialize SQLite service"""
        self.db_path = settings.sqlite_path  # Use sqlite_path directly
        self.connection: Optional[aiosqlite.Connection] = None
        
    async def initialize(self):
        """Initialize SQLite database connection"""
        try:
            # Ensure directory exists
            db_path = Path(self.db_path)
            db_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Check if database is new/empty
            is_new_db = not db_path.exists() or db_path.stat().st_size == 0
            
            # Test connection
            async with aiosqlite.connect(self.db_path) as db:
                # Enable foreign key constraints
                await db.execute("PRAGMA foreign_keys = ON")
                await db.commit()
                
                # If database is new or empty, run bootstrap
                if is_new_db:
                    await self._run_bootstrap(db)
                
            logger.info(f"✅ SQLite database initialized: {self.db_path}")
            
        except Exception as e:
            logger.error(f"Failed to initialize SQLite database: {e}")
            raise
            
    async def _run_bootstrap(self, db):
        """Run bootstrap SQL to create schema and initial data"""
        try:
            logger.info("🔧 Running SQLite database bootstrap...")
            
            # Read bootstrap SQL file
            bootstrap_sql_path = Path(__file__).parent.parent.parent.parent / "bootstrap.sql"
            logger.debug(f"📁 Looking for bootstrap SQL at: {bootstrap_sql_path}")
            
            if not bootstrap_sql_path.exists():
                logger.warning(f"❌ Bootstrap SQL file not found: {bootstrap_sql_path}")
                return
                
            logger.debug(f"✅ Bootstrap SQL file found, loading content...")
            with open(bootstrap_sql_path, 'r', encoding='utf-8') as file:
                sql_content = file.read()
                
            # Log file statistics
            char_count = len(sql_content)
            line_count = len(sql_content.split('\n'))
            statement_count = len([stmt.strip() for stmt in sql_content.split(';') if stmt.strip()])
            logger.debug(f"📊 Bootstrap SQL loaded: {char_count} characters, {line_count} lines, ~{statement_count} statements")
                
            # Execute bootstrap SQL
            await self.execute_bootstrap(sql_content)
            logger.info("✅ SQLite database bootstrap completed successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to run SQLite database bootstrap: {e}")
            import traceback
            logger.debug(f"🐛 Bootstrap error traceback: {traceback.format_exc()}")
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
                logger.debug(f"🔧 Starting SQLite bootstrap execution with {len(sql_content)} characters of SQL")
                
                # Enable foreign key constraints
                await db.execute("PRAGMA foreign_keys = ON")
                logger.debug("🔐 SQLite PRAGMA foreign_keys = ON enabled")
                
                # Split SQL content into individual statements
                statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
                logger.info(f"📊 Executing {len(statements)} SQLite SQL statements...")
                
                success_count = 0
                warning_count = 0
                
                for i, statement in enumerate(statements, 1):
                    if statement.strip():
                        try:
                            # Log statement type for debugging
                            stmt_type = statement.split()[0].upper() if statement.split() else "UNKNOWN"
                            logger.debug(f"[{i}/{len(statements)}] Executing {stmt_type}: {statement[:50]}...")
                            
                            await db.execute(statement)
                            success_count += 1
                            
                            if stmt_type in ['CREATE', 'INSERT']:
                                logger.debug(f"✅ [{i}/{len(statements)}] {stmt_type} successful")
                                
                        except Exception as stmt_error:
                            warning_count += 1
                            logger.warning(f"⚠️ [{i}/{len(statements)}] SQLite statement execution warning: {stmt_error}")
                            logger.debug(f"📋 Failed statement: {statement[:200]}...")
                
                await db.commit()
                logger.info(f"✅ SQLite bootstrap SQL executed: {success_count} successful, {warning_count} warnings")
                
        except Exception as e:
            logger.error(f"❌ SQLite bootstrap execution failed: {e}")
            import traceback
            logger.debug(f"🐛 SQLite bootstrap error traceback: {traceback.format_exc()}")
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
                       tag_id: Optional[str] = None,
                       post_type: Optional[str] = None,
                       status: str = "published") -> List[Dict[str, Any]]:
        """Get posts with optional filters"""
        query = """
            SELECT 
                p.*, 
                pt.name AS post_type_name, 
                u.username, 
                u.display_name,
                u.email, 
                u.avatar_url, 
                pc.content,
                (
                    SELECT GROUP_CONCAT(tt.name, ', ')
                    FROM post_tags ptg
                    JOIN tag_types tt ON ptg.tag_id = tt.id
                    WHERE ptg.post_id = p.id
                ) AS tags
            FROM posts p
            JOIN post_types pt ON p.post_type_id = pt.id
            JOIN users u ON p.author_id = u.id
            LEFT JOIN posts_content pc ON p.id = pc.post_id AND pc.is_current = ?
            WHERE p.status = ? AND p.is_latest = ?
        """
        params = [True, status, True]
        
        if author_id:
            query += " AND p.author_id = ?"
            params.append(author_id)
            
        if post_type:
            query += " AND p.post_type_id = ?"
            params.append(post_type)
            
        if tag_id:
            query += """ AND EXISTS (
                SELECT 1 FROM post_tags pt WHERE pt.post_id = p.id AND pt.tag_id = ?
            )"""
            params.append(tag_id)
            
        query += " ORDER BY p.created_ts DESC LIMIT ? OFFSET ?"
        params.extend([limit, skip])
        
        results = await self.execute_query(query, tuple(params))
        return results
        
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
                                branch_name, git_url, document_type, created_by, updated_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                post_data['id'], post_data['post_type_id'], post_data['title'],
                post_data.get('feed_content'), post_data.get('cover_image_url'),
                post_data['author_id'], post_data.get('status', 'draft'),
                post_data.get('revision', 0), post_data.get('read_time', 0),
                post_data.get('project_id'), post_data.get('branch_name'),
                post_data.get('git_url'), post_data.get('document_type'),
                post_data.get('created_by', post_data['author_id']),
                post_data.get('updated_by', post_data['author_id'])
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
        results = await self.execute_query(
            "SELECT * FROM tag_types WHERE is_active = ? ORDER BY name",
            (True,)
        )
        return results
        
    async def get_post_tags(self, post_id: str) -> List[Dict[str, Any]]:
        """Get tags for a specific post"""
        return await self.execute_query(
            """SELECT tt.* FROM tag_types tt
               JOIN post_tags pt ON tt.id = pt.tag_id
               WHERE pt.post_id = ? AND tt.is_active = ?""",
            (post_id, True)
        )

    async def update_post_tags(self, author_id: str, post_id: str, tag_names: List[str]) -> bool:
        """Update tags for a post by removing existing associations and creating new ones"""
        try:
            # Remove existing tag associations for this post
            await self.execute_command(
                "DELETE FROM post_tags WHERE post_id = ?",
                (post_id,)
            )
            
            # Add new tag associations
            for tag_name in tag_names:
                # Check if tag exists by name
                tag_result = await self.execute_query(
                    "SELECT id FROM tag_types WHERE name = ? AND is_active = ?",
                    (tag_name, True)
                )
                
                if tag_result:
                    tag_id = tag_result[0]['id']
                else:
                    # Create tag
                    import uuid
                    tag_id = str(uuid.uuid4())
                    await self.execute_command(
                        """
                        INSERT INTO tag_types (id, name, description, created_by)
                        VALUES (?, ?, ?, ?)
                        """,
                        (tag_id, tag_name, f"Auto-created tag: {tag_name}", author_id)
                    )
                
                # Associate tag with post
                await self.execute_command(
                    """
                    INSERT INTO post_tags (post_id, tag_id, created_by)
                    VALUES (?, ?, ?)
                    """,
                    (post_id, tag_id, author_id)
                )
            
            logger.info(f"Updated tags for post {post_id}: {tag_names}")
            return True
        except Exception as e:
            logger.error(f"Failed to update tags for post {post_id}: {e}")
            return False
        
    # Reaction operations  
    async def add_reaction(self, target_id: str, user_id: str, reaction_type: str, target_type: str = 'post') -> Dict[str, Any]:
        """Add a reaction to a post or discussion"""
        import uuid
        reaction_id = str(uuid.uuid4())
        
        # Get event type ID for the reaction
        event_type_result = await self.execute_query(
            "SELECT id FROM event_types WHERE id = ? AND category = 'reaction'",
            (reaction_type,)
        )
        
        if not event_type_result:
            raise ValueError(f"Unknown reaction type: {reaction_type}")
            
        event_type_id = event_type_result[0]['id']
        
        await self.execute_command(
            """INSERT OR REPLACE INTO reactions 
               (id, event_type_id, user_id, target_type, target_id, target_revision, reaction_value)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (reaction_id, event_type_id, user_id, target_type, target_id, None, 1)
        )
        
        # Return the created reaction
        return {
            'id': reaction_id,
            'target_id': target_id,
            'target_type': target_type,
            'user_id': user_id,
            'reaction_type': reaction_type,
            'created_ts': 'now'  # In real implementation, get actual timestamp
        }

    async def remove_reaction(self, target_id: str, user_id: str, reaction_type: str, target_type: str = 'post') -> bool:
        """Remove a reaction from a post or discussion"""
        # Get event type ID for the reaction
        event_type_result = await self.execute_query(
            "SELECT id FROM event_types WHERE id = ? AND category = 'reaction'",
            (reaction_type,)
        )
        
        if not event_type_result:
            return False
            
        event_type_id = event_type_result[0]['id']
        
        await self.execute_command(
            """DELETE FROM reactions 
               WHERE event_type_id = ? AND user_id = ? AND target_type = ? AND target_id = ?""",
            (event_type_id, user_id, target_type, target_id)
        )
        return True
        
    async def get_post_reactions(self, post_id: str) -> List[Dict[str, Any]]:
        """Get reactions for a post"""
        return await self.get_reactions(post_id, 'post')

    async def get_reactions(self, target_id: str, target_type: str = 'post') -> List[Dict[str, Any]]:
        """Get reactions for a post or discussion"""
        return await self.execute_query(
            """SELECT r.*, et.id as reaction_type, et.icon, et.color,
                      u.username, u.display_name
               FROM reactions r
               JOIN event_types et ON r.event_type_id = et.id
               JOIN users u ON r.user_id = u.id
               WHERE r.target_type = ? AND r.target_id = ?
               ORDER BY r.created_ts DESC""",
            (target_type, target_id)
        )

    async def get_discussion_reactions(self, discussion_id: str) -> List[Dict[str, Any]]:
        """Get reactions for a discussion/comment"""
        return await self.get_reactions(discussion_id, 'discussion')
        
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

    async def associate_tags_with_post(self, author_id: str, post_id: str, tag_names: List[str]) -> bool:
        """Associate tags with a post"""
        try:
            for tag_name in tag_names:
                # First, ensure the tag exists (create if it doesn't)
                existing_tag = await self.get_tag_by_name(tag_name)
                if not existing_tag:
                    # Create the tag
                    import uuid
                    tag_id = str(uuid.uuid4())
                    await self.create_tag({
                        'id': tag_id,
                        'name': tag_name,
                        'description': f'Auto-created tag: {tag_name}',
                        'created_by': author_id
                    })
                else:
                    tag_id = existing_tag['id']
                
                # Associate the tag with the post
                await self.execute_command(
                    "INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)",
                    (post_id, tag_id)
                )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to associate tags with post {post_id}: {e}")
            return False
        
    # Analytics operations
    async def log_user_event(self, event_data: Dict[str, Any]) -> str:
        """Log a user event"""
        try:
            # Validate that user exists
            user = await self.get_user_by_id(event_data['user_id'])
            if not user:
                logger.error(f"User not found: {event_data['user_id']}")
                raise ValueError(f"User not found: {event_data['user_id']}")
            
            # Validate that event type exists
            event_type_result = await self.execute_query(
                "SELECT id FROM event_types WHERE id = ?",
                (event_data['event_type_id'],)
            )
            if not event_type_result:
                logger.error(f"Event type not found: {event_data['event_type_id']}")
                raise ValueError(f"Event type not found: {event_data['event_type_id']}")
            
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
            
        except Exception as e:
            logger.error(f"Failed to log user event: {e}")
            raise
        
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
        
    # Abstract method implementations (minimal stubs for now)
    async def get_users(self, skip: int = 0, limit: int = 10) -> List[Dict[str, Any]]:
        """Get list of users with pagination"""
        results = await self.execute_query(
            "SELECT * FROM users WHERE is_active = ? ORDER BY created_ts DESC LIMIT ? OFFSET ?",
            (True, limit, skip)
        )
        return results
        
    async def create_tag(self, tag_data: Dict[str, Any]) -> str:
        """Create a new tag"""
        await self.execute_command(
            "INSERT INTO tag_types (id, name, description, color, created_by) VALUES (?, ?, ?, ?, ?)",
            (tag_data['id'], tag_data['name'], tag_data.get('description'), 
             tag_data.get('color'), tag_data.get('created_by', 'system'))
        )
        return tag_data['id']
        
    async def get_tag_by_id(self, tag_id: str) -> Optional[Dict[str, Any]]:
        """Get tag by ID"""
        results = await self.execute_query(
            "SELECT * FROM tag_types WHERE id = ? AND is_active = ?",
            (tag_id, True)
        )
        return results[0] if results else None
        
    async def get_tag_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get tag by name"""
        results = await self.execute_query(
            "SELECT * FROM tag_types WHERE name = ? AND is_active = ?",
            (name, True)
        )
        return results[0] if results else None
        
    async def update_post(self, post_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a post"""
        # Handle content update separately (goes to posts_content table)
        if 'content' in updates:
            content = updates.pop('content')  # Remove from updates dict
            
            # Update the current content in posts_content table
            await self.execute_command(
                """UPDATE posts_content 
                   SET content = ? 
                   WHERE post_id = ? AND is_current = ?""",
                (content, post_id, True)
            )
        
        # Build dynamic update query for posts table
        set_clauses = []
        params = []
        
        for key, value in updates.items():
            if key in ['title', 'feed_content', 'cover_image_url', 'status', 'updated_by']:
                set_clauses.append(f"{key} = ?")
                params.append(value)
        
        # Update posts table if there are fields to update
        if set_clauses:
            query = f"UPDATE posts SET {', '.join(set_clauses)}, updated_ts = CURRENT_TIMESTAMP WHERE id = ?"
            params.append(post_id)
            await self.execute_command(query, tuple(params))
        
        return await self.get_post_by_id(post_id)
        
    async def delete_post(self, post_id: str) -> bool:
        """Delete a post (soft delete)"""
        await self.execute_command(
            "UPDATE posts SET is_deleted = ?, deleted_ts = CURRENT_TIMESTAMP WHERE id = ?",
            (True, post_id)
        )
        return True
        
    async def create_comment(self, comment_data: Dict[str, Any]) -> str:
        """Create a new comment"""
        return await self.create_discussion(comment_data)
        
    async def get_comment_by_id(self, comment_id: str) -> Optional[Dict[str, Any]]:
        """Get comment by ID"""
        results = await self.execute_query(
            """SELECT pd.*, u.username, u.display_name, u.avatar_url
               FROM post_discussions pd
               JOIN users u ON pd.author_id = u.id
               WHERE pd.id = ? AND pd.is_deleted = ?""",
            (comment_id, False)
        )
        return results[0] if results else None
        
    async def get_comments_by_post(self, post_id: str) -> List[Dict[str, Any]]:
        """Get comments for a post"""
        return await self.get_post_discussions(post_id)
    
    async def get_recent_comments(self, skip: int = 0, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent comments across all posts"""
        return await self.execute_query(
            """
            SELECT 
                pd.id,
                pd.post_id,
                pd.author_id,
                pd.content,
                pd.parent_discussion_id,
                pd.is_edited,
                pd.created_ts,
                pd.updated_ts,
                u.display_name,
                u.username,
                p.title as post_title
            FROM post_discussions pd
            JOIN users u ON pd.author_id = u.id
            JOIN posts p ON pd.post_id = p.id
            WHERE pd.is_deleted = 0
            ORDER BY pd.created_ts DESC
            LIMIT ? OFFSET ?
            """,
            (limit, skip)
        )
        
    async def delete_comment(self, comment_id: str) -> bool:
        """Delete a comment (soft delete)"""
        await self.execute_command(
            "UPDATE post_discussions SET is_deleted = ?, deleted_ts = CURRENT_TIMESTAMP WHERE id = ?",
            (True, comment_id)
        )
        return True
        
    async def search_posts(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search posts by content"""
        search_query = f"%{query}%"
        results = await self.execute_query(
            """SELECT p.*, pt.name as post_type_name, u.username, u.display_name,
                      u.email, u.avatar_url, pc.content
               FROM posts p
               JOIN post_types pt ON p.post_type_id = pt.id
               JOIN users u ON p.author_id = u.id
               LEFT JOIN posts_content pc ON p.id = pc.post_id AND pc.is_current = ?
               WHERE (p.title LIKE ? OR p.feed_content LIKE ? OR pc.content LIKE ?)
                 AND p.status = ? AND p.is_latest = ?
               ORDER BY p.created_ts DESC LIMIT ?""",
            (True, search_query, search_query, search_query, 'published', True, limit)
        )
        return results
        
    async def get_stats(self) -> Dict[str, int]:
        """Get application statistics"""
        stats = {}
        
        # Get user count
        user_results = await self.execute_query("SELECT COUNT(*) as count FROM users WHERE is_active = ?", (True,))
        stats['users'] = user_results[0]['count'] if user_results else 0
        
        # Get post count
        post_results = await self.execute_query("SELECT COUNT(*) as count FROM posts WHERE status = ? AND is_latest = ?", ('published', True))
        stats['posts'] = post_results[0]['count'] if post_results else 0
        
        # Get tag count
        tag_results = await self.execute_query("SELECT COUNT(*) as count FROM tag_types WHERE is_active = ?", (True,))
        stats['tags'] = tag_results[0]['count'] if tag_results else 0
        
        # Get comment count
        comment_results = await self.execute_query("SELECT COUNT(*) as count FROM post_discussions WHERE is_deleted = ?", (False,))
        stats['comments'] = comment_results[0]['count'] if comment_results else 0
        
        return stats
