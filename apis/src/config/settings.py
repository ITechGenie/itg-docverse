"""
Configuration management for ITG DocVerse API
"""

import os
from pydantic import BaseModel
from typing import List
from functools import lru_cache
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseModel):
    """Application settings"""
    
    # Database Configuration
    database_type: str = "sqlite"  # redis, sqlite, postgresql, mock
    database_url: str = "sqlite:///./itg_docverse.db"
    
    # Redis Configuration
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_db: int = 0
    
    # PostgreSQL Configuration
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "itg_docverse"
    postgres_user: str = "postgres"
    postgres_password: str = "password"
    
    # SQLite Configuration
    sqlite_path: str = "./docverse.db"
    
    # JWT Configuration
    jwt_secret_key: str = "itg-docverse-default-jwt-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 240  # 4 hours as requested
    
    # Cache Configuration
    cache_type: str = "memory"  # memory or redis
    
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
    
    def get_database_url(self) -> str:
        """Get the appropriate database URL based on database type"""
        if self.database_type == "redis":
            password_part = f":{self.redis_password}@" if self.redis_password else ""
            return f"redis://{password_part}{self.redis_host}:{self.redis_port}/{self.redis_db}"
        elif self.database_type == "postgresql":
            return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        else:  # sqlite
            return f"sqlite:///{self.sqlite_path}"

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance with environment variables"""
    # Load from environment variables
    settings_data = {
        "database_type": os.getenv("DATABASE_TYPE", "mock"),
        "database_url": os.getenv("DATABASE_URL", "sqlite:///./itg_docverse.db"),
        "redis_host": os.getenv("REDIS_HOST", "localhost"),
        "redis_port": int(os.getenv("REDIS_PORT", 6379)),
        "redis_password": os.getenv("REDIS_PASSWORD", ""),
        "redis_db": int(os.getenv("REDIS_DB", 0)),
        "postgres_host": os.getenv("POSTGRES_HOST", "localhost"),
        "postgres_port": int(os.getenv("POSTGRES_PORT", 5432)),
        "postgres_db": os.getenv("POSTGRES_DB", "itg_docverse"),
        "postgres_user": os.getenv("POSTGRES_USER", "postgres"),
        "postgres_password": os.getenv("POSTGRES_PASSWORD", "password"),
        "sqlite_path": os.getenv("SQLITE_PATH", "./itg_docverse.db"),
        "jwt_secret_key": os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key-change-this-in-production"),
        "jwt_algorithm": os.getenv("JWT_ALGORITHM", "HS256"),
        "jwt_access_token_expire_minutes": int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 30)),
        "app_name": os.getenv("APP_NAME", "ITG DocVerse API"),
        "app_version": os.getenv("APP_VERSION", "1.0.0"),
        "debug": os.getenv("DEBUG", "True").lower() == "true",
        "cors_origins": ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
        "host": os.getenv("HOST", "0.0.0.0"),
        "port": int(os.getenv("PORT", 8000)),
        "max_file_size": int(os.getenv("MAX_FILE_SIZE", 10485760)),
        "upload_dir": os.getenv("UPLOAD_DIR", "./uploads"),
    }
    return Settings(**settings_data)

# Global settings instance
settings = get_settings()
