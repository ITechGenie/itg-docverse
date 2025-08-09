"""
ITG DocVerse API
Main FastAPI application with JWT Authentication Middleware
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import uvicorn
import os
import logging

from src.config.settings import get_settings
from src.routers import posts, users, tags, comments, stats, reactions, authors, events
from src.routers import public_auth
from src.database.connection import get_database_service
from src.middleware.auth import AuthenticationMiddleware
from src.auth.jwt_service import AuthService
from bootstrap_data import BootstrapData

# Initialize settings
settings = get_settings()
logger = logging.getLogger(__name__)

async def auto_bootstrap(db_service):
    """Automatically bootstrap the database if it's empty"""
    try:
        # Check if we have any users (primary indicator of empty database)
        existing_users = await db_service.get_users(skip=0, limit=1)
        
        if not existing_users or len(existing_users) == 0:
            logger.info("🔄 Database appears to be empty, running auto-bootstrap...")
            
            # Get centralized bootstrap data
            users = BootstrapData.get_users()
            tags = BootstrapData.get_tags()
            posts = BootstrapData.get_posts(users, tags)
            comments = BootstrapData.get_comments(posts, users)
            
            # Create data using service layer
            created_count = {"users": 0, "tags": 0, "posts": 0, "comments": 0}
            
            for user in users:
                try:
                    await db_service.create_user(user)
                    created_count["users"] += 1
                except Exception as e:
                    logger.warning(f"User {user.username} might already exist: {e}")
            
            for tag in tags:
                try:
                    await db_service.create_tag(tag)
                    created_count["tags"] += 1
                except Exception as e:
                    logger.warning(f"Tag {tag.name} might already exist: {e}")
            
            for post in posts:
                try:
                    await db_service.create_post(post)
                    created_count["posts"] += 1
                except Exception as e:
                    logger.warning(f"Post {post.title[:30]} might already exist: {e}")
            
            for comment in comments:
                try:
                    await db_service.create_comment(comment)
                    created_count["comments"] += 1
                except Exception as e:
                    logger.warning(f"Comment on {comment.post_id} might already exist: {e}")
            
            logger.info("✅ Auto-bootstrap completed successfully!")
            logger.info(f"   Created {created_count['users']} users")
            logger.info(f"   Created {created_count['tags']} tags") 
            logger.info(f"   Created {created_count['posts']} posts")
            logger.info(f"   Created {created_count['comments']} comments")
        else:
            logger.info(f"📚 Database already has {len(existing_users)} users, skipping bootstrap")
            
    except Exception as e:
        logger.error(f"❌ Auto-bootstrap failed: {e}")
        # Don't raise the exception to prevent app startup failure
        # Just log the error and continue

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events"""
    # Startup
    print(f"🚀 Starting {settings.app_name} v{settings.app_version}")
    print(f"📊 Database: {settings.database_type}")
    print(f"🌐 CORS origins: {settings.cors_origins}")
    
    # Initialize database service
    db_service = get_database_service()
    await db_service.initialize()
    
    # Auto-bootstrap if database is empty
    await auto_bootstrap(db_service)
    
    print("✅ Application started successfully!")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down application...")
    db_service = get_database_service()
    await db_service.close()
    print("✅ Application shutdown complete!")

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add authentication middleware (handles JWT for all protected routes)
auth_service = AuthService()
app.add_middleware(AuthenticationMiddleware, auth_service=auth_service)

# Include API routers
# Public endpoints (no authentication required) - Only JWT auth
app.include_router(public_auth.router, prefix="/apis/public", tags=["Public Auth"])

# All other endpoints require authentication (handled by middleware)
app.include_router(posts.router, prefix="/apis/posts", tags=["Posts"])
app.include_router(users.router, prefix="/apis/users", tags=["Users"])
app.include_router(tags.router, prefix="/apis/tags", tags=["Tags"])
app.include_router(authors.router, prefix="/apis/authors", tags=["Authors"])
app.include_router(reactions.router, prefix="/apis/reactions", tags=["Reactions"])
app.include_router(events.router, prefix="/apis/events", tags=["Events"])

app.include_router(comments.router, prefix="/apis/comments", tags=["Comments"])
app.include_router(stats.router, prefix="/apis/stats", tags=["Statistics"])

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    db_service = get_database_service()
    try:
        await db_service.ping()
        return {
            "status": "healthy",
            "database": settings.database_type,
            "version": settings.app_version
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": settings.database_type,
            "error": str(e),
            "version": settings.app_version
        }

# Mount static files (React app)
app_path = Path("app")
if app_path.exists():
    app.mount("/static", StaticFiles(directory="app", html=True), name="static")
    
    # Serve React app for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_react_app(request: Request, full_path: str):
        """
        Serve React app for all routes that don't start with /api
        This enables client-side routing to work properly
        """
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        index_file = app_path / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        else:
            return {"error": "Frontend not built. Run the deploy script first."}

if __name__ == "__main__":
    import uvicorn
    
    # Production-ready uvicorn configuration
    uvicorn_config = {
        "app": "main:app",
        "host": settings.host,
        "port": settings.port,
        "reload": settings.debug,  # Only reload in development
        "workers": 1 if settings.debug else 4,  # Multiple workers in production
        "log_level": "debug" if settings.debug else "info",
        "access_log": True,
        "use_colors": settings.debug,
    }
    
    # Add SSL support if certificates are available
    if os.path.exists("ssl/cert.pem") and os.path.exists("ssl/key.pem"):
        uvicorn_config.update({
            "ssl_keyfile": "ssl/key.pem",
            "ssl_certfile": "ssl/cert.pem"
        })
    
    uvicorn.run(**uvicorn_config)
