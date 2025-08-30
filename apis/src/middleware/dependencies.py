"""
Authentication Dependencies
Provides dependency injection for authenticated routes
"""

from fastapi import Request, HTTPException, status
from typing import Dict, Any
from ..auth.jwt_service import auth_service

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

def has_role(user: Dict[str, Any], role: str) -> bool:
    """
    Check if the user has the specified role
    """
    user_roles = user.get('roles', [])
    return auth_service.has_role(user_roles, role)

def has_permission(user: Dict[str, Any], permission: str) -> bool:
    """
    Check if the user has the specified permission
    """
    user_permissions = user.get('permissions', [])
    return auth_service.has_permission(user_permissions, permission)

def require_role(role: str):
    """
    Dependency factory for requiring specific role
    """
    def role_checker(current_user: Dict[str, Any] = None) -> Dict[str, Any]:
        if not current_user or not has_role(current_user, role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' required"
            )
        return current_user
    return role_checker

def require_permission(permission: str):
    """
    Dependency factory for requiring specific permission
    """
    def permission_checker(current_user: Dict[str, Any] = None) -> Dict[str, Any]:
        if not current_user or not has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required"
            )
        return current_user
    return permission_checker