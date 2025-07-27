"""
Posts API Router
Handles all post-related endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query

from ..models.post import Post, PostCreate, PostUpdate, PostPublic, PostType, PostStatus
from ..services.database.factory import DatabaseServiceFactory
from ..services.database.base import DatabaseService

router = APIRouter(prefix="/api/posts", tags=["posts"])

# Global database service
db_service = DatabaseServiceFactory.create_service()

async def get_db_service() -> DatabaseService:
    """Dependency to get database service"""
    if not hasattr(db_service, 'initialized') or not db_service.initialized:
        await db_service.initialize()
    return db_service

@router.get("/", response_model=List[PostPublic])
async def get_posts(
    skip: int = Query(0, ge=0, description="Number of posts to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of posts to return"),
    author_id: Optional[str] = Query(None, description="Filter by author ID"),
    tag_id: Optional[str] = Query(None, description="Filter by tag ID"),
    post_type: Optional[PostType] = Query(None, description="Filter by post type"),
    status: PostStatus = Query(PostStatus.PUBLISHED, description="Filter by status"),
    db: DatabaseService = Depends(get_db_service)
):
    """Get posts with filtering and pagination"""
    try:
        posts = await db.get_posts(
            skip=skip,
            limit=limit,
            author_id=author_id,
            tag_id=tag_id,
            post_type=post_type,
            status=status
        )
        return [PostPublic(**post.model_dump()) for post in posts]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching posts: {str(e)}")

@router.get("/{post_id}", response_model=PostPublic)
async def get_post(
    post_id: str,
    db: DatabaseService = Depends(get_db_service)
):
    """Get a specific post by ID"""
    try:
        post = await db.get_post_by_id(post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        return PostPublic(**post.model_dump())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching post: {str(e)}")

@router.post("/", response_model=PostPublic)
async def create_post(
    post_data: PostCreate,
    db: DatabaseService = Depends(get_db_service)
):
    """Create a new post"""
    try:
        # For demo, we'll use a fixed author ID
        # In a real app, this would come from authentication
        author_id = "user-1"
        
        post = Post(
            **post_data.model_dump(),
            author_id=author_id
        )
        
        created_post = await db.create_post(post)
        return PostPublic(**created_post.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating post: {str(e)}")

@router.put("/{post_id}", response_model=PostPublic)
async def update_post(
    post_id: str,
    post_data: PostUpdate,
    db: DatabaseService = Depends(get_db_service)
):
    """Update a post"""
    try:
        updates = {k: v for k, v in post_data.model_dump().items() if v is not None}
        updated_post = await db.update_post(post_id, updates)
        
        if not updated_post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        return PostPublic(**updated_post.model_dump())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating post: {str(e)}")

@router.delete("/{post_id}")
async def delete_post(
    post_id: str,
    db: DatabaseService = Depends(get_db_service)
):
    """Delete a post"""
    try:
        success = await db.delete_post(post_id)
        if not success:
            raise HTTPException(status_code=404, detail="Post not found")
        return {"message": "Post deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting post: {str(e)}")

@router.get("/search/", response_model=List[PostPublic])
async def search_posts(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=100, description="Number of results to return"),
    db: DatabaseService = Depends(get_db_service)
):
    """Search posts by content"""
    try:
        posts = await db.search_posts(query=q, limit=limit)
        return [PostPublic(**post.model_dump()) for post in posts]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching posts: {str(e)}")
