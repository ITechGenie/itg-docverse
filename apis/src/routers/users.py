"""
Users API Router  
Handles all user-related endpoints (requires authentication)
"""

from typing import List, Dict, Any

from fastapi import APIRouter, HTTPException, Depends, Query

from ..utils.logger import get_logger

from ..models.user import User, UserCreate, UserUpdate, UserPublic
from ..services.database.factory import DatabaseServiceFactory
from ..services.database.base import DatabaseService
from ..middleware.dependencies import get_current_user_from_middleware

router = APIRouter()

# Initialize logger - now just like log4j!
logger = get_logger("PostsAPI", level="DEBUG", json_format=False)

async def get_db_service() -> DatabaseService:
    """Dependency to get database service - using singleton pattern"""
    return DatabaseServiceFactory.create_service()

async def get_actual_user_stats(db: DatabaseService, user_id: str) -> Dict[str, int]:
    """Get actual user statistics by querying the database directly"""
    try:
        # Get posts count
        posts_count_result = await db.execute_query(
            "SELECT COUNT(*) as count FROM posts WHERE author_id = ? AND status != 'deleted'",
            (user_id,)
        )
        posts_count = posts_count_result[0]['count'] if posts_count_result else 0
        
        # Get comments count from post_discussions
        comments_count_result = await db.execute_query(
            "SELECT COUNT(*) as count FROM post_discussions WHERE author_id = ? AND is_deleted = FALSE",
            (user_id,)
        )
        comments_count = comments_count_result[0]['count'] if comments_count_result else 0
        
        # Get reactions count (reactions given by the user)
        reactions_count_result = await db.execute_query(
            "SELECT COUNT(*) as count FROM reactions WHERE user_id = ?",
            (user_id,)
        )
        reactions_count = reactions_count_result[0]['count'] if reactions_count_result else 0
        
        logger.debug(f"User {user_id} actual stats: {posts_count} posts, {comments_count} comments, {reactions_count} reactions")
        
        return {
            "posts_count": posts_count,
            "comments_count": comments_count,
            "reactions_count": reactions_count,
            "tags_followed": 0  # We can implement this later if needed
        }
    except Exception as e:
        logger.error(f"Error getting actual user stats for {user_id}: {str(e)}")
        return {"posts_count": 0, "comments_count": 0, "reactions_count": 0, "tags_followed": 0}

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
        logger.debug(f"Fetched {len(users)} users from database")

        # Ensure each user dict has a non-None 'roles' list so Pydantic validation
        # for UserPublic (which expects a list) does not fail when DB returns None.
        processed = []
        for user in users:
            # Make a shallow copy in case the DB returns an immutable mapping
            u = dict(user)

            # Normalize roles: DB may return None, a comma-separated string
            # (string_agg), or already a list. Ensure we always pass a list
            # to Pydantic/UserPublic.
            raw_roles = u.get('roles')
            if raw_roles is None:
                roles_list = []
            elif isinstance(raw_roles, str):
                # split CSV and trim whitespace; ignore empty items
                roles_list = [r.strip() for r in raw_roles.split(',') if r.strip()]
            elif isinstance(raw_roles, (list, tuple)):
                roles_list = list(raw_roles)
            else:
                # Fallback: try to coerce iterable -> list, else empty
                try:
                    roles_list = list(raw_roles)
                except Exception:
                    roles_list = []

            u['roles'] = roles_list
            u['created_at'] = u.get('created_ts')  # Map created_ts to created_at for UserPublic    
            processed.append(UserPublic(**u))

        return processed
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
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
        
        # Get user stats - use actual stats instead of cached user_stats table
        user_stats = await get_actual_user_stats(db, user['id'])
        
        # Get user roles - just extract role IDs for lightweight response
        user_roles_raw = await db.get_user_roles(user['id'])
        role_ids = [role['role_id'] for role in user_roles_raw if role.get('assignment_active', True)]
        
        logger.info(f"User roles for {user['username']} ({user['id']}): {role_ids}")

        # Build the response with stats and role IDs
        user_response = {
            "id": user['id'],
            "username": user['username'],
            "display_name": user['display_name'],
            "email": user['email'],
            "bio": user.get('bio', ''),
            "location": user.get('location', ''),
            "website": user.get('website', ''),
            "avatar_url": user.get('avatar_url', ''),
            "post_count": user_stats.get('posts_count', 0),
            "comment_count": user_stats.get('comments_count', 0),
            "reactions_count": user_stats.get('reactions_count', 0),
            "is_verified": user.get('is_verified', False),
            "roles": role_ids,
            "created_at": user['created_ts']
        }
        
        return UserPublic(**user_response)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")


@router.get("/roles", response_model=List[Dict[str, Any]])
async def list_role_types(
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """List available role types (requires authentication)"""
    try:
        # In the future, we might restrict to admins; for now require auth
        roles = await db.get_role_types()
        return roles
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching role types: {str(e)}")


@router.post("/{user_id}/roles", response_model=UserPublic)
async def update_user_roles(
    user_id: str,
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Update roles for a user. Payload: {"roles": ["role_admin", "role_user"]}
    Only admins may update other users' roles. Returns updated UserPublic."""
    try:
        # Authorization: allow if current user is admin or updating self
        requested_roles = payload.get('roles') or []

        is_admin = current_user.get('roles') and 'role_admin' in current_user.get('roles')
        if user_id != current_user.get('user_id') and not is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to update roles for other users")

        # Sync roles: assign requested roles, deactivate others
        # Fetch existing role_types to validate
        existing_roles = await db.get_role_types()
        valid_role_ids = {r['role_id'] for r in existing_roles}

        # Filter requested roles
        to_set = [r for r in requested_roles if r in valid_role_ids]

        # Get current assignments
        current_assignments = await db.get_user_roles(user_id)
        current_role_ids = {r['role_id'] for r in current_assignments}

        # Assign missing roles
        for role_id in to_set:
            if role_id not in current_role_ids:
                await db.assign_role_to_user(user_id, role_id, assigned_by=current_user.get('user_id'))

        # Remove roles not requested
        for role_id in current_role_ids:
            if role_id not in to_set:
                await db.remove_role_from_user(user_id, role_id)

        # Return updated user
        user = await db.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Recompute stats and roles like get_user does
        user_stats = await get_actual_user_stats(db, user['id'])
        user_roles_raw = await db.get_user_roles(user['id'])
        role_ids = [role['role_id'] for role in user_roles_raw if role.get('assignment_active', True)]

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
            "reactions_count": user_stats.get('reactions_count', 0),
            "is_verified": user.get('is_verified', False),
            "roles": role_ids,
            "created_at": user['created_ts']
        }

        return UserPublic(**user_response)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user roles: {str(e)}")

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
        
        logger.info(f"Fetched user by username: {username} -> ID: {user['id']}")
        # Get user stats - use actual stats instead of cached user_stats table
        user_stats = await get_actual_user_stats(db, user['id'])
        
        # Get user roles - just extract role IDs for lightweight response
        user_roles_raw = await db.get_user_roles(user['id'])
        role_ids = [role['role_id'] for role in user_roles_raw if role.get('assignment_active', True)]
        
        logger.info(f"User roles for {user['username']} ({user['id']}): {role_ids}")
        
        # Build the response with stats and role IDs
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
            "reactions_count": user_stats.get('reactions_count', 0),
            "is_verified": user.get('is_verified', False),
            "roles": role_ids,
            "created_at": user['created_ts']
        }
        
        return UserPublic(**user_response)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user by username: {str(e)}")
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
