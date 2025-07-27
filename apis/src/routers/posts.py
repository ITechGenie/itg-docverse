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
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    status: PostStatus = Query(PostStatus.PUBLISHED, description="Filter by status"),
    db: DatabaseService = Depends(get_db_service)
):
    """Get posts with filtering and pagination (requires authentication)"""
    try:
        # Log query parameters - just like log4j!
        logger.info(f"Fetching posts with params: skip={skip}, limit={limit}, author_id={author_id}, tag_id={tag_id}, post_type={post_type}, status={status}")

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
                'content': post.get('content', ''),
                'author_id': post['author_id'],
                'post_type': PostType(post['post_type_id']),  # Convert string to enum
                'status': PostStatus(post['status']),  # Convert string to enum
                'tags': [],  # TODO: Fetch associated tags
                'is_document': post.get('is_document', False),
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
            'content': post.get('content', ''),
            'author_id': post['author_id'],
            'post_type': PostType(post['post_type_id']),  # Convert string to enum
            'status': PostStatus(post['status']),  # Convert string to enum
            'tags': [],  # TODO: Fetch associated tags
            'is_document': post.get('is_document', False),
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
            'content': created_post.get('content', ''),
            'author_id': created_post['author_id'],
            'post_type': PostType(created_post['post_type_id']),  # Convert string to enum
            'status': PostStatus(created_post['status']),  # Convert string to enum
            'tags': [],  # TODO: Fetch associated tags
            'is_document': created_post.get('is_document', False),
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
        
        # Check ownership
        if existing_post.author_id != current_user.get("user_id"):
            raise HTTPException(status_code=403, detail="Not authorized to update this post")
        
        updates = {k: v for k, v in post_data.model_dump().items() if v is not None}
        updated_post = await db.update_post(post_id, updates)
        
        if not updated_post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        return PostPublic(**updated_post.model_dump())
    except HTTPException:
        raise
    except Exception as e:
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
        
        # Check ownership
        if existing_post.author_id != current_user.get("user_id"):
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
