"""
Posts API Router
Handles all post-related endpoints (requires authentication)
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query

from ..models.post import Post, PostCreate, PostUpdate, PostPublic, PostType, PostStatus, PostSummary, PostAnalytics, UserAnalytics
from ..services.database.factory import DatabaseServiceFactory
from ..services.database.base import DatabaseService
from ..middleware.dependencies import get_current_user_from_middleware
from ..utils.logger import get_logger
from ..config.settings import settings

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
    logger.debug(f"Fetching favorite filtered posts for user {user_id} with params: skip={skip}, limit={limit}, author_id={author_id}, tag_id={tag_id}, post_type={post_type}, status={status}, favorites_posts={favorites_posts}, favorite_tags={favorite_tags}")
    # Build the base query with database-specific SQL functions
    if settings.database_type == "postgresql":
        # PostgreSQL - use string_agg and TRUE
        tags_query = """
               SELECT string_agg(tt.name, ', ')
               FROM post_tags ptg
               JOIN tag_types tt ON ptg.tag_id = tt.id
               WHERE ptg.post_id = p.id
           """
        is_current_value = "TRUE"
    else:
        # SQLite and others - use GROUP_CONCAT and 1
        tags_query = """
               SELECT GROUP_CONCAT(tt.name, ', ')
               FROM post_tags ptg
               JOIN tag_types tt ON ptg.tag_id = tt.id
               WHERE ptg.post_id = p.id
           """
        is_current_value = "1"
    
    base_query = f"""
    SELECT p.id, p.title, p.author_id,
    u.username, u.display_name, u.email, u.avatar_url, 
            p.post_type_id, p.status,
           p.project_id, p.git_url, p.created_ts, p.updated_ts,
           COALESCE(pc.content, p.feed_content, '') as content,
           ({tags_query}) AS tags
    FROM posts p
    JOIN users u ON p.author_id = u.id
    LEFT JOIN posts_content pc ON p.id = pc.post_id AND pc.is_current = {is_current_value}
    """
    
    where_conditions = ["p.status = ?", "p.is_latest = ?"]
    params = [status.value, True]
    
    if favorites_posts:
        # Join with reactions table to find favorite posts
        base_query += """
        INNER JOIN reactions r ON p.id = r.target_id 
        INNER JOIN event_types et ON r.event_type_id = et.id
        """
        # the post here is the common type in the reactions and has nothing to do with the post_types
        where_conditions.append("r.target_type in ('post')")
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
    ORDER BY p.updated_ts, p.created_ts DESC
    LIMIT ? OFFSET ?
    """
    params.extend([limit, skip])
    
    logger.debug(f"Executing favorite query: {base_query}")
    logger.debug(f"With parameters: {params}")
    
    # Check database type and convert placeholders if needed
    if settings.database_type == "postgresql":
        # PostgreSQL service - convert ? to $1, $2, etc.
        pg_query = db._convert_placeholders(base_query)
        results = await db.execute_query(pg_query, tuple(params))
    else:
        # SQLite or other service - use as-is
        results = await db.execute_query(base_query, tuple(params))
        
    logger.debug(f"Query returned {len(results) if results else 0} results")
    
    return results

router = APIRouter()

# Initialize logger
logger = get_logger("PostsAPI", level="DEBUG", json_format=False)

async def get_db_service() -> DatabaseService:
    """Dependency to get database service - using singleton pattern"""
    return DatabaseServiceFactory.create_service()

