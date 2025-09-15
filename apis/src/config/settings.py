"""
Configuration management for ITG DocVerse API
"""

import os
import urllib.parse
from pydantic import BaseModel
from typing import List
from functools import lru_cache
from dotenv import load_dotenv
import urllib

# Load environment variables from .env file
load_dotenv()

class Settings(BaseModel):
    """Application settings"""
    
    # Database Configuration
    database_type: str = "sqlite"  # redis, sqlite, postgresql
    
    # Redis Configuration
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_username: str = "default"  # Add username field for Redis Cloud
    redis_password: str = ""
    redis_db: int = 0
    
    # PostgreSQL Configuration
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "itg_docverse"
    postgres_user: str = "postgres"
    postgres_password: str = "password"

    db_pool_size: int = 10  # Default pool size for database connections
    
    # SQLite Configuration
    sqlite_path: str = "./itg_docverse.db"
    
    # JWT Configuration
    jwt_secret_key: str = "itg-docverse-default-jwt-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 240  # 4 hours as requested
    
    # Cache Configuration
    cache_type: str = "memory"  # memory or redis
    
    # AI Search Configuration
    enable_ai_search: bool = os.getenv("ENABLE_AI_SEARCH", "true").lower() == "true"
    ollama_host: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "nomic-embed-text")
    search_similarity_threshold: float = float(os.getenv("SEARCH_SIMILARITY_THRESHOLD", "0.3"))
    search_chunk_size: int = int(os.getenv("SEARCH_CHUNK_SIZE", "500"))
    search_chunk_overlap: int = int(os.getenv("SEARCH_CHUNK_OVERLAP", "50"))
    
    # Application Configuration
    app_name: str = "ITG DocVerse API"
    app_version: str = "1.0.0"
    debug: bool = True
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    
    # File Upload Configuration
    max_file_size: int = 10485760  # 10MB
    upload_dir: str = "./uploads"
    
    # Database Migration and Setup Configuration
    skip_migrations: bool = False  # Skip automatic database migrations
    skip_bootstrap: bool = False   # Skip automatic sample data bootstrap
    allow_ddl_operations: bool = True  # Allow DDL operations (CREATE, ALTER, DROP tables)
    admin_only_migrations: bool = False  # Require admin role for migrations
    
    def get_database_url(self) -> str:
        """Get the appropriate database URL based on database type"""
        
        if self.database_type == "redis":
            encoded_password = urllib.parse.quote_plus(self.redis_password) # Encode @ in password
            if self.redis_username and self.redis_password:
                auth_part = f"{self.redis_username}:{encoded_password}@"
            elif self.redis_password:
                auth_part = f":{encoded_password}@"
            else:
                auth_part = ""
            return f"redis://{auth_part}{self.redis_host}:{self.redis_port}/{self.redis_db}"
        elif self.database_type == "postgresql":
            encoded_password = urllib.parse.quote_plus(self.postgres_password) # Encode @ in password
            return f"postgresql://{self.postgres_user}:{encoded_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        else:  # sqlite
            return f"sqlite:///{self.sqlite_path}"

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance with environment variables"""
    # Create a default Settings instance to get the default values
    defaults = Settings()
    
    # Load from environment variables, using class defaults as fallback
    settings_data = {
        "database_type": os.getenv("DATABASE_TYPE", defaults.database_type),
        "redis_host": os.getenv("REDIS_HOST", defaults.redis_host),
        "redis_port": int(os.getenv("REDIS_PORT", defaults.redis_port)),
        "redis_username": os.getenv("REDIS_USERNAME", defaults.redis_username),
        "redis_password": os.getenv("REDIS_PASSWORD", defaults.redis_password),
        "redis_db": int(os.getenv("REDIS_DB", defaults.redis_db)),
        "postgres_host": os.getenv("POSTGRES_HOST", defaults.postgres_host),
        "postgres_port": int(os.getenv("POSTGRES_PORT", defaults.postgres_port)),
        "postgres_db": os.getenv("POSTGRES_DB", defaults.postgres_db),
        "postgres_user": os.getenv("POSTGRES_USER", defaults.postgres_user),
        "postgres_password": os.getenv("POSTGRES_PASSWORD", defaults.postgres_password),
        "db_pool_size": int(os.getenv("DB_POOL_SIZE", defaults.db_pool_size)),
        "sqlite_path": os.getenv("SQLITE_PATH", defaults.sqlite_path),
        "jwt_secret_key": os.getenv("JWT_SECRET_KEY", defaults.jwt_secret_key),
        "jwt_algorithm": os.getenv("JWT_ALGORITHM", defaults.jwt_algorithm),
        "jwt_access_token_expire_minutes": int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", defaults.jwt_access_token_expire_minutes)),
        "app_name": os.getenv("APP_NAME", defaults.app_name),
        "app_version": os.getenv("APP_VERSION", defaults.app_version),
        "debug": os.getenv("DEBUG", str(defaults.debug)).lower() == "true",
        "cors_origins": defaults.cors_origins,  # Use class default directly
        "host": os.getenv("HOST", defaults.host),
        "port": int(os.getenv("PORT", defaults.port)),
        "max_file_size": int(os.getenv("MAX_FILE_SIZE", defaults.max_file_size)),
        "upload_dir": os.getenv("UPLOAD_DIR", defaults.upload_dir),
        "skip_migrations": os.getenv("SKIP_MIGRATIONS", str(defaults.skip_migrations)).lower() == "true",
        "skip_bootstrap": os.getenv("SKIP_BOOTSTRAP", str(defaults.skip_bootstrap)).lower() == "true",
        "allow_ddl_operations": os.getenv("ALLOW_DDL_OPERATIONS", str(defaults.allow_ddl_operations)).lower() == "true",
        "admin_only_migrations": os.getenv("ADMIN_ONLY_MIGRATIONS", str(defaults.admin_only_migrations)).lower() == "true",
    }
    return Settings(**settings_data)

# Global settings instance
settings = get_settings()
