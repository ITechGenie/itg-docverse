"""
Authentication Middleware
Handles JWT authentication for all protected routes
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import jwt
from datetime import datetime

from ..auth.jwt_service import AuthService

class AuthenticationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle JWT authentication for protected routes
    """
    
    def __init__(self, app, auth_service: AuthService):
        super().__init__(app)
        self.auth_service = auth_service
        
        # Public routes that don't require authentication
        self.public_routes = {
            "/docs",
            "/redoc", 
            "/openapi.json",
            "/api/health",
            "/apis/public",  # All public auth routes
        }
        
        # Static files and frontend routes
        self.public_prefixes = [
            "/static",
            "/favicon.ico",
            "/.well-known",
        ]
    
    def is_public_route(self, path: str) -> bool:
        """Check if the route is public (doesn't require authentication)"""
        
        # Check exact matches
        if path in self.public_routes:
            return True
            
        # Check if path starts with public prefixes
        for prefix in self.public_prefixes:
            if path.startswith(prefix):
                return True
                
        # Check if path starts with public API routes
        if path.startswith("/apis/public"):
            return True
            
        # Frontend routes (non-API) are public
        if not path.startswith("/api") and not path.startswith("/apis"):
            return True
            
        return False
    
    async def dispatch(self, request: Request, call_next: Callable):
        """Process the request and handle authentication"""
        
        # Skip authentication for public routes
        if self.is_public_route(request.url.path):
            return await call_next(request)
        
        # Extract JWT token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Missing or invalid authorization header"}
            )
        
        token = auth_header.split(" ")[1]
        
        try:
            # Validate token and get user info
            user_data = await self.auth_service.validate_token(token)
            if not user_data:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Invalid or expired token"}
                )
            
            # Add user data to request state
            request.state.current_user = user_data
            
            # Process the request
            response = await call_next(request)
            return response
            
        except jwt.ExpiredSignatureError:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Token has expired"}
            )
        except jwt.InvalidTokenError:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid token"}
            )
        except HTTPException as e:
            # Handle HTTPException from JWT service
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail}
            )
        except Exception as e:
            # Log the actual error for troubleshooting
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": f"Authentication error: {str(e)}"}
            )
