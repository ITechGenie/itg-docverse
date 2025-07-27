"""
Reactions API Router
Handles reaction-related endpoints for posts
"""

from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

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

class ReactionRequest(BaseModel):
    reaction_type: str

class ReactionResponse(BaseModel):
    id: str
    post_id: str
    user_id: str
    reaction_type: str
    created_ts: str

@router.post("/post/{post_id}/add", response_model=ReactionResponse)
async def add_reaction_to_post(
    post_id: str,
    req: ReactionRequest,
    db: DatabaseService = Depends(get_db_service),
    user: Dict[str, Any] = Depends(get_current_user_from_middleware)
):
    """Add a reaction to a post"""
    try:
        reaction = await db.add_reaction(post_id, user.get("user_id"), req.reaction_type)
        return ReactionResponse(**reaction)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding reaction: {str(e)}")

@router.delete("/post/{post_id}/remove", response_model=Dict[str, bool])
async def remove_reaction_from_post(
    post_id: str,
    req: ReactionRequest,
    db: DatabaseService = Depends(get_db_service),
    user: Dict[str, Any] = Depends(get_current_user_from_middleware)
):
    """Remove a reaction from a post"""
    try:
        success = await db.remove_reaction(post_id, user.get("user_id"), req.reaction_type)
        if not success:
            raise HTTPException(status_code=404, detail="Reaction not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing reaction: {str(e)}")

@router.get("/post/{post_id}", response_model=List[Dict[str, Any]])
async def get_post_reactions(
    post_id: str,
    db: DatabaseService = Depends(get_db_service)
):
    """Get all reactions for a post"""
    try:
        reactions = await db.get_post_reactions(post_id)
        return reactions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching reactions: {str(e)}")
