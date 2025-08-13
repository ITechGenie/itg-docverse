"""
Authors API Router
Handles all author/contributor-related endpoints
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from ..services.database.factory import DatabaseServiceFactory
from ..services.database.base import DatabaseService
from ..middleware.dependencies import get_current_user_from_middleware

router = APIRouter()

async def get_db_service() -> DatabaseService:
    """Dependency to get database service - using singleton pattern"""
    return DatabaseServiceFactory.create_service()

class AuthorResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    posts_count: int
    first_post_date: Optional[str] = None
    last_post_date: Optional[str] = None
    total_views: Optional[int] = 0
    total_likes: Optional[int] = 0

@router.get("/search", response_model=List[AuthorResponse])
async def search_authors(
    q: Optional[str] = Query(None, description="Search query for author names"),
    limit: int = Query(10, ge=1, le=100, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    min_posts: int = Query(0, ge=0, description="Minimum number of posts"),
    # current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Search for authors with type-ahead functionality"""
    try:
        # Base query to get authors with post counts, views from user_events, and all reactions
        base_query = """
        SELECT 
            u.id,
            u.display_name AS name,  
            u.email,
            u.avatar_url,
            u.bio,
            COUNT(DISTINCT p.id) as posts_count,
            MIN(p.created_ts) as first_post_date,
            MAX(p.created_ts) as last_post_date,
            COALESCE(SUM(CASE WHEN ue.event_type_id = 'event-view' THEN 1 ELSE 0 END), 0) as total_views,
            COALESCE(SUM(CASE WHEN et.category = 'reaction' THEN r.reaction_value ELSE 0 END), 0) as total_likes
        FROM users u
        LEFT JOIN posts p ON u.id = p.author_id AND p.status = 'published'
        LEFT JOIN user_events ue ON p.id = ue.target_id AND ue.target_type = 'post' AND ue.event_type_id = 'event-view'
        LEFT JOIN reactions r ON p.id = r.target_id AND r.target_type = 'post'
        LEFT JOIN event_types et ON r.event_type_id = et.id
        """
        
        params = []
        where_conditions = []
        
        if q:
            where_conditions.append("(u.display_name LIKE ? OR u.username LIKE ?)")
            params.extend([f"%{q}%", f"%{q}%"])
        
        if where_conditions:
            base_query += " WHERE " + " AND ".join(where_conditions)
        
        base_query += """
        GROUP BY u.id, u.display_name, u.email, u.avatar_url, u.bio
        HAVING COUNT(DISTINCT p.id) >= ?
        ORDER BY posts_count DESC, u.display_name ASC
        LIMIT ? OFFSET ?
        """
        
        params.extend([min_posts, limit, offset])
        
        results = await db.execute_query(base_query, params)
        
        authors_list = []
        for row in results:
            authors_list.append(AuthorResponse(
                id=str(row['id']),
                name=row['name'],
                email=row['email'],
                avatar_url=row['avatar_url'],
                bio=row['bio'],
                posts_count=row['posts_count'],
                first_post_date=row['first_post_date'],
                last_post_date=row['last_post_date'],
                total_views=row['total_views'] or 0,
                total_likes=row['total_likes'] or 0
            ))
        
        return authors_list
        
    except Exception as e:
        print(f"Error searching authors: {e}")
        raise HTTPException(status_code=500, detail="Failed to search authors")

