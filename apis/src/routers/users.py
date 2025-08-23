"""
Users API Router  
Handles all user-related endpoints (requires authentication)
"""

from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query

from ..models.user import User, UserCreate, UserUpdate, UserPublic
from ..services.database.factory import DatabaseServiceFactory
from ..services.database.base import DatabaseService
from ..middleware.dependencies import get_current_user_from_middleware

router = APIRouter()

async def get_db_service() -> DatabaseService:
    """Dependency to get database service - using singleton pattern"""
    return DatabaseServiceFactory.create_service()

@router.get("/", response_model=List[UserPublic])
async def get_users(
    skip: int = Query(0, ge=0, description="Number of users to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of users to return"),
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get users with pagination (requires authentication)"""
    try:
        users = await db.get_users(skip=skip, limit=limit)
        return [UserPublic(**user) for user in users]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")

@router.get("/{user_id}", response_model=UserPublic)
async def get_user(
    user_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get a specific user by ID (requires authentication)"""
    try:

        user = None
        if("me" == user_id):
            user_id = current_user.get("user_id")

        user = await db.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user stats
        user_stats = await db.get_user_stats(user['id'])
        if not user_stats:
            user_stats = {"posts_count": 0, "comments_count": 0, "tags_followed": 0}
        
        # Build the response with stats
        user_response = {
            "id": user['id'],
            "username": user['username'],
            "display_name": user['display_name'],
            "bio": user.get('bio', ''),
            "location": user.get('location', ''),
            "website": user.get('website', ''),
            "avatar_url": user.get('avatar_url', ''),
            "post_count": user_stats.get('posts_count', 0),
            "comment_count": user_stats.get('comments_count', 0),
            "is_verified": user.get('is_verified', False),
            "created_at": user['created_ts']
        }
        
        return UserPublic(**user_response)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")

@router.get("/username/{username}", response_model=UserPublic)
async def get_user_by_username(
    username: str,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get a specific user by username (requires authentication)"""
    try:
        user = await db.get_user_by_username(username)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user stats
        user_stats = await db.get_user_stats(user['id'])
        if not user_stats:
            user_stats = {"posts_count": 0, "comments_count": 0, "tags_followed": 0}
        
        # Build the response with stats
        user_response = {
            "id": user['id'],
            "username": user['username'],
            "display_name": user['display_name'],
            "bio": user.get('bio', ''),
            "location": user.get('location', ''),
            "website": user.get('website', ''),
            "avatar_url": user.get('avatar_url', ''),
            "post_count": user_stats.get('posts_count', 0),
            "comment_count": user_stats.get('comments_count', 0),
            "is_verified": user.get('is_verified', False),
            "created_at": user['created_ts']
        }
        
        return UserPublic(**user_response)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")

@router.post("/", response_model=UserPublic)
async def create_user(
    user_data: UserCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Create a new user (requires authentication)"""
    try:
        # In a real app, we'd hash the password here
        user = User(
            **user_data.model_dump(exclude={"password"}),
            password_hash=f"hashed_{user_data.password}"  # Mock hashing
        )
        
        created_user = await db.create_user(user)
        return UserPublic(**created_user.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

@router.post("/{user_id}", response_model=UserPublic)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Update a user (requires authentication and ownership)"""
    try:
        # Check if user exists
        user = await db.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user is updating their own profile
        if user_id != current_user.get("user_id"):
            raise HTTPException(status_code=403, detail="Not authorized to update this user")
        
        # Apply updates
        updates = {k: v for k, v in user_data.model_dump().items() if v is not None}
        for key, value in updates.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        # Mock update method (since our abstract interface doesn't have update_user)
        # In practice, we'd implement this in the database service
        return UserPublic(**user.model_dump())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")
