"""
Authentication Dependencies
FastAPI dependencies for JWT token validation
"""

from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .jwt_service import auth_service

# Security scheme for JWT bearer tokens
security = HTTPBearer(auto_error=False)

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """
    Dependency to get current user from JWT token
    Checks x-auth-user header or Authorization header
    """
    token = None
    
    # Check x-auth-user header first (as per requirement)
    x_auth_user = request.headers.get("x-auth-user")
    if x_auth_user:
        token = x_auth_user
    elif credentials:
        token = credentials.credentials
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Validate token and return user data
    payload = auth_service.validate_token(token)
    return payload

async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[Dict[str, Any]]:
    """
    Optional dependency to get current user from JWT token
    Returns None if no token or invalid token (for public endpoints)
    """
    token = None
    
    # Check x-auth-user header first
    x_auth_user = request.headers.get("x-auth-user")
    if x_auth_user:
        token = x_auth_user
    elif credentials:
        token = credentials.credentials
    
    if not token:
        return None
    
    try:
        payload = auth_service.validate_token(token)
        return payload
    except HTTPException:
        return None
