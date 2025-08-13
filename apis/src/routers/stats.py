"""
Stats API Router
Handles application statistics endpoints
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends

from ..services.database.factory import DatabaseServiceFactory
from ..services.database.base import DatabaseService
from ..middleware.dependencies import get_current_user_from_middleware

router = APIRouter()

async def get_db_service() -> DatabaseService:
    """Dependency to get database service - using singleton pattern"""
    return DatabaseServiceFactory.create_service()

@router.get("/", response_model=Dict[str, int])
async def get_stats(
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get application statistics (requires authentication)"""
    try:
        stats = await db.get_stats()
        return stats
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")
