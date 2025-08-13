"""
ITG DocVerse API - Events Router
Handles user event tracking (views, interactions, etc.)
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel, Field
from datetime import datetime
import json
import uuid

from ..services.database.factory import DatabaseServiceFactory
from ..services.database.base import DatabaseService
from ..middleware.dependencies import get_current_user_from_middleware


class EventRequest(BaseModel):
    """Request model for logging user events"""
    event_type_id: str = Field(..., description="Event type ID (e.g., 'event-view', 'event-share')")
    target_type: Optional[str] = Field(None, description="Type of target (e.g., 'post', 'user')")
    target_id: Optional[str] = Field(None, description="ID of the target")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional event metadata")


class ViewEventRequest(BaseModel):
    """Simplified request model for post/thought view events"""
    post_id: str = Field(..., description="ID of the post/thought being viewed")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional view metadata")


class EventResponse(BaseModel):
    """Response model for event operations"""
    success: bool
    event_id: str
    message: str


router = APIRouter()


def get_db_service() -> DatabaseService:
    """Dependency to get database service - using singleton pattern"""
    return DatabaseServiceFactory.create_service()


def extract_client_info(request: Request) -> Dict[str, Any]:
    """Extract client information from request"""
    return {
        'ip_address': request.client.host if request.client else None,
        'user_agent': request.headers.get('user-agent'),
        'session_id': request.headers.get('x-session-id') or str(uuid.uuid4())[:8]
    }


@router.post("/log", response_model=EventResponse)
async def log_event(
    event: EventRequest,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Log a user event"""
    try:
        client_info = extract_client_info(request)
        
        event_data = {
            'id': f"event-{uuid.uuid4()}",
            'user_id': current_user['user_id'],
            'event_type_id': event.event_type_id,
            'target_type': event.target_type,
            'target_id': event.target_id,
            'session_id': client_info['session_id'],
            'ip_address': client_info['ip_address'],
            'user_agent': client_info['user_agent'],
            'metadata': event.metadata or {}
        }
        
        event_id = await db.log_user_event(event_data)
        
        return EventResponse(
            success=True,
            event_id=event_id,
            message="Event logged successfully"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to log event: {str(e)}"
        )


@router.post("/view", response_model=EventResponse)
async def log_view_event(
    view_event: ViewEventRequest,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Log a post/thought view event (simplified endpoint)"""
    try:
        client_info = extract_client_info(request)
        
        # Add timestamp and post info to metadata
        metadata = view_event.metadata or {}
        metadata.update({
            'viewed_at': datetime.utcnow().isoformat(),
            'post_id': view_event.post_id
        })
        
        event_data = {
            'id': f"view-{uuid.uuid4()}",
            'user_id': current_user['user_id'],
            'event_type_id': 'event-view',
            'target_type': 'post',
            'target_id': view_event.post_id,
            'session_id': client_info['session_id'],
            'ip_address': client_info['ip_address'],
            'user_agent': client_info['user_agent'],
            'metadata': metadata
        }
        
        event_id = await db.log_user_event(event_data)
        
        return EventResponse(
            success=True,
            event_id=event_id,
            message="View event logged successfully"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to log view event: {str(e)}"
        )


@router.get("/types")
async def get_event_types(
    category: Optional[str] = Query(None, description="Filter by event category"),
    db: DatabaseService = Depends(get_db_service)
):
    """Get available event types"""
    try:
        query = "SELECT * FROM event_types"
        params = []
        
        if category:
            query += " WHERE category = ?"
            params.append(category)
            
        query += " ORDER BY category, name"
        
        results = await db.execute_query(query, params)
        
        return {
            "success": True,
            "data": [
                {
                    "id": row['id'],
                    "name": row['name'],
                    "description": row['description'],
                    "category": row['category'],
                    "icon": row['icon'],
                    "color": row['color']
                }
                for row in results
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get event types: {str(e)}"
        )


@router.get("/user/{user_id}")
async def get_user_events(
    user_id: str,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    target_type: Optional[str] = Query(None, description="Filter by target type"),
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get user events history"""
    try:
        query = """
        SELECT 
            ue.id,
            ue.event_type_id,
            et.name as event_name,
            et.description as event_description,
            et.category,
            ue.target_type,
            ue.target_id,
            ue.created_ts,
            ue.metadata
        FROM user_events ue
        LEFT JOIN event_types et ON ue.event_type_id = et.id
        WHERE ue.user_id = ?
        """
        
        params = [user_id]
        
        if event_type:
            query += " AND ue.event_type_id = ?"
            params.append(event_type)
            
        if target_type:
            query += " AND ue.target_type = ?"
            params.append(target_type)
            
        query += " ORDER BY ue.created_ts DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        results = await db.execute_query(query, params)
        
        return {
            "success": True,
            "data": [
                {
                    "id": row['id'],
                    "event_type_id": row['event_type_id'],
                    "event_name": row['event_name'],
                    "event_description": row['event_description'],
                    "category": row['category'],
                    "target_type": row['target_type'],
                    "target_id": row['target_id'],
                    "created_at": row['created_ts'],
                    "metadata": json.loads(row['metadata']) if row['metadata'] else {}
                }
                for row in results
            ],
            "pagination": {
                "limit": limit,
                "offset": offset,
                "total": len(results)
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get user events: {str(e)}"
        )
