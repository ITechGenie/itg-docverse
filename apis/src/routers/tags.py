"""
Tags API Router
Handles all tag-related endpoints (requires authentication)
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from datetime import datetime

from ..config.settings import settings
from ..utils.logger import get_logger

from ..models.tag import Tag, TagCreate, TagUpdate, TagPublic
from ..services.database.factory import DatabaseServiceFactory
from ..services.database.base import DatabaseService
from ..middleware.dependencies import get_current_user_from_middleware

router = APIRouter()

# Initialize logger - now just like log4j!
logger = get_logger("PostsAPI", level="DEBUG", json_format=False)

# Additional response models for new endpoints
class TagTypeAheadResponse(BaseModel):
    id: str
    name: str
    color: Optional[str] = '#666666'
    posts_count: int

class TagWithStats(BaseModel):
    id: str
    name: str
    description: Optional[str]
    color: Optional[str] = '#666666'
    category: Optional[str] = 'general'
    posts_count: int
    is_active: bool
    created_ts: datetime
    updated_ts: datetime

class PostsByTagResponse(BaseModel):
    posts: List[Dict[str, Any]]
    pagination: Dict[str, Any]
    tag: Dict[str, str]

async def get_db_service() -> DatabaseService:
    """Dependency to get database service - using singleton pattern"""
    return DatabaseServiceFactory.create_service()

@router.get("/search", response_model=List[TagTypeAheadResponse])
async def search_tags(
    q: str = Query(..., min_length=1, description="Search query for tag names"),
    limit: int = Query(10, le=50, description="Maximum number of results"),
    # current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Search tags with type-ahead functionality"""
    try:
        # Search tags by name (case-insensitive) with dynamic post count calculation
        
        is_active = "1"
        is_latest = "1"
        if settings.database_type == "postgresql":
        # PostgreSQL - use string_agg and TRUE
            is_active = "TRUE"
            is_latest = "TRUE"
        else:
            is_active = "1"
            is_latest = "1"
        
        query = f"""
            SELECT tt.id, tt.name, tt.color, 
                   COUNT(DISTINCT pt.post_id) as posts_count
            FROM tag_types tt
            LEFT JOIN post_tags pt ON tt.id = pt.tag_id
            LEFT JOIN posts p ON pt.post_id = p.id AND p.status = 'published' AND p.is_latest = {is_latest}
            WHERE tt.name LIKE ? AND tt.is_active = {is_active}
            GROUP BY tt.id, tt.name, tt.color
            ORDER BY COUNT(DISTINCT pt.post_id) DESC, tt.name ASC
            LIMIT ?
        """
        
        results = await db.execute_query(query, (f"%{q}%", limit))
        
        tags = []
        for row in results:
            tags.append(TagTypeAheadResponse(
                id=row['id'],
                name=row['name'],
                color=row['color'] or '#666666',
                posts_count=row['posts_count']
            ))
        
        return tags
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search tags: {str(e)}")

