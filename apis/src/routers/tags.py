"""
Tags API Router
Handles all tag-related endpoints
"""

from typing import List
from fastapi import APIRouter, HTTPException, Depends, Query

from ..models.tag import Tag, TagCreate, TagUpdate, TagPublic
from ..services.database.factory import DatabaseServiceFactory
from ..services.database.base import DatabaseService

router = APIRouter(prefix="/api/tags", tags=["tags"])

# Global database service
db_service = DatabaseServiceFactory.create_service()

async def get_db_service() -> DatabaseService:
    """Dependency to get database service"""
    if not hasattr(db_service, 'initialized') or not db_service.initialized:
        await db_service.initialize()
    return db_service

@router.get("/", response_model=List[TagPublic])
async def get_tags(
    db: DatabaseService = Depends(get_db_service)
):
    """Get all tags"""
    try:
        tags = await db.get_tags()
        return [TagPublic(**tag.model_dump()) for tag in tags]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tags: {str(e)}")

@router.get("/{tag_id}", response_model=TagPublic)
async def get_tag(
    tag_id: str,
    db: DatabaseService = Depends(get_db_service)
):
    """Get a specific tag by ID"""
    try:
        tag = await db.get_tag_by_id(tag_id)
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")
        return TagPublic(**tag.model_dump())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tag: {str(e)}")

@router.get("/name/{tag_name}", response_model=TagPublic)
async def get_tag_by_name(
    tag_name: str,
    db: DatabaseService = Depends(get_db_service)
):
    """Get a specific tag by name"""
    try:
        tag = await db.get_tag_by_name(tag_name)
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")
        return TagPublic(**tag.model_dump())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tag: {str(e)}")

@router.post("/", response_model=TagPublic)
async def create_tag(
    tag_data: TagCreate,
    db: DatabaseService = Depends(get_db_service)
):
    """Create a new tag"""
    try:
        tag = Tag(**tag_data.model_dump())
        created_tag = await db.create_tag(tag)
        return TagPublic(**created_tag.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating tag: {str(e)}")
