"""
Comments API Router
Handles all comment-related endpoints
"""

from typing import List
from fastapi import APIRouter, HTTPException, Depends, Query

from ..models.comment import Comment, CommentCreate, CommentUpdate, CommentPublic
from ..services.database.factory import DatabaseServiceFactory
from ..services.database.base import DatabaseService

router = APIRouter(prefix="/api/comments", tags=["comments"])

# Global database service
db_service = DatabaseServiceFactory.create_service()

async def get_db_service() -> DatabaseService:
    """Dependency to get database service"""
    if not hasattr(db_service, 'initialized') or not db_service.initialized:
        await db_service.initialize()
    return db_service

@router.get("/post/{post_id}", response_model=List[CommentPublic])
async def get_comments_by_post(
    post_id: str,
    db: DatabaseService = Depends(get_db_service)
):
    """Get all comments for a specific post"""
    try:
        comments = await db.get_comments_by_post(post_id)
        return [CommentPublic(**comment.model_dump()) for comment in comments]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching comments: {str(e)}")

@router.get("/{comment_id}", response_model=CommentPublic)
async def get_comment(
    comment_id: str,
    db: DatabaseService = Depends(get_db_service)
):
    """Get a specific comment by ID"""
    try:
        comment = await db.get_comment_by_id(comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        return CommentPublic(**comment.model_dump())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching comment: {str(e)}")

@router.post("/", response_model=CommentPublic)
async def create_comment(
    comment_data: CommentCreate,
    db: DatabaseService = Depends(get_db_service)
):
    """Create a new comment"""
    try:
        # For demo, we'll use a fixed author ID
        # In a real app, this would come from authentication
        author_id = "user-1"
        
        comment = Comment(
            **comment_data.model_dump(),
            author_id=author_id
        )
        
        created_comment = await db.create_comment(comment)
        return CommentPublic(**created_comment.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating comment: {str(e)}")

@router.put("/{comment_id}", response_model=CommentPublic)
async def update_comment(
    comment_id: str,
    comment_data: CommentUpdate,
    db: DatabaseService = Depends(get_db_service)
):
    """Update a comment"""
    try:
        # Check if comment exists
        comment = await db.get_comment_by_id(comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        # Apply updates
        comment.content = comment_data.content
        comment.is_edited = True
        
        # Mock update (in practice, we'd implement update_comment in database service)
        return CommentPublic(**comment.model_dump())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating comment: {str(e)}")

@router.delete("/{comment_id}")
async def delete_comment(
    comment_id: str,
    db: DatabaseService = Depends(get_db_service)
):
    """Delete a comment"""
    try:
        success = await db.delete_comment(comment_id)
        if not success:
            raise HTTPException(status_code=404, detail="Comment not found")
        return {"message": "Comment deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting comment: {str(e)}")
