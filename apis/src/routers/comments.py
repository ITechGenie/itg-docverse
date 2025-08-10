"""
Comments API Router
Handles all comment-related endpoints (requires authentication)
"""

from typing import List, Dict, Any
import uuid
from fastapi import APIRouter, HTTPException, Depends, Query

from ..models.comment import Comment, CommentCreate, CommentUpdate, CommentPublic
from ..services.database.factory import DatabaseServiceFactory
from ..services.database.base import DatabaseService
from ..middleware.dependencies import get_current_user_from_middleware

router = APIRouter()

# Global database service
db_service = DatabaseServiceFactory.create_service()

async def get_db_service() -> DatabaseService:
    """Dependency to get database service"""
    if not hasattr(db_service, 'initialized') or not db_service.initialized:
        await db_service.initialize()
    return db_service

@router.get("/", response_model=List[CommentPublic])
async def get_all_comments(
    skip: int = Query(0, ge=0, description="Number of comments to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of comments to return"),
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get all comments with pagination (requires authentication)"""
    try:
        # For now, return empty list since MockService doesn't have get_all_comments
        # This will be implemented when we have proper database services
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching comments: {str(e)}")

@router.get("/post/{post_id}", response_model=List[CommentPublic])
async def get_comments_by_post(
    post_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get all comments for a specific post (requires authentication)"""
    try:
        comments_data = await db.get_comments_by_post(post_id)
        comments = []
        for comment_dict in comments_data:
            comment = CommentPublic(
                id=comment_dict['id'],
                post_id=comment_dict['post_id'],
                author_id=comment_dict['author_id'],
                author_name=comment_dict.get('display_name'),  # Use display_name from joined user data
                author_username=comment_dict.get('username'),  # Use username from joined user data
                content=comment_dict['content'],
                parent_id=comment_dict.get('parent_discussion_id'),
                like_count=comment_dict.get('like_count', 0),
                is_edited=comment_dict.get('is_edited', False),
                created_at=comment_dict['created_ts'],
                updated_at=comment_dict.get('updated_ts', comment_dict['created_ts'])
            )
            comments.append(comment)
        return comments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching comments: {str(e)}")

@router.get("/{comment_id}", response_model=CommentPublic)
async def get_comment(
    comment_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get a specific comment by ID (requires authentication)"""
    try:
        comment_dict = await db.get_comment_by_id(comment_id)
        if not comment_dict:
            raise HTTPException(status_code=404, detail="Comment not found")
        return CommentPublic(
            id=comment_dict['id'],
            post_id=comment_dict['post_id'],
            author_id=comment_dict['author_id'],
            author_name=comment_dict.get('display_name'),  # Use display_name from joined user data
            author_username=comment_dict.get('username'),  # Use username from joined user data
            content=comment_dict['content'],
            parent_id=comment_dict.get('parent_discussion_id'),
            like_count=comment_dict.get('like_count', 0),
            is_edited=comment_dict.get('is_edited', False),
            created_at=comment_dict['created_ts'],
            updated_at=comment_dict.get('updated_ts', comment_dict['created_ts'])
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching comment: {str(e)}")

@router.post("/", response_model=CommentPublic)
async def create_comment(
    comment_data: CommentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Create a new comment (requires authentication)"""
    try:
        # Use authenticated user as author
        author_id = current_user.get("user_id")
        comment_id = str(uuid.uuid4())
        
        # Create comment data dictionary for the database service
        comment_dict = {
            "id": comment_id,
            "post_id": comment_data.post_id,
            "author_id": author_id,
            "content": comment_data.content,
            "parent_discussion_id": comment_data.parent_id
        }
        
        created_id = await db.create_comment(comment_dict)
        
        # Fetch the created comment to return it
        created_comment_dict = await db.get_comment_by_id(created_id)
        if not created_comment_dict:
            raise HTTPException(status_code=500, detail="Failed to retrieve created comment")
            
        return CommentPublic(
            id=created_comment_dict['id'],
            post_id=created_comment_dict['post_id'],
            author_id=created_comment_dict['author_id'],
            author_name=created_comment_dict.get('display_name'),  # Use display_name from joined user data
            author_username=created_comment_dict.get('username'),  # Use username from joined user data
            content=created_comment_dict['content'],
            parent_id=created_comment_dict.get('parent_discussion_id'),
            like_count=created_comment_dict.get('like_count', 0),
            is_edited=created_comment_dict.get('is_edited', False),
            created_at=created_comment_dict['created_ts'],
            updated_at=created_comment_dict.get('updated_ts', created_comment_dict['created_ts'])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating comment: {str(e)}")

@router.put("/{comment_id}", response_model=CommentPublic)
async def update_comment(
    comment_id: str,
    comment_data: CommentUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Update a comment (requires authentication and ownership)"""
    try:
        # Check if comment exists
        comment = await db.get_comment_by_id(comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        # Check if user owns the comment
        if comment.author_id != current_user.get("user_id"):
            raise HTTPException(status_code=403, detail="Not authorized to update this comment")
        
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
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Delete a comment (requires authentication and ownership)"""
    try:
        # Check if comment exists and user owns it
        comment = await db.get_comment_by_id(comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        if comment.author_id != current_user.get("user_id"):
            raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
        
        success = await db.delete_comment(comment_id)
        if not success:
            raise HTTPException(status_code=404, detail="Comment not found")
        return {"message": "Comment deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting comment: {str(e)}")
