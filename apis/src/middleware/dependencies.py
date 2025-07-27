"""
Authentication Dependencies
Provides dependency injection for authenticated routes
"""

from fastapi import Request, HTTPException, status
from typing import Dict, Any

def get_current_user_from_middleware(request: Request) -> Dict[str, Any]:
    """
    Get current user from middleware state
    This replaces the token validation dependency since middleware handles it
    """
    if not hasattr(request.state, 'current_user'):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    return request.state.current_user
