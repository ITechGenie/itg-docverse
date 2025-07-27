"""
Stats API Router
Handles application statistics endpoints
"""

from typing import Dict
from fastapi import APIRouter, HTTPException, Depends

from ..services.database.factory import DatabaseServiceFactory
from ..services.database.base import DatabaseService

router = APIRouter(prefix="/api/stats", tags=["stats"])

# Global database service
db_service = DatabaseServiceFactory.create_service()

async def get_db_service() -> DatabaseService:
    """Dependency to get database service"""
    if not hasattr(db_service, 'initialized') or not db_service.initialized:
        await db_service.initialize()
    return db_service

@router.get("/", response_model=Dict[str, int])
async def get_stats(
    db: DatabaseService = Depends(get_db_service)
):
    """Get application statistics"""
    try:
        stats = await db.get_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")
