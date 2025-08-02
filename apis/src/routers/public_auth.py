"""
Public Authentication API Router
Handles authentication endpoints that don't require JWT tokens
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional

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
async def authenticate():
    """
    Public authentication endpoint
    Returns hardcoded user with JWT token for ITG DocVerse hackathon
    """
    try:
        # Hardcoded user as requested
        user_id = "itg-docverse"
        username = "ITG DocVerse User"
        
        # Generate JWT token with 4 hours expiry
        token = auth_service.generate_token(
            user_id=user_id,
            additional_claims={
                "username": username,
                "role": "user",
                "permissions": ["read", "write", "create", "update"]
            }
        )
        
        return LoginResponse(
            access_token=token,
            token_type="bearer",
            expires_in=4 * 60 * 60,  # 4 hours in seconds
            user_id=user_id,
            username=username
        )
        
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
        payload = auth_service.validate_token(token)
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
