"""
Database Migration System
Handles schema upgrades and versioning for ITG DocVerse
"""
import logging
import json
from typing import Dict, List, Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

class DatabaseMigration:
    """Database migration and versioning system"""
    
    # Current database version
    CURRENT_VERSION = "2.1.0"
    
    # SQLite-specific migrations
    SQLITE_MIGRATIONS: Dict[str, str] = {
        "1.0.0": """
        -- Initial database version (existing bootstrap.sql)
        """,
        
        "2.0.0": """
        -- Add content_uploads table (file upload feature)
        CREATE TABLE IF NOT EXISTS content_uploads (
            id VARCHAR(50) PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            original_filename VARCHAR(255) NOT NULL,
            content_type VARCHAR(100) NOT NULL,
            file_size INTEGER NOT NULL,
            file_data BLOB NOT NULL,
            uploaded_by VARCHAR(50) NOT NULL,
            is_public BOOLEAN DEFAULT FALSE,
            visibility VARCHAR(20) DEFAULT 'private',
            title VARCHAR(255),
            description TEXT,
            created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(50),
            updated_by VARCHAR(50),
            is_deleted BOOLEAN DEFAULT FALSE,
            deleted_ts TIMESTAMP,
            deleted_by VARCHAR(50),
            FOREIGN KEY (uploaded_by) REFERENCES users(id),
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (updated_by) REFERENCES users(id),
            FOREIGN KEY (deleted_by) REFERENCES users(id)
        );

        -- Add content_upload_tags table
        CREATE TABLE IF NOT EXISTS content_upload_tags (
            id VARCHAR(50) PRIMARY KEY,
            upload_id VARCHAR(50) NOT NULL,
            tag_id VARCHAR(50) NOT NULL,
            created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(50),
            FOREIGN KEY (upload_id) REFERENCES content_uploads(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tag_types(id),
            FOREIGN KEY (created_by) REFERENCES users(id),
            UNIQUE(upload_id, tag_id)
        );

        -- Add site_settings table
        CREATE TABLE IF NOT EXISTS site_settings (
            id VARCHAR(50) PRIMARY KEY,
            setting_key VARCHAR(100) NOT NULL,
            setting_value TEXT NOT NULL,
            setting_type VARCHAR(20) DEFAULT 'string',
            user_id VARCHAR(50),
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(50),
            updated_by VARCHAR(50),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (updated_by) REFERENCES users(id),
            UNIQUE(setting_key, user_id)
        );
        
        -- Insert initial site settings
        INSERT OR IGNORE INTO site_settings (id, setting_key, setting_value, setting_type, user_id, description, created_by, updated_by) VALUES
        ('set-db-version', 'database.version', '2.0.0', 'string', NULL, 'Current database schema version', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
        ('set-upload-enabled', 'features.upload_enabled', 'true', 'boolean', NULL, 'Enable file uploads', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
        ('set-max-upload-size', 'upload.max_file_size', '10485760', 'number', NULL, 'Maximum file upload size in bytes (10MB)', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27');
        """,
        
        "2.1.0": """
        -- Add event-mentioned event type for user mentions
        INSERT OR IGNORE INTO event_types (id, name, category, description, created_ts, created_by)
        VALUES (
            'event-mentioned',
            'mentioned',
            'engagement',
            'User was mentioned in a post or comment',
            CURRENT_TIMESTAMP,
            'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'
        ), 
            'event-notice-acknowledged',
            'notice-acknowledged',
            'engagement',
            'User acknowledged a notice',
            CURRENT_TIMESTAMP,
            'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'
        ),(
            'event-digest-email',
            'digest-email',
            'engagement',
            'Email digest sent to user',
            CURRENT_TIMESTAMP,
            'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'  -- System user
        );
        """
    }
    
    # PostgreSQL-specific migrations
    POSTGRESQL_MIGRATIONS: Dict[str, str] = {
        "1.0.0": """
        -- Initial database version (existing bootstrap.sql)
        """,
        
        "2.0.0": """
        -- Add content_uploads table (file upload feature)
        CREATE TABLE IF NOT EXISTS content_uploads (
            id VARCHAR(50) PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            original_filename VARCHAR(255) NOT NULL,
            content_type VARCHAR(100) NOT NULL,
            file_size INTEGER NOT NULL,
            file_data BYTEA NOT NULL,
            uploaded_by VARCHAR(50) NOT NULL,
            is_public BOOLEAN DEFAULT FALSE,
            visibility VARCHAR(20) DEFAULT 'private',
            title VARCHAR(255),
            description TEXT,
            created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(50),
            updated_by VARCHAR(50),
            is_deleted BOOLEAN DEFAULT FALSE,
            deleted_ts TIMESTAMP,
            deleted_by VARCHAR(50),
            FOREIGN KEY (uploaded_by) REFERENCES users(id),
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (updated_by) REFERENCES users(id),
            FOREIGN KEY (deleted_by) REFERENCES users(id)
        );

        -- Add content_upload_tags table
        CREATE TABLE IF NOT EXISTS content_upload_tags (
            id VARCHAR(50) PRIMARY KEY,
            upload_id VARCHAR(50) NOT NULL,
            tag_id VARCHAR(50) NOT NULL,
            created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(50),
            FOREIGN KEY (upload_id) REFERENCES content_uploads(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tag_types(id),
            FOREIGN KEY (created_by) REFERENCES users(id),
            UNIQUE(upload_id, tag_id)
        );

        -- Add site_settings table
        CREATE TABLE IF NOT EXISTS site_settings (
            id VARCHAR(50) PRIMARY KEY,
            setting_key VARCHAR(100) NOT NULL,
            setting_value TEXT NOT NULL,
            setting_type VARCHAR(20) DEFAULT 'string',
            user_id VARCHAR(50),
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(50),
            updated_by VARCHAR(50),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (updated_by) REFERENCES users(id),
            UNIQUE(setting_key, user_id)
        );
        
        -- Insert initial site settings
        INSERT INTO site_settings (id, setting_key, setting_value, setting_type, user_id, description, created_by, updated_by) VALUES
        ('set-db-version', 'database.version', '2.0.0', 'string', NULL, 'Current database schema version', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
        ('set-upload-enabled', 'features.upload_enabled', 'true', 'boolean', NULL, 'Enable file uploads', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
        ('set-max-upload-size', 'upload.max_file_size', '10485760', 'number', NULL, 'Maximum file upload size in bytes (10MB)', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27')
        ON CONFLICT (setting_key, user_id) DO NOTHING;
        """,
        
        "2.1.0": """
        -- Add event-mentioned event type for user mentions
        INSERT INTO event_types (id, name, category, description, created_ts, created_by)
        VALUES (
            'event-mentioned',
            'mentioned',
            'engagement',
            'User was mentioned in a post or comment',
            CURRENT_TIMESTAMP,
            'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'
        ), 
        (
            'event-notice-acknowledged',
            'notice-acknowledged',
            'engagement',
            'User acknowledged a notice',
            CURRENT_TIMESTAMP,
            'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'
        ),
        (
            'event-digest-email',
            'digest-email',
            'engagement',
            'Email digest sent to user',
            CURRENT_TIMESTAMP,
            'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'  -- System user
        )
        ON CONFLICT (id) DO NOTHING;
        """
    }
    
    @staticmethod
    def get_migrations_for_db_type(db_type: str) -> Dict[str, str]:
        """Get migrations for specific database type"""
        db_type_lower = db_type.lower()
        if db_type_lower == "postgresql":
            return DatabaseMigration.POSTGRESQL_MIGRATIONS
        elif db_type_lower == "sqlite":
            return DatabaseMigration.SQLITE_MIGRATIONS
        else:
            # Default to SQLite migrations
            return DatabaseMigration.SQLITE_MIGRATIONS
    
    @staticmethod
    def version_compare(version1: str, version2: str) -> int:
        """
        Compare two version strings (semantic versioning)
        Returns: -1 if version1 < version2, 0 if equal, 1 if version1 > version2
        """
        def version_to_tuple(v: str) -> Tuple[int, ...]:
            return tuple(map(int, v.split('.')))
        
        v1_tuple = version_to_tuple(version1)
        v2_tuple = version_to_tuple(version2)
        
        if v1_tuple < v2_tuple:
            return -1
        elif v1_tuple > v2_tuple:
            return 1
        else:
            return 0
    
    @staticmethod
    async def get_database_version(db_service) -> Optional[str]:
        """Get current database version from site_settings"""
        try:
            # Try to get version from site_settings table
            version_setting = await db_service.get_site_setting('database.version')
            if version_setting:
                return version_setting['setting_value']
            
            # Fallback: check if site_settings table exists
            if await db_service.table_exists('site_settings'):
                return "1.0.0"  # Has site_settings but no version = 1.0.0
            
            # Fallback: check if users table exists (basic check for any schema)
            if await db_service.table_exists('users'):
                return "1.0.0"  # Has basic schema but no site_settings
            
            return None  # No schema at all
            
        except Exception as e:
            logger.warning(f"Could not determine database version: {e}")
            return None
    
    @staticmethod
    async def needs_migration(db_service) -> Tuple[bool, Optional[str], str]:
        """
        Check if database needs migration
        Returns: (needs_migration, current_version, target_version)
        """
        current_version = await DatabaseMigration.get_database_version(db_service)
        target_version = DatabaseMigration.CURRENT_VERSION
        
        if current_version is None:
            # Fresh installation
            return False, None, target_version
        
        needs_upgrade = DatabaseMigration.version_compare(current_version, target_version) < 0
        return needs_upgrade, current_version, target_version
    
    @staticmethod
    async def run_migrations(db_service, current_version: str) -> bool:
        """Run all necessary migrations from current_version to latest"""
        try:
            logger.info(f"🔄 Starting database migration from {current_version} to {DatabaseMigration.CURRENT_VERSION}")
            
            # Determine database type
            db_type = "sqlite"  # default
            if hasattr(db_service, '__class__'):
                class_name = db_service.__class__.__name__.lower()
                if "postgresql" in class_name:
                    db_type = "postgresql"
                elif "sqlite" in class_name:
                    db_type = "sqlite"
            
            # Get appropriate migrations for database type
            migrations = DatabaseMigration.get_migrations_for_db_type(db_type)
            logger.info(f"📊 Using {db_type.upper()} migrations")
            
            # Get all versions that need to be applied
            versions_to_apply = []
            for version in sorted(migrations.keys(), key=lambda v: tuple(map(int, v.split('.')))):
                if DatabaseMigration.version_compare(version, current_version) > 0:
                    versions_to_apply.append(version)
            
            if not versions_to_apply:
                logger.info("✅ No migrations needed")
                return True
            
            # Apply migrations in order
            for version in versions_to_apply:
                logger.info(f"📦 Applying migration to version {version}")
                
                migration_sql = migrations[version]
                success = await db_service.execute_migration(migration_sql)
                
                if not success:
                    logger.error(f"❌ Migration to {version} failed")
                    return False
                
                # Update version in database
                await db_service.set_site_setting(
                    'database.version', version, 'string', 
                    description=f'Updated to version {version}',
                    user_id='ef85dcf4-97dd-4ccb-b481-93067b0cfd27'
                )
                
                logger.info(f"✅ Successfully migrated to version {version}")
            
            logger.info(f"🎉 Database migration completed! Now at version {DatabaseMigration.CURRENT_VERSION}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Database migration failed: {e}")
            return False
    
    @staticmethod
    async def initialize_or_migrate(db_service) -> bool:
        """
        Main entry point: Initialize fresh database or migrate existing one
        """
        try:
            needs_migration, current_version, target_version = await DatabaseMigration.needs_migration(db_service)
            
            if current_version is None:
                # Fresh installation - run full bootstrap
                logger.info("🆕 Fresh database detected, running full bootstrap")
                return await db_service.run_full_bootstrap()
            
            elif needs_migration:
                # Existing database needs upgrade
                logger.info(f"🔄 Database upgrade needed: {current_version} -> {target_version}")
                return await DatabaseMigration.run_migrations(db_service, current_version)
            
            else:
                # Database is up to date
                logger.info(f"✅ Database is up to date (version {current_version})")
                return True
                
        except Exception as e:
            logger.error(f"❌ Database initialization/migration failed: {e}")
            return False
