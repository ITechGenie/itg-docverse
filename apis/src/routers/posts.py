"""
Posts API Router
Handles all post-related endpoints (requires authentication)
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query

from ..models.post import Post, PostCreate, PostUpdate, PostPublic, PostType, PostStatus
from ..services.database.factory import DatabaseServiceFactory
from ..services.database.base import DatabaseService
from ..middleware.dependencies import get_current_user_from_middleware
from ..utils.logger import get_logger

router = APIRouter()

# Global database service
db_service = DatabaseServiceFactory.create_service()

# Initialize logger - now just like log4j!
logger = get_logger("PostsAPI", level="DEBUG", json_format=False)

async def get_favorite_filtered_posts(
    db: DatabaseService,
    user_id: str,
    skip: int = 0,
    limit: int = 10,
    author_id: Optional[str] = None,
    tag_id: Optional[str] = None,
    post_type: Optional[PostType] = None,
    status: PostStatus = PostStatus.PUBLISHED,
    favorites_posts: Optional[bool] = None,
    favorite_tags: Optional[bool] = None
) -> List[Dict[str, Any]]:
    """Get posts filtered by favorites (either favorite posts or posts from favorite tags)"""
    
    # Use the same query structure as the normal get_posts method in sqlite_service
    base_query = """
    SELECT p.id, p.title, p.author_id, p.post_type_id, p.status,
           p.project_id, p.git_url, p.created_ts, p.updated_ts,
           COALESCE(pc.content, p.feed_content, '') as content,
           (
               SELECT GROUP_CONCAT(tt.name, ', ')
               FROM post_tags ptg
               JOIN tag_types tt ON ptg.tag_id = tt.id
               WHERE ptg.post_id = p.id
           ) AS tags
    FROM posts p
    LEFT JOIN posts_content pc ON p.id = pc.post_id AND pc.is_current = 1
    """
    
    where_conditions = ["p.status = ?", "p.is_latest = ?"]
    params = [status.value, True]
    
    if favorites_posts:
        # Join with reactions table to find favorite posts
        base_query += """
        INNER JOIN reactions r ON p.id = r.target_id 
        INNER JOIN event_types et ON r.event_type_id = et.id
        """
        where_conditions.append("r.target_type in ('post','thoughts')")
        where_conditions.append("r.user_id = ?")
        where_conditions.append("et.id = 'event-favorite'")
        params.append(user_id)
    
    if favorite_tags:
        # Join with reactions table to find posts with favorite tags
        # Insert user_id parameter at the beginning since the subquery expects it first
        base_query += """
        INNER JOIN (
            SELECT DISTINCT pt2.post_id
            FROM post_tags pt2
            INNER JOIN reactions r2 ON pt2.tag_id = r2.target_id
            INNER JOIN event_types et2 ON r2.event_type_id = et2.id
            WHERE r2.target_type = 'tag' 
              AND r2.user_id = ?
              AND et2.id = 'event-favorite'
        ) fav_tags ON p.id = fav_tags.post_id
        """
        # Insert user_id at the beginning of params since subquery expects it first
        params.insert(0, user_id)
    
    # Add other filters (status and is_latest are already added above)
    
    # Add other filters
    if author_id:
        where_conditions.append("p.author_id = ?")
        params.append(author_id)
    
    if tag_id:
        where_conditions.append("EXISTS (SELECT 1 FROM post_tags pt WHERE pt.post_id = p.id AND pt.tag_id = ?)")
        params.append(tag_id)
    
    if post_type:
        where_conditions.append("p.post_type_id = ?")
        params.append(post_type.value)
    
    # Build final query
    if where_conditions:
        base_query += " WHERE " + " AND ".join(where_conditions)
    
    base_query += """
    ORDER BY p.created_ts DESC
    LIMIT ? OFFSET ?
    """
    params.extend([limit, skip])
    
    logger.debug(f"Executing favorite query: {base_query}")
    logger.debug(f"With parameters: {params}")
    
    results = await db.execute_query(base_query, tuple(params))
    logger.debug(f"Query returned {len(results) if results else 0} results")
    
    return results

async def get_db_service() -> DatabaseService:
    """Dependency to get database service"""
    if not hasattr(db_service, 'initialized') or not db_service.initialized:
        await db_service.initialize()
    return db_service

@router.get("/", response_model=List[PostPublic])
async def get_posts(
    skip: int = Query(0, ge=0, description="Number of posts to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of posts to return"), 
    author_id: Optional[str] = Query(None, description="Filter by author ID"),
    tag_id: Optional[str] = Query(None, description="Filter by tag ID"),
    post_type: Optional[PostType] = Query(None, description="Filter by post type"),
    favorites_posts: Optional[bool] = Query(None, description="Filter to show only favorite posts"),
    favorite_tags: Optional[bool] = Query(None, description="Filter to show posts from favorite tags"),
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    status: PostStatus = Query(PostStatus.PUBLISHED, description="Filter by status"),
    db: DatabaseService = Depends(get_db_service)
):
    """Get posts with filtering and pagination (requires authentication)"""
    try:
        # Log query parameters - just like log4j!
        logger.info(f"Fetching posts with params: skip={skip}, limit={limit}, author_id={author_id}, tag_id={tag_id}, post_type={post_type}, status={status}, favorites_posts={favorites_posts}, favorite_tags={favorite_tags}")

        # Handle favorite filtering
        if favorites_posts or favorite_tags:
            # We need to implement a custom query for favorites
            posts = await get_favorite_filtered_posts(
                db=db,
                user_id=current_user['user_id'],
                skip=skip,
                limit=limit,
                author_id=author_id,
                tag_id=tag_id,
                post_type=post_type,
                status=status,
                favorites_posts=favorites_posts,
                favorite_tags=favorite_tags
            )
        else:
            posts = await db.get_posts(
                skip=skip,
                limit=limit,
                author_id=author_id,
                tag_id=tag_id,
                post_type=post_type,
                status=status
            )

        # Log the resulting posts
        logger.debug(f"Fetched {len(posts)} posts")

        # Transform database posts to match PostPublic model
        transformed_posts = []
        for post in posts:
            transformed_post = {
                'id': post['id'],
                'title': post['title'],
                'content': post.get('content') or '',  # Ensure content is never None
                'author_id': post['author_id'],
                'post_type': PostType(post['post_type_id']),  # Convert string to enum
                'status': PostStatus(post['status']),  # Convert string to enum
                'tags': [
                    {"id": tag.strip(), "name": tag.strip(), "color": "#24A890"}
                    for tag in post.get('tags', '').split(',') if tag.strip()
                ] if post.get('tags') else [],
                'is_document': False,  # Default value since not in DB schema
                'project_id': post.get('project_id'),
                'git_url': post.get('git_url'),
                'view_count': 0,  # TODO: Fetch from reactions/stats
                'like_count': 0,  # TODO: Fetch from reactions
                'comment_count': 0,  # TODO: Fetch from discussions
                'created_at': post['created_ts'],
                'updated_at': post['updated_ts'],
                'published_at': None  # TODO: Add published timestamp logic
            }
            transformed_posts.append(PostPublic(**transformed_post))

        return transformed_posts
    except Exception as e:
        logger.error(f"Error fetching posts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching posts: {str(e)}")

@router.get("/{post_id}", response_model=PostPublic)
async def get_post(
    post_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get a specific post by ID (requires authentication)"""
    try:
        post = await db.get_post_by_id(post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Transform database fields to match PostPublic model
        transformed_post = {
            'id': post['id'],
            'title': post['title'],
            'content': post.get('content') or '',  # Ensure content is never None
            'author_id': post['author_id'],
            'post_type': PostType(post['post_type_id']),  # Convert string to enum
            'status': PostStatus(post['status']),  # Convert string to enum
            'tags': [],  # TODO: Fetch associated tags
            'is_document': False,  # Default value since not in DB schema
            'project_id': post.get('project_id'),
            'git_url': post.get('git_url'),
            'view_count': 0,  # TODO: Fetch from reactions/stats
            'like_count': 0,  # TODO: Fetch from reactions
            'comment_count': 0,  # TODO: Fetch from discussions
            'created_at': post['created_ts'],
            'updated_at': post['updated_ts'],
            'published_at': None  # TODO: Add published timestamp logic
        }
        
        return PostPublic(**transformed_post)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching post: {str(e)}")

@router.post("/", response_model=PostPublic)
async def create_post(
    post_data: PostCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Create a new post (requires authentication)"""
    logger.debug(f"Incoming post body: {post_data.model_dump_json()}")
    logger.debug(f"Current user from middleware: {current_user}")
    try:
        # Use authenticated user as author
        author_id = current_user.get("user_id")
        logger.debug(f"Extracted author_id: {author_id}")

        logger.info(f"Creating post with type: {post_data.post_type}, tags: {post_data.tags}")

        # Convert Post model to database format
        import uuid
        post_id = str(uuid.uuid4())
        
        # Generate title if not provided
        title = post_data.title
        if not title:
            if post_data.post_type == PostType.THOUGHTS:
                # For thoughts, use first 50 characters of content as title
                title = post_data.content[:50].strip()
                if len(post_data.content) > 50:
                    title += "..."
            else:
                # For other types, use a default title
                title = f"Untitled {post_data.post_type.value.replace('-', ' ').title()}"

        # Prepare data for database (convert Pydantic model to dict with correct field names)
        db_post_data = {
            'id': post_id,
            'post_type_id': post_data.post_type.value,  # Convert enum to string value
            'title': title,
            'content': post_data.content,
            'author_id': author_id,
            'status': post_data.status.value,  # Convert enum to string value
            'created_by': author_id,
            'updated_by': author_id,
            'revision': 0,
            'read_time': 0
        }

        logger.debug(f"Prepared post data for DB: {db_post_data}")

        # Create the post in the database
        created_post_id = await db.create_post(db_post_data)

        logger.info(f"Post created with ID: {created_post_id}")

        # Handle tags if provided
        if post_data.tags:
            await db.associate_tags_with_post(created_post_id, post_data.tags)
            logger.debug(f"Associated {len(post_data.tags)} tags with post {created_post_id}")

        logger.info(f"Successfully created post with ID: {created_post_id}")

        # Fetch the created post to return the proper response
        created_post = await db.get_post_by_id(created_post_id)
        if not created_post:
            raise HTTPException(status_code=500, detail="Failed to retrieve created post")
        
        # Transform database fields to match PostPublic model
        transformed_post = {
            'id': created_post['id'],
            'title': created_post['title'],
            'content': created_post.get('content') or '',  # Ensure content is never None
            'author_id': created_post['author_id'],
            'post_type': PostType(created_post['post_type_id']),  # Convert string to enum
            'status': PostStatus(created_post['status']),  # Convert string to enum
            'tags': [],  # TODO: Fetch associated tags
            'is_document': False,  # Default value since not in DB schema
            'project_id': created_post.get('project_id'),
            'git_url': created_post.get('git_url'),
            'view_count': 0,  # TODO: Fetch from reactions/stats
            'like_count': 0,  # TODO: Fetch from reactions
            'comment_count': 0,  # TODO: Fetch from discussions
            'created_at': created_post['created_ts'],
            'updated_at': created_post['updated_ts'],
            'published_at': None  # TODO: Add published timestamp logic
        }
        
        return PostPublic(**transformed_post)
    except Exception as e:
        logger.error(f"Error creating post: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating post: {str(e)}")

@router.put("/{post_id}", response_model=PostPublic)
async def update_post(
    post_id: str,
    post_data: PostUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Update a post (requires authentication and ownership)"""
    try:
        # Check if post exists and verify ownership
        existing_post = await db.get_post_by_id(post_id)
        if not existing_post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Check ownership - existing_post is a dict, not an object
        if existing_post['author_id'] != current_user.get("user_id"):
            raise HTTPException(status_code=403, detail="Not authorized to update this post")
        
        # Convert PostUpdate model to dict for database update
        updates = {}
        if post_data.title is not None:
            updates['title'] = post_data.title
        if post_data.content is not None:
            updates['content'] = post_data.content
        if post_data.status is not None:
            updates['status'] = post_data.status.value
        
        # Add updated_by field
        updates['updated_by'] = current_user.get("user_id")
        
        logger.debug(f"Updating post {post_id} with data: {updates}")
        
        updated_post = await db.update_post(post_id, updates)
        
        if not updated_post:
            raise HTTPException(status_code=404, detail="Post not found after update")
        
        # Transform database fields to match PostPublic model
        transformed_post = {
            'id': updated_post['id'],
            'title': updated_post['title'],
            'content': updated_post.get('content') or '',
            'author_id': updated_post['author_id'],
            'post_type': PostType(updated_post['post_type_id']),
            'status': PostStatus(updated_post['status']),
            'tags': [],  # TODO: Fetch associated tags
            'is_document': False,
            'project_id': updated_post.get('project_id'),
            'git_url': updated_post.get('git_url'),
            'view_count': 0,
            'like_count': 0,
            'comment_count': 0,
            'created_at': updated_post['created_ts'],
            'updated_at': updated_post['updated_ts'],
            'published_at': None
        }
        
        return PostPublic(**transformed_post)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating post: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating post: {str(e)}")

@router.delete("/{post_id}")
async def delete_post(
    post_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Delete a post (requires authentication and ownership)"""
    try:
        # Check if post exists and verify ownership
        existing_post = await db.get_post_by_id(post_id)
        if not existing_post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Check ownership - existing_post is a dict, not an object
        if existing_post['author_id'] != current_user.get("user_id"):
            raise HTTPException(status_code=403, detail="Not authorized to delete this post")
        
        success = await db.delete_post(post_id)
        if not success:
            raise HTTPException(status_code=404, detail="Post not found")
        return {"message": "Post deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting post: {str(e)}")

@router.get("/search/", response_model=List[PostPublic])
async def search_posts(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=100, description="Number of results to return"),
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Search posts by content (requires authentication)"""
    try:
        posts = await db.search_posts(query=q, limit=limit)
        return [PostPublic(**post.model_dump()) for post in posts]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching posts: {str(e)}")
