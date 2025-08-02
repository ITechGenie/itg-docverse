"""
Reactions API Router
Handles reaction-related endpoints for posts
"""

from typing import Dict, Any, List
from ..utils.logger import get_logger
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ..services.database.factory import DatabaseServiceFactory
from ..services.database.base import DatabaseService
from ..middleware.dependencies import get_current_user_from_middleware

router = APIRouter()

# Global database service
db_service = DatabaseServiceFactory.create_service()

# Initialize logger - now just like log4j!
logger = get_logger("PostsAPI", level="DEBUG", json_format=False)

async def get_db_service() -> DatabaseService:
    """Dependency to get database service"""
    if not hasattr(db_service, 'initialized') or not db_service.initialized:
        await db_service.initialize()
    return db_service

class ReactionRequest(BaseModel):
    reaction_type: str

class ReactionResponse(BaseModel):
    id: str
    target_id: str
    target_type: str = "post"  # Default to post
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

# Discussion/Comment Reaction Endpoints
@router.post("/discussion/{discussion_id}/add", response_model=ReactionResponse)
async def add_reaction_to_discussion(
    discussion_id: str,
    req: ReactionRequest,
    db: DatabaseService = Depends(get_db_service),
    user: Dict[str, Any] = Depends(get_current_user_from_middleware)
):
    """Add a reaction to a discussion/comment"""
    logger.debug(f"Adding reaction {req.reaction_type} to discussion {discussion_id} by user {user.get('user_id')}")
     
    try:
        reaction = await db.add_reaction(discussion_id, user.get("user_id"), req.reaction_type, target_type="discussion")
        logger.debug(f"Reaction added: {reaction}")
        return ReactionResponse(**reaction)
    except Exception as e:
        logger.error(f"Error adding reaction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error adding reaction: {str(e)}")

@router.delete("/discussion/{discussion_id}/remove", response_model=Dict[str, bool])
async def remove_reaction_from_discussion(
    discussion_id: str,
    req: ReactionRequest,
    db: DatabaseService = Depends(get_db_service),
    user: Dict[str, Any] = Depends(get_current_user_from_middleware)
):
    """Remove a reaction from a discussion/comment"""
    try:
        success = await db.remove_reaction(discussion_id, user.get("user_id"), req.reaction_type, target_type="discussion")
        if not success:
            raise HTTPException(status_code=404, detail="Reaction not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing reaction: {str(e)}")

@router.get("/discussion/{discussion_id}", response_model=List[Dict[str, Any]])
async def get_discussion_reactions(
    discussion_id: str,
    db: DatabaseService = Depends(get_db_service)
):
    """Get all reactions for a discussion/comment"""
    try:
        reactions = await db.get_discussion_reactions(discussion_id)
        return reactions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching reactions: {str(e)}")

@router.get("/favorites/tags", response_model=Dict[str, List[str]])
async def get_user_favorite_tags(
    db: DatabaseService = Depends(get_db_service),
    user: Dict[str, Any] = Depends(get_current_user_from_middleware)
):
    """Get user's favorite tags"""
    try:
        user_id = user.get("user_id")
        logger.debug(f"Fetching favorite tags for user: {user_id}")
        
        # Query to get favorite tag IDs for the user from reactions table (current state)
        query = """
        SELECT DISTINCT r.target_id
        FROM reactions r
        INNER JOIN event_types et ON r.event_type_id = et.id
        WHERE r.user_id = ? 
        AND et.id = 'event-favorite'
        AND r.target_type = 'tag'
        """
        
        logger.debug(f"Executing query: {query}")
        result = await db.execute_query(query, (user_id,))
        logger.debug(f"Query result: {result}")
        
        # Handle both dictionary and tuple result formats
        tag_ids = []
        if result:
            for row in result:
                if isinstance(row, dict):
                    tag_ids.append(row['target_id'])
                else:
                    tag_ids.append(row[0])
        
        logger.debug(f"Favorite tag IDs found: {tag_ids}")
        
        return {"tag_ids": tag_ids}
    except Exception as e:
        logger.error(f"Error fetching user favorite tags: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching favorite tags: {str(e)}")