@router.get("/popular", response_model=List[TagWithStats])
async def get_popular_tags(
    limit: int = Query(20, le=100, description="Maximum number of popular tags"),
    # current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get popular tags ordered by post count (calculated dynamically)"""
    try:
        is_active = "1"
        is_latest = "1"
        if settings.database_type == "postgresql":
        # PostgreSQL - use string_agg and TRUE
            is_active = "TRUE"
            is_latest = "TRUE"
        else:
            is_active = "1"
            is_latest = "1"

        logger.debug(f"Fetching popular tags with is_active={is_active} and limit={limit}") 
        # Calculate post counts dynamically from post_tags table
        query = f"""
            SELECT tt.*, 
                   COUNT(DISTINCT pt.post_id) as posts_count
            FROM tag_types tt
            LEFT JOIN post_tags pt ON tt.id = pt.tag_id
            LEFT JOIN posts p ON pt.post_id = p.id AND p.status = 'published' AND p.is_latest = {is_latest}
            WHERE tt.is_active = {is_active}
            GROUP BY tt.id, tt.name, tt.description, tt.color, tt.category, tt.is_active, tt.created_ts, tt.updated_ts
            ORDER BY COUNT(DISTINCT pt.post_id) DESC, tt.name ASC
            LIMIT ?
        """
        
        results = await db.execute_query(query, (limit,))
        
        tags = []
        for row in results:
            tags.append(TagWithStats(
                id=row['id'],
                name=row['name'],
                description=row['description'],
                color=row['color'] or '#666666',
                category=row['category'] or 'general',
                posts_count=row['posts_count'],
                is_active=bool(row['is_active']),
                created_ts=row['created_ts'],
                updated_ts=row['updated_ts']
            ))
        
        return tags
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get popular tags: {str(e)}")

@router.get("/all", response_model=List[TagWithStats])
async def get_all_tags_with_stats(
    category: Optional[str] = Query(None, description="Filter by category"),
    active_only: bool = Query(True, description="Only return active tags"),
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get all tags with stats and optional filtering"""
    try:
        base_query = """
            SELECT tt.*, 
                   COUNT(DISTINCT pt.post_id) as posts_count
            FROM tag_types tt
            LEFT JOIN post_tags pt ON tt.id = pt.tag_id
            LEFT JOIN posts p ON pt.post_id = p.id AND p.status = 'published' AND p.is_latest = 1
            WHERE 1=1
        """
        
        params = []
        
        if active_only:
            base_query += " AND tt.is_active = ?"
            params.append(1)
        
        if category:
            base_query += " AND tt.category = ?"
            params.append(category)
        
        base_query += " GROUP BY tt.id, tt.name, tt.description, tt.color, tt.category, tt.is_active, tt.created_ts, tt.updated_ts"
        base_query += " ORDER BY COUNT(DISTINCT pt.post_id) DESC, tt.name ASC"
        
        results = await db.execute_query(base_query, params)
        
        tags = []
        for row in results:
            tags.append(TagWithStats(
                id=row['id'],
                name=row['name'],
                description=row['description'],
                color=row['color'] or '#666666',
                category=row['category'] or 'general',
                posts_count=row['posts_count'],
                is_active=bool(row['is_active']),
                created_ts=row['created_ts'],
                updated_ts=row['updated_ts']
            ))
        
        return tags
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get tags: {str(e)}")

@router.post("/{tag_id}", response_model=TagPublic)
async def update_tag(
    tag_id: str,
    tag_update: TagUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Update an existing tag"""
    try:
        # Check if tag exists
        existing_tag = await db.get_tag_by_id(tag_id)
        if not existing_tag:
            raise HTTPException(status_code=404, detail="Tag not found")
        
        # If name is being updated, check for conflicts
        if tag_update.name and tag_update.name != existing_tag.name:
            name_conflict = await db.get_tag_by_name(tag_update.name)
            if name_conflict:
                raise HTTPException(status_code=400, detail="Tag with this name already exists")
        
        # Build update query dynamically
        update_fields = []
        params = []
        
        if tag_update.name is not None:
            update_fields.append("name = ?")
            params.append(tag_update.name)
        
        if tag_update.description is not None:
            update_fields.append("description = ?")
            params.append(tag_update.description)
        
        if tag_update.color is not None:
            update_fields.append("color = ?")
            params.append(tag_update.color)
        
        if tag_update.category is not None:
            update_fields.append("category = ?")
            params.append(tag_update.category)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update_fields.append("updated_ts = CURRENT_TIMESTAMP")
        params.append(tag_id)
        
        update_query = f"""
            UPDATE tag_types 
            SET {', '.join(update_fields)}
            WHERE id = ?
        """
        
        await db.execute_query(update_query, params)
        
        # Return the updated tag
        updated_tag = await db.get_tag_by_id(tag_id)
        return TagPublic(**updated_tag.model_dump())
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update tag: {str(e)}")

@router.delete("/{tag_id}")
async def delete_tag(
    tag_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Soft delete a tag (mark as inactive)"""
    try:
        # Check if tag exists
        existing_tag = await db.get_tag_by_id(tag_id)
        if not existing_tag:
            raise HTTPException(status_code=404, detail="Tag not found")
        
        # Soft delete by marking as inactive
        update_query = """
            UPDATE tag_types 
            SET is_active = 0, updated_ts = CURRENT_TIMESTAMP
            WHERE id = ?
        """
        
        await db.execute_query(update_query, (tag_id,))
        
        return {"message": "Tag deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete tag: {str(e)}")

@router.get("/{tag_id}/posts", response_model=PostsByTagResponse)
async def get_posts_by_tag(
    tag_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Posts per page"),
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get posts filtered by tag"""
    try:
        # Check if tag exists
        tag_query = "SELECT name FROM tag_types WHERE id = ?"
        tag_result = await db.execute_query(tag_query, (tag_id,))
        
        if not tag_result:
            raise HTTPException(status_code=404, detail="Tag not found")
        
        offset = (page - 1) * limit
        
        # Get posts with the specified tag
        posts_query = """
            SELECT p.*, pt.name as post_type_name, u.username, u.display_name,
                   u.email, u.avatar_url, pc.content,
                   (
                       SELECT GROUP_CONCAT(tt.name, ', ')
                       FROM post_tags ptg
                       JOIN tag_types tt ON ptg.tag_id = tt.id
                       WHERE ptg.post_id = p.id
                   ) AS tags
            FROM posts p
            JOIN post_types pt ON p.post_type_id = pt.id
            JOIN users u ON p.author_id = u.id
            LEFT JOIN posts_content pc ON p.id = pc.post_id AND pc.is_current = 1
            JOIN post_tags pt_filter ON p.id = pt_filter.post_id
            WHERE pt_filter.tag_id = ? AND p.status = 'published' AND p.is_latest = 1
            ORDER BY p.created_ts DESC
            LIMIT ? OFFSET ?
        """
        
        posts_result = await db.execute_query(posts_query, (tag_id, limit, offset))
        
        # Get total count
        count_query = """
            SELECT COUNT(*) as total
            FROM posts p
            JOIN post_tags pt ON p.id = pt.post_id
            WHERE pt.tag_id = ? AND p.status = 'published' AND p.is_latest = 1
        """
        
        count_result = await db.execute_query(count_query, (tag_id,))
        total = count_result[0]['total'] if count_result else 0
        
        return PostsByTagResponse(
            posts=posts_result,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            },
            tag={
                "id": tag_id,
                "name": tag_result[0]['name']
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get posts by tag: {str(e)}")

@router.get("/", response_model=List[TagPublic])
async def get_tags(
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get all tags (requires authentication)"""
    try:
        tags = await db.get_tags()
        return [TagPublic(**tag.model_dump()) for tag in tags]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tags: {str(e)}")

@router.get("/{tag_id}", response_model=TagPublic)
async def get_tag(
    tag_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get a specific tag by ID (requires authentication)"""
    try:
        tag = await db.get_tag_by_id(tag_id)
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")
        return TagPublic(**tag)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tag: {str(e)}")

@router.get("/name/{tag_name}", response_model=TagPublic)
async def get_tag_by_name(
    tag_name: str,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get a specific tag by name (requires authentication)"""
    try:
        tag = await db.get_tag_by_name(tag_name)
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")
        return TagPublic(**tag)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tag: {str(e)}")

@router.post("/", response_model=TagPublic)
async def create_tag(
    tag_data: TagCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Create a new tag (requires authentication)"""
    try:
        author_id = current_user.get("user_id")
        tag = Tag(**tag_data.model_dump(), created_by=author_id)
        created_tag = await db.create_tag(tag)
        return TagPublic(**created_tag.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating tag: {str(e)}")
