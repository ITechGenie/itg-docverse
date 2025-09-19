"""
PostgreSQL Database Service Implementation
Provides PostgreSQL-specific database operations
"""

import asyncpg
import logging
import json
import re
import uuid
from typing import List, Dict, Any, Optional

from .base import DatabaseService
from ...config.settings import settings

logger = logging.getLogger(__name__)


class PostgreSQLService(DatabaseService):
    """PostgreSQL database service implementation"""
    
    def __init__(self):
        """Initialize PostgreSQL service"""
        self.database_url = settings.get_database_url()  # Use get_database_url() method
        self.connection_pool: Optional[asyncpg.Pool] = None
        
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
            
            # Check if database needs bootstrap (empty or missing schema)
            await self._check_and_run_bootstrap()
            
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
            
    async def _check_and_run_bootstrap(self):
        """Check if database needs bootstrap and run it if needed"""
        try:
            # Check if users table exists (primary indicator of schema presence)
            async with self.connection_pool.acquire() as conn:
                result = await conn.fetchval(
                    """
                    SELECT COUNT(*)
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'users'
                    """
                )
                
                if result == 0:
                    logger.info("🔧 Database schema not found, running bootstrap...")
                    await self._run_bootstrap()
                else:
                    logger.info("📚 Database schema already exists, skipping bootstrap")
                    
        except Exception as e:
            logger.error(f"Failed to check database schema: {e}")
            raise
            
    async def _run_bootstrap(self):
        """Run bootstrap SQL to create schema and initial data"""
        try:
            logger.info("🔧 Running database bootstrap...")
            
            # Read bootstrap SQL file
            from pathlib import Path
            bootstrap_sql_path = Path(__file__).parent.parent.parent.parent / "bootstrap.sql"
            
            logger.debug(f"📂 Looking for bootstrap SQL at: {bootstrap_sql_path}")
            
            if not bootstrap_sql_path.exists():
                logger.warning(f"❌ Bootstrap SQL file not found: {bootstrap_sql_path}")
                return
                
            logger.debug("📖 Reading bootstrap SQL file...")
            with open(bootstrap_sql_path, 'r', encoding='utf-8') as file:
                sql_content = file.read()
                
            logger.info(f"📊 Loaded bootstrap SQL: {len(sql_content)} characters, {len(sql_content.split(';'))} statements")
                
            # Execute bootstrap SQL
            await self.execute_bootstrap(sql_content)
            logger.info("✅ Database bootstrap completed successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to run database bootstrap: {e}")
            logger.debug(f"🔍 Bootstrap error details: {str(e)}", exc_info=True)
            raise
            
    # Helper to convert SQLite-style '?' placeholders to PostgreSQL '$1, $2, ...'
    def _convert_placeholders(self, query: str) -> str:
        if '?' not in query:
            return query
        idx = 0
        def repl(_match):
            nonlocal idx
            idx += 1
            return f'${idx}'
        return re.sub(r'\?', repl, query)
            
    async def execute_bootstrap(self, sql_content: str):
        """Execute bootstrap SQL script, converting SQLite syntax to PostgreSQL"""
        try:
            async with self.connection_pool.acquire() as conn:
                logger.debug(f"🔧 Starting bootstrap execution with {len(sql_content)} characters of SQL")
                
                # Convert SQLite-specific syntax to PostgreSQL
                logger.debug("🔄 Converting SQLite syntax to PostgreSQL...")
                pg_sql = self._convert_sqlite_to_postgres(sql_content)
                
                # Log conversion results
                original_lines = len(sql_content.split('\n'))
                converted_lines = len(pg_sql.split('\n'))
                logger.debug(f"📝 SQL conversion complete: {original_lines} → {converted_lines} lines")
                
                # Split SQL content into individual statements
                statements = [stmt.strip() for stmt in pg_sql.split(';') if stmt.strip()]
                logger.info(f"📊 Executing {len(statements)} SQL statements...")
                
                success_count = 0
                warning_count = 0
                
                for i, statement in enumerate(statements, 1):
                    if statement.strip():
                        try:
                            # Log statement type for debugging
                            stmt_type = statement.split()[0].upper() if statement.split() else "UNKNOWN"
                            logger.debug(f"[{i}/{len(statements)}] Executing {stmt_type}: {statement[:50]}...")
                            
                            await conn.execute(statement)
                            success_count += 1
                            
                            if stmt_type in ['CREATE', 'INSERT']:
                                logger.debug(f"✅ [{i}/{len(statements)}] {stmt_type} successful")
                                
                        except Exception as stmt_error:
                            warning_count += 1
                            logger.warning(f"⚠️ [{i}/{len(statements)}] Statement execution warning: {stmt_error}")
                            logger.debug(f"📋 Failed statement: {statement[:200]}...")
                
                logger.info(f"✅ Bootstrap SQL executed: {success_count} successful, {warning_count} warnings")
                
        except Exception as e:
            logger.error(f"❌ Bootstrap execution failed: {e}")
            raise
            
    def _convert_sqlite_to_postgres(self, sql_content: str) -> str:
        """Convert SQLite-specific syntax to PostgreSQL"""
        logger.debug("🔍 Starting SQLite to PostgreSQL conversion...")
        
        original_pragmas = len(re.findall(r'PRAGMA\s+[^;]*;', sql_content, flags=re.IGNORECASE))
        original_inserts = len(re.findall(r'INSERT\s+OR\s+IGNORE', sql_content, flags=re.IGNORECASE))
        
        logger.debug(f"📊 Found {original_pragmas} PRAGMA statements to remove")
        logger.debug(f"📊 Found {original_inserts} INSERT OR IGNORE statements to convert")
        
        # Remove SQLite PRAGMA statements
        sql_content = re.sub(r'PRAGMA\s+[^;]*;', '', sql_content, flags=re.IGNORECASE)
        logger.debug("✅ Removed PRAGMA statements")
        
        # Convert INSERT OR IGNORE statements to PostgreSQL format
        # We need to do this carefully to place ON CONFLICT in the right position
        
        def convert_insert_statement(match):
            full_statement = match.group(0)
            table_name = match.group(1)
            
            logger.debug(f"🔧 Converting INSERT OR IGNORE for table: {table_name}")
            
            # Define specific conflict resolution for tables with known constraints
            conflict_clause_map = {
                'users': 'ON CONFLICT (id) DO NOTHING',
                'posts': 'ON CONFLICT (id) DO NOTHING',
                'posts_content': 'ON CONFLICT (id) DO NOTHING',
                'post_types': 'ON CONFLICT (id) DO NOTHING',
                'tag_types': 'ON CONFLICT (id) DO NOTHING',
                'event_types': 'ON CONFLICT (id) DO NOTHING',
                'reactions': 'ON CONFLICT (event_type_id, user_id, target_type, target_id) DO NOTHING',
                'post_tags': 'ON CONFLICT (post_id, tag_id) DO NOTHING',
                'post_discussions': 'ON CONFLICT (id) DO NOTHING',
                'user_events': 'ON CONFLICT (id) DO NOTHING',
                'user_stats': 'ON CONFLICT (user_id) DO NOTHING',
                'tag_stats': 'ON CONFLICT (tag_id) DO NOTHING',
                'kb_types': 'ON CONFLICT (id) DO NOTHING',
                'knowledge_base': 'ON CONFLICT (id) DO NOTHING',
                'kb_index_triggers': 'ON CONFLICT (id) DO NOTHING',
                'kb_indexes': 'ON CONFLICT (id) DO NOTHING',
                'kb_metadata': 'ON CONFLICT (id) DO NOTHING'
            }
            
            conflict_clause = conflict_clause_map.get(table_name.lower(), 'ON CONFLICT DO NOTHING')
            logger.debug(f"📋 Using conflict clause for {table_name}: {conflict_clause}")
            
            # Replace INSERT OR IGNORE with INSERT and add conflict clause at the end
            converted = full_statement.replace('INSERT OR IGNORE INTO', 'INSERT INTO')
            
            # Find the position before the final semicolon and add conflict clause
            if converted.endswith(';'):
                converted = converted[:-1] + f' {conflict_clause};'
            else:
                converted = converted + f' {conflict_clause}'
            
            return converted
        
        # Process each INSERT OR IGNORE statement
        sql_content = re.sub(
            r'INSERT\s+OR\s+IGNORE\s+INTO\s+(\w+)\s+.*?;',
            convert_insert_statement,
            sql_content,
            flags=re.IGNORECASE | re.DOTALL
        )
        
        converted_conflicts = len(re.findall(r'ON CONFLICT', sql_content, flags=re.IGNORECASE))
        logger.debug(f"✅ Added {converted_conflicts} ON CONFLICT clauses")
        
        logger.debug("🎯 SQLite to PostgreSQL conversion completed")
        return sql_content
            
    async def execute_query(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """Execute a query and return results"""
        try:
            async with self.connection_pool.acquire() as conn:
                pg_query = self._convert_placeholders(query)
                rows = await conn.fetch(pg_query, *params)
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
            
    async def execute_command(self, command: str, params: tuple = ()) -> bool:
        """Execute a command (INSERT, UPDATE, DELETE)"""
        try:
            async with self.connection_pool.acquire() as conn:
                pg_command = self._convert_placeholders(command)
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
                       status: str = "published",
                       tag_id: Optional[str] = None,
                       trending: Optional[bool] = None,
                       timeframe: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get posts with optional filters (author, post_type, tag)"""
        
        # Base query with reaction count subquery for trending
        if trending:
            query = """
                SELECT p.*, pt.name as post_type_name, u.username, u.display_name,
                       u.email, u.avatar_url,
                       (
                           SELECT string_agg(tt.name, ', ')
                           FROM post_tags ptg
                           JOIN tag_types tt ON ptg.tag_id = tt.id
                           WHERE ptg.post_id = p.id
                       ) AS tags, 
                       p.feed_content as content,
                       (
                           SELECT COUNT(*)
                           FROM reactions r
                           WHERE r.target_id = p.id AND r.target_type = 'post'
                       ) AS reaction_count,
                       (
                           SELECT COUNT(*)
                           FROM user_events ue
                           WHERE ue.target_id = p.id AND ue.target_type = 'post' AND ue.event_type_id = 'event-view'
                       ) AS view_count,
                       (
                           SELECT COUNT(*)
                           FROM post_discussions pd
                           WHERE pd.post_id = p.id
                       ) AS comment_count
                FROM posts p
                JOIN post_types pt ON p.post_type_id = pt.id
                JOIN users u ON p.author_id = u.id
                WHERE p.status = $1 AND p.is_latest = $2
            """
        else:
            query = """
                SELECT p.*, pt.name as post_type_name, u.username, u.display_name,
                       u.email, u.avatar_url,
                       (
                           SELECT string_agg(tt.name, ', ')
                           FROM post_tags ptg
                           JOIN tag_types tt ON ptg.tag_id = tt.id
                           WHERE ptg.post_id = p.id
                       ) AS tags, p.feed_content as content,
                       (
                           SELECT COUNT(*)
                           FROM user_events ue
                           WHERE ue.target_id = p.id AND ue.target_type = 'post' AND ue.event_type_id = 'event-view'
                       ) AS view_count,
                       (
                           SELECT COUNT(*)
                           FROM post_discussions pd
                           WHERE pd.post_id = p.id
                       ) AS comment_count
                FROM posts p
                JOIN post_types pt ON p.post_type_id = pt.id
                JOIN users u ON p.author_id = u.id
                WHERE p.status = $1 AND p.is_latest = $2
            """
        
        params: List[Any] = [status, True]
        param_count = 2
        
        # Add timeframe filter for trending posts
        if trending and timeframe and timeframe != 'all':
            if timeframe == 'today':
                query += f" AND p.created_ts >= NOW() - INTERVAL '1 day'"
            elif timeframe == 'week':
                query += f" AND p.created_ts >= NOW() - INTERVAL '7 days'"
            elif timeframe == 'month':
                query += f" AND p.created_ts >= NOW() - INTERVAL '30 days'"
        
        if author_id:
            param_count += 1
            query += f" AND p.author_id = ${param_count}"
            params.append(author_id)
            
        if post_type:
            param_count += 1
            query += f" AND pt.id = ${param_count}"
            params.append(post_type)
        
        if tag_id:
            param_count += 1
            query += f" AND EXISTS (SELECT 1 FROM post_tags ptg WHERE ptg.post_id = p.id AND ptg.tag_id = ${param_count})"
            params.append(tag_id)
        
        # Order by reaction count for trending, otherwise by most recent activity (updated or created)
        if trending:
            query += " ORDER BY reaction_count DESC, COALESCE(p.updated_ts, p.created_ts) DESC"
        else:
            query += " ORDER BY COALESCE(p.updated_ts, p.created_ts) DESC"
            
        param_count += 1
        query += f" LIMIT ${param_count}"
        params.append(limit)
        
        param_count += 1
        query += f" OFFSET ${param_count}"
        params.append(skip)
        
        return await self.execute_query(query, tuple(params))
        
    async def get_post_by_id(self, post_id: str) -> Optional[Dict[str, Any]]:
        """Get post by ID"""
        results = await self.execute_query(
            """SELECT p.*, pt.name as post_type_name, u.username, u.display_name,
                      u.email, u.avatar_url, pc.content, pc.revision,
                      (
                       SELECT string_agg(tt.name, ', ')
                       FROM post_tags ptg
                       JOIN tag_types tt ON ptg.tag_id = tt.id
                       WHERE ptg.post_id = p.id
                   ) AS tags,
                   (
                       SELECT COUNT(*)
                       FROM user_events ue
                       WHERE ue.target_id = p.id AND ue.target_type = 'post' AND ue.event_type_id = 'event-view'
                   ) AS view_count,
                   (
                       SELECT COUNT(*)
                       FROM post_discussions pd
                       WHERE pd.post_id = p.id
                   ) AS comment_count
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
            # Use UUID for content ID since we have post_id column for relationship
            import uuid
            content_id = str(uuid.uuid4())
            await self.execute_command(
                """INSERT INTO posts_content (id, post_id, revision, content, is_current, created_by)
                   VALUES ($1, $2, $3, $4, $5, $6)""",
                (
                    content_id,
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

    async def update_post_tags(self, author_id: str, post_id: str, tag_names: List[str]) -> bool:
        """Update tags for a post by removing existing associations and creating new ones"""
        try:
            async with self.connection_pool.acquire() as conn:
                async with conn.transaction():
                    # Remove existing tag associations for this post
                    await conn.execute(
                        "DELETE FROM post_tags WHERE post_id = $1",
                        post_id
                    )
                    
                    # Add new tag associations
                    for tag_name in tag_names:
                        # Check if tag exists by name
                        tag_row = await conn.fetchrow(
                            "SELECT id FROM tag_types WHERE name = $1 AND is_active = TRUE",
                            tag_name
                        )
                        if tag_row:
                            tag_id = tag_row["id"]
                        else:
                            # Create tag with app-generated ID
                            tag_id = re.sub(r'[^a-zA-Z0-9 ]', '', tag_name).lower().replace(' ', '-')
                            logger.info(f"Creating new tag '{tag_name}' with ID '{tag_id}'")
                            await conn.execute(
                                """
                                INSERT INTO tag_types (id, name, description, created_by)
                                VALUES ($1, $2, $3, $4)
                                """,
                                tag_id,
                                tag_name,
                                f"Auto-created tag: {tag_name}",
                                author_id
                            )
                        
                        # Associate tag with post
                        post_tag_id = str(uuid.uuid4())
                        await conn.execute(
                            """
                            INSERT INTO post_tags (id, post_id, tag_id, created_by)
                            VALUES ($1, $2, $3, $4)
                            """,
                            post_tag_id, post_id, tag_id, author_id
                        )
            
            logger.info(f"Updated tags for post {post_id}: {tag_names}")
            return True
        except Exception as e:
            logger.error(f"Failed to update tags for post {post_id}: {e}")
            return False

    async def associate_tags_with_post(self, author_id: str, post_id: str, tag_names: List[str]) -> bool:
        """Associate tags with a post (create tags if needed) using app-generated UUIDs"""
        try:
            async with self.connection_pool.acquire() as conn:
                for tag_name in tag_names:
                    # Check if tag exists by name
                    tag_row = await conn.fetchrow(
                        "SELECT id FROM tag_types WHERE name = $1 AND is_active = TRUE",
                        tag_name
                    )
                    if tag_row:
                        tag_id = tag_row["id"]
                    else:
                        # Create tag with app-generated ID
                        tag_id = re.sub(r'[^a-zA-Z0-9 ]', '', tag_name).lower().replace(' ', '-')
                        logger.info(f"Creating new tag '{tag_name}' with ID '{tag_id}'")
                        await conn.execute(
                            """
                            INSERT INTO tag_types (id, name, description, created_by)
                            VALUES ($1, $2, $3, $4)
                            """,
                            tag_id,
                            tag_name,
                            f"Auto-created tag: {tag_name}",
                            author_id
                        )
                    # Associate tag with post; ignore if exists
                    post_tag_id = str(uuid.uuid4())
                    await conn.execute(
                        """
                        INSERT INTO post_tags (id, post_id, tag_id, created_by)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (post_id, tag_id) DO NOTHING
                        """,
                        post_tag_id, post_id, tag_id, author_id
                    )
            return True
        except Exception as e:
            logger.error(f"Failed to associate tags with post {post_id}: {e}")
            return False

    # Parity: users list
    async def get_users(self, skip: int = 0, limit: int = 10) -> List[Dict[str, Any]]:
        """Get list of users with pagination"""
        return await self.execute_query(
            """SELECT *, COALESCE(
                (SELECT string_agg(ur.role_id, ', ')
                FROM user_roles ur
                WHERE ur.user_id = u.id
                ),
                'role_user'
            ) AS roles FROM users u WHERE is_active = $1 ORDER BY created_ts DESC LIMIT $2 OFFSET $3""",
            (True, limit, skip)
        )

    async def get_user_roles(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user roles with role details"""
        return await self.execute_query("""
            SELECT rt.role_id, rt.role_description, rt.permissions, rt.is_active as role_active,
                   ur.created_ts, ur.assigned_by, ur.is_active as assignment_active
            FROM user_roles ur
            JOIN role_types rt ON ur.role_id = rt.role_id
            WHERE ur.user_id = $1 AND ur.is_active = $2 AND rt.is_active = $3
            ORDER BY ur.created_ts DESC
        """, (user_id, True, True))

    async def get_role_types(self) -> List[Dict[str, Any]]:
        """Get all active role types"""
        return await self.execute_query(
            "SELECT role_id, role_name, role_description, permissions, is_active FROM role_types WHERE is_active = $1 ORDER BY role_name",
            (True,)  # Use True instead of 1 for PostgreSQL boolean compatibility
        )

    async def assign_role_to_user(self, user_id: str, role_id: str, assigned_by: str = None) -> bool:
        """Assign a role to a user (idempotent)"""
        try:
            assignment_id = str(uuid.uuid4())
            # Insert if not exists
            await self.execute_command(
                "INSERT INTO user_roles (id, user_id, role_id, is_active, assigned_by, created_by) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id, role_id) DO NOTHING",
                (assignment_id, user_id, role_id, True, assigned_by or user_id, assigned_by or user_id)
            )
            # Ensure assignment is active
            await self.execute_command(
                "UPDATE user_roles SET is_active = $1 WHERE user_id = $2 AND role_id = $3",
                (True, user_id, role_id)
            )
            return True
        except Exception as e:
            logger.error(f"Failed to assign role {role_id} to user {user_id}: {e}")
            return False

    async def remove_role_from_user(self, user_id: str, role_id: str) -> bool:
        """Deactivate a user's role assignment"""
        try:
            await self.execute_command(
                "UPDATE user_roles SET is_active = $1 WHERE user_id = $2 AND role_id = $3",
                (False, user_id, role_id)
            )
            return True
        except Exception as e:
            logger.error(f"Failed to remove role {role_id} from user {user_id}: {e}")
            return False

    # Parity: tags CRUD helpers
    async def create_tag(self, tag_data: Dict[str, Any]) -> str:
        """Create a new tag"""
        await self.execute_command(
            "INSERT INTO tag_types (id, name, description, color, created_by) VALUES ($1, $2, $3, $4, $5)",
            (
                tag_data['id'], tag_data['name'], tag_data.get('description'),
                tag_data.get('color'), tag_data.get('created_by')
            )
        )
        return tag_data['id']

    async def get_tag_by_id(self, tag_id: str) -> Optional[Dict[str, Any]]:
        """Get tag by ID"""
        results = await self.execute_query(
            "SELECT * FROM tag_types WHERE id = $1 AND is_active = $2",
            (tag_id, True)  # Use True instead of 1 for PostgreSQL boolean compatibility
        )
        return results[0] if results else None

    async def get_tag_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get tag by name"""
        results = await self.execute_query(
            "SELECT * FROM tag_types WHERE name = $1 AND is_active = $2",
            (name, True)  # Use True instead of 1 for PostgreSQL boolean compatibility
        )
        return results[0] if results else None
        
    # Reaction operations
    async def add_reaction(self, target_id: str, user_id: str, reaction_type: str, target_type: str = 'post') -> Dict[str, Any]:
        """Add a reaction to a post or discussion"""
        import uuid
        reaction_id = str(uuid.uuid4())
        
        # Get event type ID for the reaction
        event_type_result = await self.execute_query(
            "SELECT id FROM event_types WHERE id = $1 AND category = 'reaction'",
            (reaction_type,)
        )
        
        if not event_type_result:
            raise ValueError(f"Unknown reaction type: {reaction_type}")
            
        event_type_id = event_type_result[0]['id']
        
        await self.execute_command(
            """INSERT INTO reactions 
               (id, event_type_id, user_id, target_type, target_id, target_revision, reaction_value)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (event_type_id, user_id, target_type, target_id) 
               DO UPDATE SET reaction_value = EXCLUDED.reaction_value, updated_ts = CURRENT_TIMESTAMP""",
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
        try:
            # Validate reaction type exists
            event_type = await self.execute_query(
                "SELECT id FROM event_types WHERE id = $1 AND category = 'reaction'",
                (reaction_type,)
            )
            if not event_type:
                return False
            event_type_id = event_type[0]['id']
            await self.execute_command(
                """
                DELETE FROM reactions
                WHERE event_type_id = $1 AND user_id = $2 AND target_type = $3 AND target_id = $4
                """,
                (event_type_id, user_id, target_type, target_id)
            )
            return True
        except Exception as e:
            logger.error(f"Failed to remove reaction: {e}")
            return False
        
    # Comment operations (parity with SQLite)
    async def delete_comment(self, comment_id: str, user_id: Optional[str] = None, soft_delete: bool = True) -> bool:
        """
        Delete (soft by default) a comment.
        - If user_id is provided, enforce ownership.
        - Soft delete sets is_deleted = TRUE and updates updated_ts.
        """
        try:
            if soft_delete:
                if user_id:
                    sql = """
                        UPDATE comments
                        SET is_deleted = TRUE, updated_ts = CURRENT_TIMESTAMP
                        WHERE id = $1 AND author_id = $2
                    """
                    params = (comment_id, user_id)
                else:
                    sql = """
                        UPDATE comments
                        SET is_deleted = TRUE, updated_ts = CURRENT_TIMESTAMP
                        WHERE id = $1
                    """
                    params = (comment_id,)
                await self.execute_command(sql, params)
            else:
                if user_id:
                    sql = "DELETE FROM comments WHERE id = $1 AND author_id = $2"
                    params = (comment_id, user_id)
                else:
                    sql = "DELETE FROM comments WHERE id = $1"
                    params = (comment_id,)
                await self.execute_command(sql, params)
            return True
        except Exception as e:
            logger.error(f"Failed to delete comment {comment_id}: {e}")
            return False
            
    async def get_post_reactions(self, post_id: str) -> List[Dict[str, Any]]:
        """Get reactions for a post"""
        return await self.get_reactions(post_id, 'post')

    async def get_reactions(self, target_id: str, target_type: str = 'post') -> List[Dict[str, Any]]:
        """Get reactions for a post or discussion"""
        return await self.execute_query(
            """
            SELECT r.*, et.id as reaction_type, et.icon, et.color,
                   u.username, u.display_name
            FROM reactions r
            JOIN event_types et ON r.event_type_id = et.id
            JOIN users u ON r.user_id = u.id
            WHERE r.target_type = $1 AND r.target_id = $2
            ORDER BY r.created_ts DESC
            """,
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
        
    async def create_comment(self, comment_data: Dict[str, Any]) -> str:
        """Alias for creating a discussion/comment"""
        return await self.create_discussion(comment_data)
        
    async def get_comment_by_id(self, comment_id: str) -> Optional[Dict[str, Any]]:
        """Get comment by ID"""
        results = await self.execute_query(
            """
            SELECT pd.*, u.username, u.display_name, u.avatar_url
            FROM post_discussions pd
            JOIN users u ON pd.author_id = u.id
            WHERE pd.id = $1 AND pd.is_deleted = $2
            """,
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
            WHERE pd.is_deleted = FALSE
            ORDER BY pd.created_ts DESC
            LIMIT $1 OFFSET $2
            """,
            (limit, skip)
        )
        
    async def delete_comment(self, comment_id: str) -> bool:
        """Delete a comment (soft delete)"""
        await self.execute_command(
            "UPDATE post_discussions SET is_deleted = $1, deleted_ts = CURRENT_TIMESTAMP WHERE id = $2",
            (True, comment_id)
        )
        return True
        
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
    
    async def update_post(self, post_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a post and create new content version if content is provided"""
        # Handle content update separately (create new version)
        if 'content' in updates:
            content = updates.pop('content')
            
            # First, mark current content as not current
            await self.execute_command(
                """
                UPDATE posts_content
                SET is_current = FALSE
                WHERE post_id = $1 AND is_current = TRUE
                """,
                (post_id,)
            )
            
            # Get the next revision number
            result = await self.execute_query(
                """
                SELECT COALESCE(MAX(revision), 0) + 1 as next_revision
                FROM posts_content
                WHERE post_id = $1
                """,
                (post_id,)
            )
            next_revision = result[0]['next_revision'] if result else 1
            
            # Create new content version with UUID
            import uuid
            content_id = str(uuid.uuid4())
            await self.execute_command(
                """
                INSERT INTO posts_content (id, post_id, revision, content, is_current, created_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                (
                    content_id,
                    post_id,
                    next_revision,
                    content,
                    True,
                    updates.get('updated_by')
                )
            )
        
        # Allowed fields to update in posts table
        allowed = ['title', 'feed_content', 'cover_image_url', 'status', 'updated_by']
        set_clauses: List[str] = []
        params: List[Any] = []
        
        for key in allowed:
            if key in updates:
                params.append(updates[key])
                set_clauses.append(f"{key} = ${len(params)}")
        
        if set_clauses:
            # add updated_ts
            set_clause = ", ".join(set_clauses) + ", updated_ts = CURRENT_TIMESTAMP"
            params.append(post_id)
            query = f"UPDATE posts SET {set_clause} WHERE id = ${len(params)}"
            await self.execute_command(query, tuple(params))
        
        return await self.get_post_by_id(post_id)
        
    async def delete_post(self, post_id: str) -> bool:
        """Soft delete a post"""
        await self.execute_command(
            "UPDATE posts SET is_deleted = $1, deleted_ts = CURRENT_TIMESTAMP WHERE id = $2",
            (True, post_id)
        )
        return True
        
    async def search_posts(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search posts by content/title/feed content"""
        search_query = f"%{query}%"
        return await self.execute_query(
            """
            SELECT p.*, pt.name as post_type_name, u.username, u.display_name,
                   u.email, u.avatar_url, pc.content
            FROM posts p
            JOIN post_types pt ON p.post_type_id = pt.id
            JOIN users u ON p.author_id = u.id
            LEFT JOIN posts_content pc ON p.id = pc.post_id AND pc.is_current = TRUE
            WHERE (p.title ILIKE $1 OR p.feed_content ILIKE $1 OR pc.content ILIKE $1)
              AND p.status = $2 AND p.is_latest = $3
            ORDER BY p.created_ts DESC LIMIT $4
            """,
            (search_query, 'published', True, limit)
        )
        
    async def get_stats(self) -> Dict[str, int]:
        """Get application statistics"""
        stats: Dict[str, int] = {}
        # Users
        user_results = await self.execute_query(
            "SELECT COUNT(*) as count FROM users WHERE is_active = $1",
            (True,)
        )
        stats['users'] = user_results[0]['count'] if user_results else 0
        # Posts
        post_results = await self.execute_query(
            "SELECT COUNT(*) as count FROM posts WHERE status = $1 AND is_latest = $2",
            ('published', True)
        )
        stats['posts'] = post_results[0]['count'] if post_results else 0
        # Tags
        tag_results = await self.execute_query(
            "SELECT COUNT(*) as count FROM tag_types WHERE is_active = $1",
            (True,)
        )
        stats['tags'] = tag_results[0]['count'] if tag_results else 0
        # Comments
        comment_results = await self.execute_query(
            "SELECT COUNT(*) as count FROM post_discussions WHERE is_deleted = $1",
            (False,)
        )
        stats['comments'] = comment_results[0]['count'] if comment_results else 0
        return stats

    # ============================================
    # FILE UPLOAD OPERATIONS
    # ============================================
    
    async def create_content_upload(self, upload_data: Dict[str, Any]) -> bool:
        """Create a new file upload record"""
        try:
            await self.execute_command(
                """INSERT INTO content_uploads 
                   (id, filename, original_filename, content_type, file_size, file_data,
                    uploaded_by, is_public, visibility, title, description, created_by, updated_by)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)""",
                (
                    upload_data['id'], upload_data['filename'], upload_data['original_filename'],
                    upload_data['content_type'], upload_data['file_size'], upload_data['file_data'],
                    upload_data['uploaded_by'], upload_data['is_public'], upload_data['visibility'],
                    upload_data['title'], upload_data.get('description'), 
                    upload_data['created_by'], upload_data['updated_by']
                )
            )
            return True
        except Exception as e:
            logger.error(f"Failed to create content upload: {e}")
            return False
    
    async def get_content_upload(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Get file upload data by ID"""
        try:
            results = await self.execute_query(
                "SELECT * FROM content_uploads WHERE id = $1 AND is_deleted = $2",
                (file_id, False)
            )
            return dict(results[0]) if results else None
        except Exception as e:
            logger.error(f"Failed to get content upload: {e}")
            return None
    
    async def get_user_uploads(self, user_id: str, visibility: Optional[str] = None, 
                              tags: Optional[List[str]] = None, search: Optional[str] = None,
                              sort_by: str = "recent", limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Get user's uploaded files with filtering"""
        try:
            # Base query
            query = """
                SELECT DISTINCT cu.* FROM content_uploads cu
                WHERE cu.uploaded_by = $1 AND cu.is_deleted = $2
            """
            params = [user_id, False]
            param_count = 2
            
            # Add visibility filter
            if visibility:
                param_count += 1
                query += f" AND cu.visibility = ${param_count}"
                params.append(visibility)
            
            # Add search filter
            if search:
                param_count += 1
                search_param = f"${param_count}"
                query += f" AND (cu.title ILIKE {search_param} OR cu.original_filename ILIKE {search_param} OR cu.description ILIKE {search_param})"
                params.append(f"%{search}%")
            
            # Add tag filter
            if tags:
                placeholders = ','.join([f"${param_count + i + 1}" for i in range(len(tags))])
                query += f"""
                    AND cu.id IN (
                        SELECT DISTINCT cut.upload_id 
                        FROM content_upload_tags cut 
                        JOIN tag_types tt ON cut.tag_id = tt.id 
                        WHERE tt.name = ANY(ARRAY[{placeholders}])
                    )
                """
                params.extend(tags)
                param_count += len(tags)
            
            # Add sorting
            if sort_by == "recent":
                query += " ORDER BY cu.created_ts DESC"
            elif sort_by == "name":
                query += " ORDER BY cu.title ASC, cu.original_filename ASC"
            else:
                query += " ORDER BY cu.created_ts DESC"
            
            # Add pagination
            param_count += 1
            query += f" LIMIT ${param_count}"
            params.append(limit)
            param_count += 1
            query += f" OFFSET ${param_count}"
            params.append(offset)
            
            results = await self.execute_query(query, tuple(params))
            return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Failed to get user uploads: {e}")
            return []
    
    async def count_user_uploads(self, user_id: str, visibility: Optional[str] = None, 
                                tags: Optional[List[str]] = None, search: Optional[str] = None) -> int:
        """Count user's uploaded files with filtering"""
        try:
            # Base query
            query = """
                SELECT COUNT(DISTINCT cu.id) as count FROM content_uploads cu
                WHERE cu.uploaded_by = $1 AND cu.is_deleted = $2
            """
            params = [user_id, False]
            param_count = 2
            
            # Add visibility filter
            if visibility:
                param_count += 1
                query += f" AND cu.visibility = ${param_count}"
                params.append(visibility)
            
            # Add search filter
            if search:
                param_count += 1
                search_param = f"${param_count}"
                query += f" AND (cu.title ILIKE {search_param} OR cu.original_filename ILIKE {search_param} OR cu.description ILIKE {search_param})"
                params.append(f"%{search}%")
            
            # Add tag filter
            if tags:
                placeholders = ','.join([f"${param_count + i + 1}" for i in range(len(tags))])
                query += f"""
                    AND cu.id IN (
                        SELECT DISTINCT cut.upload_id 
                        FROM content_upload_tags cut 
                        JOIN tag_types tt ON cut.tag_id = tt.id 
                        WHERE tt.name = ANY(ARRAY[{placeholders}])
                    )
                """
                params.extend(tags)
            
            results = await self.execute_query(query, tuple(params))
            return results[0]['count'] if results else 0
        except Exception as e:
            logger.error(f"Failed to count user uploads: {e}")
            return 0
    
    async def update_content_upload(self, file_id: str, update_data: Dict[str, Any]) -> bool:
        """Update file upload metadata"""
        try:
            # Build dynamic update query
            set_clauses = []
            params = []
            param_count = 0
            
            for key, value in update_data.items():
                if key in ['title', 'description', 'visibility', 'is_public', 'updated_by', 'is_deleted']:
                    param_count += 1
                    set_clauses.append(f"{key} = ${param_count}")
                    params.append(value)
            
            if not set_clauses:
                return True  # No updates needed
            
            # Add updated timestamp
            param_count += 1
            set_clauses.append(f"updated_ts = CURRENT_TIMESTAMP")
            
            # Add WHERE clause
            param_count += 1
            params.append(file_id)
            
            query = f"UPDATE content_uploads SET {', '.join(set_clauses)} WHERE id = ${param_count}"
            await self.execute_command(query, tuple(params))
            return True
        except Exception as e:
            logger.error(f"Failed to update content upload: {e}")
            return False
    
    async def get_upload_tags(self, file_id: str) -> List[Dict[str, Any]]:
        """Get tags associated with a file upload"""
        try:
            results = await self.execute_query(
                """SELECT tt.id, tt.name, tt.description, tt.color 
                   FROM content_upload_tags cut
                   JOIN tag_types tt ON cut.tag_id = tt.id
                   WHERE cut.upload_id = $1
                   ORDER BY tt.name""",
                (file_id,)
            )
            return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Failed to get upload tags: {e}")
            return []

    async def _get_or_create_tag_id(self, tag_name: str, user_id: str) -> Optional[str]:
        """Get existing tag ID or create new tag and return ID"""
        try:
            # Check if tag exists
            existing_tag = await self.get_tag_by_name(tag_name)
            if existing_tag:
                return existing_tag['id']
            
            # Create new tag
            import re
            # Remove # symbol, strip other special chars except hyphens, replace spaces with hyphens, lowercase
            tag_id = re.sub(r'[^a-zA-Z0-9 -]', '', tag_name.replace('#', '')).lower().replace(' ', '-')
            await self.create_tag({
                'id': tag_id,
                'name': tag_name,
                'description': f'Auto-created tag: {tag_name}',
                'created_by': user_id
            })
            return tag_id
            
        except Exception as e:
            logger.error(f"Failed to get or create tag {tag_name}: {e}")
            return None
    
    async def associate_tags_with_upload(self, user_id: str, file_id: str, tag_names: List[str]) -> bool:
        """Associate tags with a file upload"""
        try:
            for tag_name in tag_names:
                # Get or create tag
                tag_id = await self._get_or_create_tag_id(tag_name.strip().lower(), user_id)
                
                if tag_id:
                    # Create association (ignore if already exists)
                    await self.execute_command(
                        """INSERT INTO content_upload_tags 
                           (id, upload_id, tag_id, created_by) 
                           VALUES ($1, $2, $3, $4)
                           ON CONFLICT (upload_id, tag_id) DO NOTHING""",
                        (str(uuid.uuid4()), file_id, tag_id, user_id)
                    )
            return True
        except Exception as e:
            logger.error(f"Failed to associate tags with upload: {e}")
            return False
    
    async def update_upload_tags(self, user_id: str, file_id: str, tag_names: List[str]) -> bool:
        """Update tags for a file upload"""
        try:
            # Remove existing tag associations
            await self.execute_command(
                "DELETE FROM content_upload_tags WHERE upload_id = $1",
                (file_id,)
            )
            
            # Add new associations
            if tag_names:
                return await self.associate_tags_with_upload(user_id, file_id, tag_names)
            
            return True
        except Exception as e:
            logger.error(f"Failed to update upload tags: {e}")
            return False

    # =====================================================
    # MIGRATION AND SITE SETTINGS METHODS
    # =====================================================
    
    async def table_exists(self, table_name: str) -> bool:
        """Check if a table exists in the database"""
        try:
            async with self.connection_pool.acquire() as conn:
                result = await conn.fetchval(
                    """SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = $1
                    )""",
                    table_name
                )
                return result
        except Exception as e:
            logger.error(f"Failed to check if table {table_name} exists: {e}")
            return False
    
    async def get_site_setting(self, setting_key: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get a site setting by key"""
        try:
            async with self.connection_pool.acquire() as conn:
                result = await conn.fetchrow(
                    """SELECT id, setting_key, setting_value, setting_type, user_id, description, 
                              is_active, created_ts, updated_ts, created_by, updated_by
                       FROM site_settings 
                       WHERE setting_key = $1 AND user_id IS NOT DISTINCT FROM $2 AND is_active = TRUE""",
                    setting_key, user_id
                )
                
                if result:
                    setting = dict(result)
                    # Convert value based on type
                    value = setting['setting_value']
                    if setting['setting_type'] == 'json':
                        try:
                            value = json.loads(value)
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse JSON setting: {setting_key}")
                    elif setting['setting_type'] == 'boolean':
                        value = value.lower() in ('true', '1', 'yes', 'on')
                    elif setting['setting_type'] == 'number':
                        try:
                            value = int(value) if '.' not in value else float(value)
                        except ValueError:
                            logger.warning(f"Failed to parse number setting: {setting_key}")
                    
                    setting['setting_value'] = value
                    return setting
                
                return None
        except Exception as e:
            logger.error(f"Failed to get site setting {setting_key}: {e}")
            return None
    
    async def set_site_setting(self, setting_key: str, setting_value: Any, setting_type: str = 'string', 
                              description: Optional[str] = None, user_id: Optional[str] = None) -> bool:
        """Set a site setting"""
        try:
            # Convert value to string based on type
            if setting_type == 'json':
                value_str = json.dumps(setting_value)
            elif setting_type == 'boolean':
                value_str = 'true' if setting_value else 'false'
            else:
                value_str = str(setting_value)
            
            async with self.connection_pool.acquire() as conn:
                # Check if setting exists
                existing = await conn.fetchrow(
                    "SELECT id FROM site_settings WHERE setting_key = $1 AND user_id IS NOT DISTINCT FROM $2",
                    setting_key, user_id
                )
                
                if existing:
                    # Update existing setting
                    await conn.execute(
                        """UPDATE site_settings 
                           SET setting_value = $1, setting_type = $2, description = $3, 
                               updated_ts = CURRENT_TIMESTAMP, updated_by = $4
                           WHERE setting_key = $5 AND user_id IS NOT DISTINCT FROM $6""",
                        value_str, setting_type, description, user_id or 'system', setting_key, user_id
                    )
                else:
                    # Create new setting
                    await conn.execute(
                        """INSERT INTO site_settings 
                           (id, setting_key, setting_value, setting_type, user_id, description, 
                            created_by, updated_by)
                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
                        str(uuid.uuid4()), setting_key, value_str, setting_type, user_id, 
                        description, user_id or 'system', user_id or 'system'
                    )
            
            return True
        except Exception as e:
            logger.error(f"Failed to set site setting {setting_key}: {e}")
            return False
    
    async def execute_migration(self, migration_sql: str) -> bool:
        """Execute a migration SQL script"""
        try:
            async with self.connection_pool.acquire() as conn:
                # Split SQL into individual statements
                statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
                
                async with conn.transaction():
                    for statement in statements:
                        if statement:
                            logger.debug(f"Executing migration statement: {statement[:100]}...")
                            await conn.execute(statement)
            
            logger.info("✅ Migration SQL executed successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to execute migration: {e}")
            return False
    
    async def run_full_bootstrap(self) -> bool:
        """Run the complete bootstrap SQL file"""
        try:
            # Read bootstrap SQL file
            from pathlib import Path
            bootstrap_sql_path = Path(__file__).parent.parent.parent.parent / "bootstrap.sql"
            
            if not bootstrap_sql_path.exists():
                logger.error(f"Bootstrap SQL file not found: {bootstrap_sql_path}")
                return False
                
            with open(bootstrap_sql_path, 'r', encoding='utf-8') as file:
                sql_content = file.read()
            
            # Execute bootstrap SQL (PostgreSQL version with $1, $2 syntax handling)
            return await self.execute_bootstrap(sql_content)
            
        except Exception as e:
            logger.error(f"Failed to run full bootstrap: {e}")
            return False