@router.get("/", response_model=List[PostPublic])
async def get_posts(
    skip: int = Query(0, ge=0, description="Number of posts to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of posts to return"), 
    author_id: Optional[str] = Query(None, description="Filter by author ID"),
    tag_id: Optional[str] = Query(None, description="Filter by tag ID"),
    trending: Optional[bool] = Query(None, description="Filter to show only trending posts"),
    timeframe: Optional[str] = Query(None, description="Timeframe filter for trending posts (today, week, month, all)"),
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
        logger.info(f"Fetching posts with params: skip={skip}, limit={limit}, author_id={author_id}, tag_id={tag_id}, post_type={post_type}, status={status}, trending={trending}, timeframe={timeframe}, favorites_posts={favorites_posts}, favorite_tags={favorite_tags}")

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
                trending=trending,
                timeframe=timeframe,
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
                'author_name': post['display_name'],
                'author_username': post['username'],
                'post_type': PostType(post['post_type_id']),  # Convert string to enum
                'status': PostStatus(post['status']),  # Convert string to enum
                'tags': [
                    {"id": tag.strip(), "name": tag.strip(), "color": "#24A890"}
                    for tag in post.get('tags', '').split(',') if tag.strip()
                ] if post.get('tags') else [],
                'is_document': False,  # Default value since not in DB schema
                'project_id': post.get('project_id'),
                'git_url': post.get('git_url'),
                'view_count': post.get('view_count', 0),  # Use actual view count from user_events
                'like_count': post.get('reaction_count', 0),  # Use actual reaction count
                'comment_count': post.get('comment_count', 0),  # Use actual comment count from post_discussions
                # No revision field for list view - use feed_content for performance
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
            'author_name': post['display_name'],
            'author_username': post['username'],
            'post_type': PostType(post['post_type_id']),  # Convert string to enum
            'status': PostStatus(post['status']),  # Convert string to enum
            'tags': [
                    {"id": tag.strip(), "name": tag.strip(), "color": "#24A890"}
                    for tag in post.get('tags', '').split(',') if tag.strip()
                ] if post.get('tags') else [],
            'is_document': False,  # Default value since not in DB schema
            'project_id': post.get('project_id'),
            'git_url': post.get('git_url'),
            'view_count': post.get('view_count', 0),  # Use actual view count from user_events
            'like_count': 0,  # TODO: Get reaction count for individual post
            'comment_count': post.get('comment_count', 0),  # Use actual comment count from post_discussions
            'revision': post.get('revision', 0),  # Include revision from posts_content table
            'created_at': post['created_ts'],
            'updated_at': post['updated_ts'],
            'published_at': None  # TODO: Add published timestamp logic
        }
        
        return PostPublic(**transformed_post)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching post: {str(e)}")

