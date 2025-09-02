"""
ITG DocVerse API
Main FastAPI application with JWT Authentication Middleware
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.responses import HTMLResponse
from pathlib import Path
import uvicorn
import os
import logging

from src.config.settings import get_settings
from src.routers import posts, users, tags, comments, stats, reactions, authors, events, search, files
from src.routers import public_auth, public_files
from src.database.connection import get_database_service
from src.middleware.auth import AuthenticationMiddleware
from src.middleware.request_context import RequestContextMiddleware
from src.auth.jwt_service import AuthService
from src.services.database.migration import DatabaseMigration
from bootstrap_data import BootstrapData

# Initialize settings
settings = get_settings()
logger = logging.getLogger(__name__)

redirect_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta http-equiv="refresh" content="0; url=/content/">
        <title>ITG DocVerse</title>
    </head>
    <body>
        <p>Redirecting to ITG DocVerse...</p>
        <script>window.location.href = '/content/';</script>
    </body>
    </html>
    """

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
                    # Convert Pydantic model to dict for database service
                    user_dict = user.model_dump() if hasattr(user, 'model_dump') else user.dict()
                    await db_service.create_user(user_dict)
                    created_count["users"] += 1
                except Exception as e:
                    logger.warning(f"User {user.username} might already exist: {e}")
            
            for tag in tags:
                try:
                    # Convert Pydantic model to dict for database service
                    tag_dict = tag.model_dump() if hasattr(tag, 'model_dump') else tag.dict()
                    await db_service.create_tag(tag_dict)
                    created_count["tags"] += 1
                except Exception as e:
                    logger.warning(f"Tag {tag.name} might already exist: {e}")
            
            for post in posts:
                try:
                    # Convert Pydantic model to dict for database service
                    post_dict = post.model_dump() if hasattr(post, 'model_dump') else post.dict()
                    await db_service.create_post(post_dict)
                    created_count["posts"] += 1
                except Exception as e:
                    logger.warning(f"Post {post.title[:30]} might already exist: {e}")
            
            for comment in comments:
                try:
                    # Convert Pydantic model to dict for database service
                    comment_dict = comment.model_dump() if hasattr(comment, 'model_dump') else comment.dict()
                    await db_service.create_comment(comment_dict)
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
    
    # Initialize database service (singleton)
    from src.services.database.factory import DatabaseServiceFactory
    db_service = await DatabaseServiceFactory.initialize_service()
    
    # Check migration configuration
    if settings.skip_migrations:
        print("⏭️  Database migrations SKIPPED (SKIP_MIGRATIONS=true)")
    else:
        # Check for database migrations
        print("🔍 Checking database version and migrations...")
        migration_success = await DatabaseMigration.initialize_or_migrate(db_service)
        
        if not migration_success:
            print("❌ Database migration failed! Application cannot start.")
            if settings.admin_only_migrations:
                print("💡 Hint: Migrations require admin privileges (ADMIN_ONLY_MIGRATIONS=true)")
                print("💡 Set SKIP_MIGRATIONS=true to start without auto-migration")
            raise RuntimeError("Database migration failed")
    
    # Check bootstrap configuration
    if settings.skip_bootstrap:
        print("⏭️  Sample data bootstrap SKIPPED (SKIP_BOOTSTRAP=true)")
    else:
        # Auto-bootstrap sample data if database is empty
        await auto_bootstrap(db_service)
    
    print("✅ Application started successfully!")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down application...")
    await DatabaseServiceFactory.close_service()
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

# Add request context middleware for logging
app.add_middleware(RequestContextMiddleware)

# Add authentication middleware (handles JWT for all protected routes)
auth_service = AuthService()
app.add_middleware(AuthenticationMiddleware, auth_service=auth_service)

# Include API routers
# Public endpoints (no authentication required) - Only JWT auth
app.include_router(public_auth.router, prefix="/apis/public", tags=["Public Auth"])
app.include_router(public_files.router, prefix="/files", tags=["Public Files"])

# All other endpoints require authentication (handled by middleware)
app.include_router(posts.router, prefix="/apis/posts", tags=["Posts"])
app.include_router(users.router, prefix="/apis/users", tags=["Users"])
app.include_router(tags.router, prefix="/apis/tags", tags=["Tags"])
app.include_router(authors.router, prefix="/apis/authors", tags=["Authors"])
app.include_router(reactions.router, prefix="/apis/reactions", tags=["Reactions"])
app.include_router(events.router, prefix="/apis/events", tags=["Events"])
app.include_router(search.router, prefix="/apis/search", tags=["Search"])
app.include_router(files.router, prefix="/apis/files", tags=["Files"]) 
app.include_router(comments.router, prefix="/apis/comments", tags=["Comments"])
app.include_router(stats.router, prefix="/apis/stats", tags=["Statistics"])

# Health check endpoint
@app.get("/apis/health")
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
static_dir = Path(__file__).resolve().parent / "static"
if static_dir.exists():
    # Mount static assets (CSS, JS, images) at /static
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
    
    # Serve React app directly at root
    @app.get("/", include_in_schema=False)
    async def serve_root():
        return HTMLResponse(content=redirect_html)
    
    # Serve React app at /content
    @app.get("/content", include_in_schema=False)
    async def serve_content():
        return HTMLResponse(content=redirect_html)

    # Catch-all for /content/* routes to serve React SPA
    @app.get("/content/{full_path:path}", include_in_schema=False)
    async def serve_content_paths(full_path: str):
        """Serve React SPA for all /content/* routes"""
        # First check if this path corresponds to an actual file in the static directory
        potential_static_file = static_dir / full_path
        if potential_static_file.exists() and potential_static_file.is_file():
            # This is an actual asset file, serve it directly
            return FileResponse(potential_static_file)
        
        # Not a static file, serve the SPA index.html for client-side routing
        index_file = static_dir / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"error": "Frontend not built. Place index.html under the 'static' folder."}
    
    # Legacy catch-all for backward compatibility (optional)
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_legacy_routes(request: Request, full_path: str):
        """
        Legacy fallback for any other routes that don't start with /apis or /content
        Redirects to /content for SPA routes
        """
        if full_path.startswith("apis/") or full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("redoc"):
            raise HTTPException(status_code=404, detail="API endpoint not found")

        # Redirect old routes to /content/
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="/content/", status_code=302)

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