@router.get("/debug/user-reactions")
async def debug_user_reactions(
    db: DatabaseService = Depends(get_db_service),
    user: Dict[str, Any] = Depends(get_current_user_from_middleware)
):
    """Debug endpoint to check user's events and reactions"""
    try:
        user_id = user.get("user_id")
        
        # Get all user_events for this user (where favorites are stored)
        events_query = "SELECT * FROM user_events WHERE user_id = ? LIMIT 10"
        user_events = await db.execute_query(events_query, (user_id,))
        
        # Get all reactions for this user
        reactions_query = "SELECT * FROM reactions WHERE user_id = ? LIMIT 10"
        user_reactions = await db.execute_query(reactions_query, (user_id,))
        
        # Get all event types
        et_query = "SELECT * FROM event_types"
        event_types = await db.execute_query(et_query)
        
        # Get favorite tag reactions specifically (current state)
        favorite_tags_query = """
        SELECT r.target_id, r.created_ts
        FROM reactions r
        INNER JOIN event_types et ON r.event_type_id = et.id
        WHERE r.user_id = ? 
        AND et.id = 'event-favorite'
        AND r.target_type = 'tag'
        """
        favorite_tags = await db.execute_query(favorite_tags_query, (user_id,))
        
        return {
            "user_id": user_id,
            "user_events": user_events if user_events else [],
            "user_reactions": user_reactions if user_reactions else [],
            "event_types": event_types if event_types else [],
            "favorite_tags": favorite_tags if favorite_tags else []
        }
    except Exception as e:
        logger.error(f"Debug error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tag/{tag_id}/toggle-favorite")
async def toggle_tag_favorite(
    tag_id: str,
    db: DatabaseService = Depends(get_db_service),
    user: Dict[str, Any] = Depends(get_current_user_from_middleware)
):
    """Toggle favorite status for a tag (convenience endpoint that handles both reactions and events)"""
    try:
        import uuid
        user_id = user.get("user_id")
        
        logger.info(f"Toggle favorite called for tag {tag_id} by user {user_id}")
        
        # Check if user already has this reaction
        existing_reactions = await db.get_reactions(tag_id, target_type="tag")
        user_reaction = None
        
        logger.debug(f"Found {len(existing_reactions)} existing reactions for tag {tag_id}")
        
        for reaction in existing_reactions:
            if reaction['user_id'] == user_id and reaction['reaction_type'] == 'event-favorite':
                user_reaction = reaction
                break
        
        if user_reaction:
            logger.info(f"Removing existing favorite for tag {tag_id} by user {user_id}")
            # Remove the favorite
            success = await db.remove_reaction(tag_id, user_id, 'event-favorite', target_type="tag")
            if success:
                # Log the unfavorite event
                event_data = {
                    'id': str(uuid.uuid4()),
                    'user_id': user_id,
                    'event_type_id': 'event-favorite',
                    'target_type': 'tag',
                    'target_id': tag_id,
                    'metadata': {'action': 'remove'}
                }
                await db.log_user_event(event_data)
            logger.info(f"Favorite removed for tag {tag_id}, success: {success}")
            return {"success": success, "is_favorited": False}
        else:
            logger.info(f"Adding new favorite for tag {tag_id} by user {user_id}")
            # Add the favorite
            reaction = await db.add_reaction(tag_id, user_id, 'event-favorite', target_type="tag")
            if reaction:
                # Log the favorite event
                event_data = {
                    'id': str(uuid.uuid4()),
                    'user_id': user_id,
                    'event_type_id': 'event-favorite',
                    'target_type': 'tag',
                    'target_id': tag_id,
                    'metadata': {'action': 'add'}
                }
                await db.log_user_event(event_data)
            logger.info(f"Favorite added for tag {tag_id}, reaction: {reaction}")
            return {"success": True, "is_favorited": True}
            
    except Exception as e:
        logger.error(f"Error toggling tag favorite: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error toggling tag favorite: {str(e)}")

@router.get("/tag/{tag_id}")
async def get_tag_reactions(
    tag_id: str,
    db: DatabaseService = Depends(get_db_service)
):
    """Get all reactions for a specific tag"""
    try:
        reactions = await db.get_reactions(tag_id, target_type="tag")
        logger.debug(f"Found {len(reactions)} reactions for tag {tag_id}: {reactions}")
        return reactions
    except Exception as e:
        logger.error(f"Error fetching tag reactions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching tag reactions: {str(e)}")

@router.post("/tag/{tag_id}/add", response_model=ReactionResponse)
async def add_reaction_to_tag(
    tag_id: str,
    req: ReactionRequest,
    db: DatabaseService = Depends(get_db_service),
    user: Dict[str, Any] = Depends(get_current_user_from_middleware)
):
    """Add a reaction to a tag"""
    try:
        reaction = await db.add_reaction(tag_id, user.get("user_id"), req.reaction_type, target_type="tag")
        return ReactionResponse(**reaction)
    except Exception as e:
        logger.error(f"Error adding reaction to tag: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error adding reaction: {str(e)}")

@router.delete("/tag/{tag_id}/remove")
async def remove_reaction_from_tag(
    tag_id: str,
    req: ReactionRequest,
    db: DatabaseService = Depends(get_db_service),
    user: Dict[str, Any] = Depends(get_current_user_from_middleware)
):
    """Remove a reaction from a tag"""
    try:
        await db.remove_reaction(tag_id, user.get("user_id"), req.reaction_type, target_type="tag")
        return {"success": True}
    except Exception as e:
        logger.error(f"Error removing reaction from tag: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error removing reaction: {str(e)}")