@router.get("/{post_id}/summary", response_model=PostSummary)
async def get_post_summary(
    post_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get analytics summary for a specific post (requires authentication)"""
    try:
        # Check if post exists
        post = await db.get_post_by_id(post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Get analytics summary from database
        # Views from user_events table with event-view type
        views_query = """
            SELECT COUNT(*) as total_views
            FROM user_events 
            WHERE target_id = ? AND target_type = 'post' AND event_type_id = 'event-view'
        """
        
        # Reactions from reactions table (all reaction types for the post)
        reactions_query = """
            SELECT COUNT(*) as total_reactions
            FROM reactions r
            INNER JOIN event_types et ON r.event_type_id = et.id
            WHERE r.target_id = ? AND r.target_type = 'post' AND et.category = 'reaction'
        """
        
        # Comments from post_discussions table (only root level comments)
        comments_query = """
            SELECT COUNT(*) as total_comments
            FROM post_discussions 
            WHERE post_id = ? AND parent_discussion_id IS NULL AND is_deleted = FALSE
        """
        
        try:
            # Execute queries
            views_result = await db.execute_query(views_query, (post_id,))
            total_views = views_result[0]['total_views'] if views_result else 0
        except Exception as e:
            logger.warning(f"Error fetching views for post {post_id}: {e}")
            total_views = 0
            
        try:
            reactions_result = await db.execute_query(reactions_query, (post_id,))
            total_reactions = reactions_result[0]['total_reactions'] if reactions_result else 0
        except Exception as e:
            logger.warning(f"Error fetching reactions for post {post_id}: {e}")
            total_reactions = 0
            
        try:
            comments_result = await db.execute_query(comments_query, (post_id,))
            total_comments = comments_result[0]['total_comments'] if comments_result else 0
        except Exception as e:
            logger.warning(f"Error fetching comments for post {post_id}: {e}")
            total_comments = 0
        
        return PostSummary(
            total_views=total_views,
            total_reactions=total_reactions,
            total_comments=total_comments
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching post summary for {post_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching post summary: {str(e)}")

@router.get("/{post_id}/analytics", response_model=PostAnalytics)
async def get_post_analytics(
    post_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Get full analytics with user breakdown for a specific post (requires authentication)"""
    try:
        # Check if post exists
        post = await db.get_post_by_id(post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Get user-level analytics data
        user_analytics_query = """
            SELECT 
                u.id as user_id,
                u.username as user_name,
                u.display_name,
                COALESCE(views.view_count, 0) as views,
                COALESCE(reactions.reaction_count, 0) as reactions,
                COALESCE(comments.comment_count, 0) as comments
            FROM users u
            LEFT JOIN (
                SELECT user_id, COUNT(*) as view_count
                FROM user_events 
                WHERE target_id = ? AND target_type = 'post' AND event_type_id = 'event-view'
                GROUP BY user_id
            ) views ON u.id = views.user_id
            LEFT JOIN (
                SELECT user_id, COUNT(*) as reaction_count
                FROM reactions r
                INNER JOIN event_types et ON r.event_type_id = et.id
                WHERE r.target_id = ? AND r.target_type = 'post' AND et.category = 'reaction'
                GROUP BY user_id
            ) reactions ON u.id = reactions.user_id
            LEFT JOIN (
                SELECT author_id as user_id, COUNT(*) as comment_count
                FROM post_discussions 
                WHERE post_id = ? AND is_deleted = FALSE
                GROUP BY author_id
            ) comments ON u.id = comments.user_id
            WHERE views.view_count > 0 OR reactions.reaction_count > 0 OR comments.comment_count > 0
            ORDER BY (COALESCE(views.view_count, 0) + COALESCE(reactions.reaction_count, 0) + COALESCE(comments.comment_count, 0)) DESC
        """
        
        # Get totals
        total_views_query = """
            SELECT COUNT(*) as total 
            FROM user_events 
            WHERE target_id = ? AND target_type = 'post' AND event_type_id = 'event-view'
        """
        total_reactions_query = """
            SELECT COUNT(*) as total 
            FROM reactions r
            INNER JOIN event_types et ON r.event_type_id = et.id
            WHERE r.target_id = ? AND r.target_type = 'post' AND et.category = 'reaction'
        """
        total_comments_query = """
            SELECT COUNT(*) as total 
            FROM post_discussions 
            WHERE post_id = ? AND is_deleted = FALSE
        """
        
        try:
            # Get user-level data
            user_data = await db.execute_query(user_analytics_query, (post_id, post_id, post_id))
            user_analytics = []
            
            for row in user_data or []:
                user_analytics.append(UserAnalytics(
                    user_id=row['user_id'],
                    user_name=row['user_name'] or '',
                    display_name=row['display_name'] or row['user_name'] or 'Unknown',
                    views=row['views'],
                    reactions=row['reactions'],
                    comments=row['comments']
                ))
                
        except Exception as e:
            logger.warning(f"Error fetching user analytics for post {post_id}: {e}")
            user_analytics = []
        
        # Get totals
        try:
            views_result = await db.execute_query(total_views_query, (post_id,))
            total_views = views_result[0]['total'] if views_result else 0
        except Exception as e:
            logger.warning(f"Error fetching total views for post {post_id}: {e}")
            total_views = 0
            
        try:
            reactions_result = await db.execute_query(total_reactions_query, (post_id,))
            total_reactions = reactions_result[0]['total'] if reactions_result else 0
        except Exception as e:
            logger.warning(f"Error fetching total reactions for post {post_id}: {e}")
            total_reactions = 0
            
        try:
            comments_result = await db.execute_query(total_comments_query, (post_id,))
            total_comments = comments_result[0]['total'] if comments_result else 0
        except Exception as e:
            logger.warning(f"Error fetching total comments for post {post_id}: {e}")
            total_comments = 0
        
        return PostAnalytics(
            user_analytics=user_analytics,
            total_views=total_views,
            total_reactions=total_reactions,
            total_comments=total_comments
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching post analytics for {post_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching post analytics: {str(e)}")

@router.post("/", response_model=PostPublic)
async def create_post(
    post_data: PostCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """Create a new post (requires authentication)"""
    try:
        # Use authenticated user as author
        author_id = current_user.get("user_id")

        logger.info(f"Creating post with type: {post_data.post_type}, tags: {post_data.tags}")

        # Convert Post model to database format
        import uuid
        import hashlib
        import re
        
        # Generate title if not provided first
        title = post_data.title
        if not title:
            if post_data.post_type == PostType.THOUGHTS:
                # For thoughts, use first 50 characters of content as title
                content_preview = str(post_data.content)[:50]
                title = f"{content_preview}..." if len(str(post_data.content)) > 50 else content_preview
            else:
                # For other types, use a default title
                title = f"Untitled {post_data.post_type.value.replace('-', ' ').title()}"
        
        # Generate post_id based on type
        if post_data.post_type == PostType.THOUGHTS:
            # Thoughts: Keep existing hash-based ID
            base_uuid = str(uuid.uuid4())
            hash_id = hashlib.sha256(base_uuid.encode()).hexdigest()[:8]
            post_id = f"thought-{hash_id}"
        else:
            # Posts: Create slug-like ID from title + hash
            # Clean title: lowercase, replace spaces/special chars with hyphens, remove extra hyphens
            title_slug = re.sub(r'[^a-zA-Z0-9\s-]', '', title.lower())  # Remove special chars
            title_slug = re.sub(r'\s+', '-', title_slug)  # Replace spaces with hyphens
            title_slug = re.sub(r'-+', '-', title_slug)  # Replace multiple hyphens with single
            title_slug = title_slug.strip('-')  # Remove leading/trailing hyphens
            
            # Take first characters of slug to ensure total length stays under 50
            # Formula: title_part + "-" + hash(8) = max 47 chars for post_id  
            # Content ID is now a UUID, so no length constraints from that
            title_part = title_slug[:38].rstrip('-')  # 38 + 1 + 8 = 47 chars for post_id
            
            # Generate 8-character hash for uniqueness
            base_uuid = str(uuid.uuid4())
            hash_id = hashlib.sha256(base_uuid.encode()).hexdigest()[:8]
            
            # Combine: title-slug + hash
            post_id = f"{title_part}-{hash_id}" if title_part else f"post-{hash_id}"
            
            # Log the generated post_id
            logger.debug(f"Generated post_id: '{post_id}' (length: {len(post_id)})")
        
        # Generate feed content
        feed_content = str(post_data.content)[:100] + "..." if len(str(post_data.content)) > 100 else str(post_data.content)

        # Prepare data for database (convert Pydantic model to dict with correct field names)
        db_post_data = {
            'id': post_id,
            'post_type_id': post_data.post_type.value,  # Convert enum to string value
            'title': title,
            'content': post_data.content,
            "feed_content": feed_content,
            'author_id': author_id,
            'status': post_data.status.value,  # Convert enum to string value
            'created_by': author_id,
            'updated_by': author_id,
            'revision': 0,
            'read_time': 0
        }

        # Create the post in the database
        created_post_id = await db.create_post(db_post_data)
        logger.info(f"Post created with ID: {created_post_id}")

        # Handle tags if provided
        if post_data.tags:
            await db.associate_tags_with_post(author_id, created_post_id, post_data.tags)
            logger.debug(f"Associated {len(post_data.tags)} tags with post {created_post_id}")

        # Fetch the created post to return the proper response
        created_post = await db.get_post_by_id(created_post_id)
        
        if not created_post:
            raise HTTPException(status_code=500, detail="Failed to retrieve created post")
        
        # Transform database fields to match PostPublic model
        try:
            transformed_post = {
                'id': created_post['id'],
                'title': created_post['title'],
                'content': created_post.get('content') or '',  # Ensure content is never None
                'author_id': created_post['author_id'],
                'author_name': created_post['display_name'],
                'author_username': created_post['username'],
                'post_type': PostType(created_post['post_type_id']),  # Convert string to enum
                'status': PostStatus(created_post['status']),  # Convert string to enum
                'tags': [
                        {"id": tag.strip(), "name": tag.strip(), "color": "#24A890"}
                        for tag in created_post.get('tags', '').split(',') if tag.strip()
                    ] if created_post.get('tags') else [],
                'is_document': False,  # Default value since not in DB schema
                'project_id': created_post.get('project_id'),
                'git_url': created_post.get('git_url'),
                'view_count': created_post.get('view_count', 0),  # Use actual view count
                'like_count': 0,  # New posts have no reactions yet
                'comment_count': created_post.get('comment_count', 0),  # Use actual comment count
                'revision': created_post.get('revision', 0),  # Include revision for detailed response
                'created_at': created_post['created_ts'],
                'updated_at': created_post['updated_ts'],
                'published_at': None  # TODO: Add published timestamp logic
            }
            
            return PostPublic(**transformed_post)
            
        except Exception as transform_error:
            logger.error(f"❌ Error during post transformation: {str(transform_error)}")
            logger.error(f"🔍 Raw post data: {created_post}")
            raise HTTPException(status_code=500, detail=f"Error transforming post data: {str(transform_error)}")
    except Exception as e:
        logger.error(f"Error creating post: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating post: {str(e)}")

@router.post("/{post_id}", response_model=PostPublic)
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
        
        # Update post data first
        updated_post = await db.update_post(post_id, updates)
        
        if not updated_post:
            raise HTTPException(status_code=404, detail="Post not found after update")
        
        # Handle tags update if provided
        if post_data.tags is not None:
            logger.debug(f"Updating tags for post {post_id}: {post_data.tags}")
            await db.update_post_tags(current_user.get("user_id"), post_id, post_data.tags)
            # Fetch updated post to get the new tags
            updated_post = await db.get_post_by_id(post_id)
        
        # Transform database fields to match PostPublic model
        transformed_post = {
            'id': updated_post['id'],
            'title': updated_post['title'],
            'content': updated_post.get('content') or '',
            'author_id': updated_post['author_id'],
            'author_name': updated_post['display_name'],
            'author_username': updated_post['username'],
            'post_type': PostType(updated_post['post_type_id']),
            'status': PostStatus(updated_post['status']),
            'tags': [
                {"id": tag.strip(), "name": tag.strip(), "color": "#24A890"}
                for tag in updated_post.get('tags', '').split(',') if tag.strip()
            ] if updated_post.get('tags') else [],
            'is_document': False,
            'project_id': updated_post.get('project_id'),
            'git_url': updated_post.get('git_url'),
            'view_count': updated_post.get('view_count', 0),  # Use actual view count
            'like_count': 0,  # TODO: Get reaction count for individual post
            'comment_count': updated_post.get('comment_count', 0),  # Use actual comment count
            'revision': updated_post.get('revision', 0),  # Include revision for detailed response
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
