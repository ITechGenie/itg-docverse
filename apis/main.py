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

from src.config.settings import get_settings
from src.routers import posts, users, tags, comments, stats
from src.routers import public_auth
from src.database.connection import get_database_service
from src.middleware.auth import AuthenticationMiddleware
from src.auth.jwt_service import AuthService

# Initialize settings
settings = get_settings()

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