@router.get("/top", response_model=List[AuthorResponse])
async def get_top_authors(
    limit: int = Query(20, ge=1, le=100, description="Number of top authors to return"),
    sort_by: str = Query("posts", description="Sort by: posts, views, likes"),
    # current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get top contributing authors"""
    try:
        # Determine sort column
        sort_column = "posts_count"
        if sort_by == "views":
            sort_column = "total_views"
        elif sort_by == "likes":
            sort_column = "total_likes"
        
        query = f"""
        SELECT 
            u.id,
            u.display_name AS name,
            u.email,
            u.avatar_url,
            u.bio,
            COUNT(DISTINCT p.id) as posts_count,
            MIN(p.created_ts) as first_post_date,
            MAX(p.created_ts) as last_post_date,
            COALESCE(SUM(CASE WHEN ue.event_type_id = 'event-view' THEN 1 ELSE 0 END), 0) as total_views,
            COALESCE(SUM(CASE WHEN et.category = 'reaction' THEN r.reaction_value ELSE 0 END), 0) as total_likes
        FROM users u
        LEFT JOIN posts p ON u.id = p.author_id AND p.status = 'published'
        LEFT JOIN user_events ue ON p.id = ue.target_id AND ue.target_type = 'post' AND ue.event_type_id = 'event-view'
        LEFT JOIN reactions r ON p.id = r.target_id AND r.target_type = 'post'
        LEFT JOIN event_types et ON r.event_type_id = et.id
        GROUP BY u.id, u.display_name, u.email, u.avatar_url, u.bio
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY {sort_column} DESC, u.display_name ASC
        LIMIT ?
        """
        
        results = await db.execute_query(query, [limit])
        
        authors_list = []
        for row in results:
            authors_list.append(AuthorResponse(
                id=str(row['id']),
                name=row['name'],
                email=row['email'],
                avatar_url=row['avatar_url'],
                bio=row['bio'],
                posts_count=row['posts_count'],
                first_post_date=row['first_post_date'],
                last_post_date=row['last_post_date'],
                total_views=row['total_views'] or 0,
                total_likes=row['total_likes'] or 0
            ))
        
        return authors_list
        
    except Exception as e:
        print(f"Error getting top authors: {e}")
        raise HTTPException(status_code=500, detail="Failed to get top authors")

@router.get("/{author_id}", response_model=AuthorResponse)
async def get_author_details(
    author_id: str,
    # current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get detailed information about a specific author"""
    try:
        query = """
        SELECT 
            u.id,
            u.display_name AS name,
            u.email,
            u.avatar_url,
            u.bio,
            COUNT(DISTINCT p.id) as posts_count,
            MIN(p.created_ts) as first_post_date,
            MAX(p.created_ts) as last_post_date,
            COALESCE(SUM(CASE WHEN ue.event_type_id = 'event-view' THEN 1 ELSE 0 END), 0) as total_views,
            COALESCE(SUM(CASE WHEN et.category = 'reaction' THEN r.reaction_value ELSE 0 END), 0) as total_likes
        FROM users u
        LEFT JOIN posts p ON u.id = p.author_id AND p.status = 'published'
        LEFT JOIN user_events ue ON p.id = ue.target_id AND ue.target_type = 'post' AND ue.event_type_id = 'event-view'
        LEFT JOIN reactions r ON p.id = r.target_id AND r.target_type = 'post'
        LEFT JOIN event_types et ON r.event_type_id = et.id
        WHERE u.id = ?
        GROUP BY u.id, u.display_name, u.email, u.avatar_url, u.bio
        """
        
        results = await db.execute_query(query, [author_id])
        
        if not results:
            raise HTTPException(status_code=404, detail="Author not found")
        
        row = results[0]
        return AuthorResponse(
            id=str(row['id']),
            name=row['name'],
            email=row['email'],
            avatar_url=row['avatar_url'],
            bio=row['bio'],
            posts_count=row['posts_count'],
            first_post_date=row['first_post_date'],
            last_post_date=row['last_post_date'],
            total_views=row['total_views'] or 0,
            total_likes=row['total_likes'] or 0
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting author details: {e}")
        raise HTTPException(status_code=500, detail="Failed to get author details")

@router.get("/{author_id}/posts")
async def get_author_posts(
    author_id: str,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    # current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get posts by a specific author"""
    try:
        query = """
        SELECT 
            p.id,
            p.title,
            p.feed_content as content,
            p.created_ts,
            p.updated_ts,
            COALESCE(SUM(CASE WHEN ue.event_type_id = 'event-view' THEN 1 ELSE 0 END), 0) as views,
            COALESCE(SUM(CASE WHEN et.category = 'reaction' THEN r.reaction_value ELSE 0 END), 0) as likes,
            p.status
        FROM posts p
        LEFT JOIN user_events ue ON p.id = ue.target_id AND ue.target_type = 'post' AND ue.event_type_id = 'event-view'
        LEFT JOIN reactions r ON p.id = r.target_id AND r.target_type = 'post'
        LEFT JOIN event_types et ON r.event_type_id = et.id
        WHERE p.author_id = ? AND p.status = 'published'
        GROUP BY p.id, p.title, p.feed_content, p.created_ts, p.updated_ts, p.status
        ORDER BY p.created_ts DESC
        LIMIT ? OFFSET ?
        """
        
        results = await db.execute_query(query, [author_id, limit, offset])
        
        posts_list = []
        for row in results:
            posts_list.append({
                "id": str(row['id']),
                "title": row['title'],
                "content": row['content'],
                "created_at": row['created_ts'],
                "updated_at": row['updated_ts'],
                "views": row['views'] or 0,
                "likes": row['likes'] or 0,
                "status": row['status']
            })
        
        return {"posts": posts_list, "total": len(posts_list)}
        
    except Exception as e:
        print(f"Error getting author posts: {e}")
        raise HTTPException(status_code=500, detail="Failed to get author posts")
