"""
Public Authentication API Router
Handles authentication endpoints that don't require JWT tokens
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any

from ..auth.jwt_service import auth_service

router = APIRouter()

class LoginRequest(BaseModel):
    """Login request model"""
    username: Optional[str] = None
    password: Optional[str] = None
    
class LoginResponse(BaseModel):
    """Login response model"""
    access_token: str
    token_type: str
    expires_in: int
    user_id: str
    username: str

@router.post("/auth", response_model=LoginResponse)
async def authenticate(login_request: LoginRequest):
    """
    Public authentication endpoint
    Login with username as both username and password
    """
    from ..services.database.factory import DatabaseServiceFactory
    
    try:
        username = login_request.username
        password = login_request.password
        
        # For now, use username as password (simple auth for hackathon)
        if not username or username != password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials - use username as password"
            )
        
        # Get database service to check if user exists
        db_service = DatabaseServiceFactory.create_service()
        
        # Try to find user by username
        user = await db_service.get_user_by_username(username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        user_id = user['id']
        display_name = user['display_name']
        
        # Fetch user roles
        user_roles = await db_service.get_user_roles(user_id)
        
        # Extract roles and permissions
        roles = []
        all_permissions = set()
        
        for role in user_roles:
            roles.append(role['role_id'])
            
            # Parse permissions from JSON string if available
            if role.get('permissions'):
                try:
                    import json
                    role_permissions = json.loads(role['permissions'])
                    if isinstance(role_permissions, list):
                        all_permissions.update(role_permissions)
                except json.JSONDecodeError:
                    # If permissions is not valid JSON, treat as single permission
                    all_permissions.add(role['permissions'])
        
        # Default permissions if no roles assigned
        if not all_permissions:
            all_permissions = {"read"}
        
        # Generate JWT token with 4 hours expiry
        token = auth_service.generate_token(
            user_id=user_id,
            roles=roles,
            additional_claims={
                "username": username,
                "display_name": display_name,
                "email": user.get('email', f"{username}@itgdocverse.com"),
                "permissions": list(all_permissions)
            }
        )
        
        return LoginResponse(
            access_token=token,
            token_type="bearer",
            expires_in=4 * 60 * 60,  # 4 hours in seconds
            user_id=user_id,
            username=display_name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )

@router.post("/logout")
async def logout(token: str):
    """
    Logout endpoint to revoke token
    """
    try:
        # Extract user_id from token for revocation
        payload = auth_service.validate_token(token)
        user_id = payload.get("user_id")
        
        # Revoke the specific token
        success = auth_service.revoke_token(user_id, token)
        
        if success:
            return {"message": "Successfully logged out"}
        else:
            return {"message": "Logout completed (token may have already expired)"}
            
    except HTTPException as e:
        # Token is invalid/expired anyway, so logout is successful
        return {"message": "Logout completed"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}"
        )

@router.get("/validate")
async def validate_token(token: str):
    """
    Public endpoint to validate a token
    """
    try:
        payload = await auth_service.validate_token(token)
        return {
            "valid": True,
            "user_id": payload.get("user_id"),
            "username": payload.get("username"),
            "expires_at": payload.get("exp")
        }
    except HTTPException as e:
        return {
            "valid": False,
            "error": e.detail
        }


