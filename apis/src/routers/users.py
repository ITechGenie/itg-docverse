"""
Users API Router
Handles all user-related endpoints
"""

from typing import List
from fastapi import APIRouter, HTTPException, Depends, Query

from ..models.user import User, UserCreate, UserUpdate, UserPublic
from ..services.database.factory import DatabaseServiceFactory
from ..services.database.base import DatabaseService

router = APIRouter(prefix="/api/users", tags=["users"])

# Global database service
db_service = DatabaseServiceFactory.create_service()

async def get_db_service() -> DatabaseService:
    """Dependency to get database service"""
    if not hasattr(db_service, 'initialized') or not db_service.initialized:
        await db_service.initialize()
    return db_service

@router.get("/", response_model=List[UserPublic])
async def get_users(
    skip: int = Query(0, ge=0, description="Number of users to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of users to return"),
    db: DatabaseService = Depends(get_db_service)
):
    """Get users with pagination"""
    try:
        users = await db.get_users(skip=skip, limit=limit)
        return [UserPublic(**user.model_dump()) for user in users]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")

@router.get("/{user_id}", response_model=UserPublic)
async def get_user(
    user_id: str,
    db: DatabaseService = Depends(get_db_service)
):
    """Get a specific user by ID"""
    try:
        user = await db.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserPublic(**user.model_dump())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")

@router.get("/username/{username}", response_model=UserPublic)
async def get_user_by_username(
    username: str,
    db: DatabaseService = Depends(get_db_service)
):
    """Get a specific user by username"""
    try:
        user = await db.get_user_by_username(username)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserPublic(**user.model_dump())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")

@router.post("/", response_model=UserPublic)
async def create_user(
    user_data: UserCreate,
    db: DatabaseService = Depends(get_db_service)
):
    """Create a new user"""
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

@router.put("/{user_id}", response_model=UserPublic)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: DatabaseService = Depends(get_db_service)
):
    """Update a user"""
    try:
        # Check if user exists
        user = await db.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
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
