"""Weekly Digest Job"""
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any
from jinja2 import Template

from ...utils.logger import get_logger
from ...services.database.factory import DatabaseServiceFactory
from ...services.email_service import get_email_service
from ...config.settings import settings

logger = get_logger("WeeklyDigest", level="DEBUG", json_format=False)

# Load template
TEMPLATE_PATH = settings.base_dir / "src" / "config" / "digest_template.html"


def _format_date(timestamp: str) -> str:
    """Format timestamp for display"""
    try:
        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        return dt.strftime("%b %d, %Y")
    except:
        return timestamp


def _get_excerpt(content: str, max_length: int = 150) -> str:
    """Get excerpt from content"""
    if not content:
        return ""
    if len(content) <= max_length:
        return content
    return content[:max_length].rsplit(' ', 1)[0] + "..."


async def _get_user_favorite_tags(db, user_id: str) -> List[str]:
    """Get list of tag IDs that the user has favorited"""
    logger.debug(f"Fetching favorite tags for user {user_id}")
    query = """
        SELECT DISTINCT r.target_id
        FROM reactions r
        INNER JOIN event_types et ON r.event_type_id = et.id
        WHERE r.user_id = ? AND r.target_type = 'tag' AND et.id = 'event-favorite'
    """
    
    if settings.database_type == "postgresql":
        query = db._convert_placeholders(query)
        results = await db.execute_query(query, (user_id,))
    else:
        results = await db.execute_query(query, (user_id,))
    
    tag_ids = [row['target_id'] for row in results] if results else []
    logger.debug(f"Found {len(tag_ids)} favorite tags for user {user_id}")
    return tag_ids


async def _get_posts_from_favorite_tags(db, user_id: str, favorite_tags: List[str], since_date: datetime) -> List[Dict[str, Any]]:
    """Get posts from user's favorite tags created in the last week"""
    if not favorite_tags:
        logger.debug(f"User {user_id} has no favorite tags, skipping favorite posts query")
        return []
    
    logger.debug(f"Fetching posts from {len(favorite_tags)} favorite tags for user {user_id} since {since_date}")
    
    # Build query to get posts from favorite tags
    placeholders = ','.join(['?' for _ in favorite_tags])
    
    # Database-specific SQL
    if settings.database_type == "postgresql":
        tags_query = "SELECT string_agg(tt.name, ', ') FROM post_tags ptg JOIN tag_types tt ON ptg.tag_id = tt.id WHERE ptg.post_id = p.id"
        is_current = "TRUE"
        is_latest = "TRUE"
        is_deleted = "FALSE"
    else:
        tags_query = "SELECT GROUP_CONCAT(tt.name, ', ') FROM post_tags ptg JOIN tag_types tt ON ptg.tag_id = tt.id WHERE ptg.post_id = p.id"
        is_current = "1"
        is_latest = "1"
        is_deleted = "0"
    
    query = f"""
        SELECT DISTINCT p.id, p.title, p.author_id, u.display_name as author_name,
               COALESCE(pc.content, p.feed_content, '') as content,
               p.created_ts,
               ({tags_query}) as tags,
               COALESCE(
                   (SELECT COUNT(*) FROM user_events ue WHERE ue.target_id = p.id AND ue.target_type = 'post' AND ue.event_type_id = 'event-view'),
                   0
               ) as view_count,
               COALESCE(
                   (SELECT COUNT(*) FROM reactions r WHERE r.target_id = p.id AND r.target_type = 'post'),
                   0
               ) as like_count,
               COALESCE(
                   (SELECT COUNT(*) FROM post_discussions pd WHERE pd.post_id = p.id AND pd.is_deleted = {is_deleted}),
                   0
               ) as comment_count
        FROM posts p
        JOIN users u ON p.author_id = u.id
        LEFT JOIN posts_content pc ON p.id = pc.post_id AND pc.is_current = {is_current}
        JOIN post_tags pt ON p.id = pt.post_id
        WHERE pt.tag_id IN ({placeholders})
          AND p.status = 'published'
          AND p.is_latest = {is_latest}
          AND p.created_ts >= ?
        ORDER BY p.created_ts DESC
        LIMIT 5
    """
    
    params = tuple(favorite_tags) + (since_date if settings.database_type == "postgresql" else since_date.isoformat(),)
    
    if settings.database_type == "postgresql":
        query = db._convert_placeholders(query)
        results = await db.execute_query(query, params)
    else:
        results = await db.execute_query(query, params)
    
    logger.debug(f"Found {len(results) if results else 0} posts from favorite tags for user {user_id}")
    return results or []


async def _get_trending_posts(db, since_date: datetime, limit: int = 5) -> List[Dict[str, Any]]:
    """Get trending posts from the last week"""
    logger.debug(f"Fetching top {limit} trending posts since {since_date}")
    # Database-specific SQL
    if settings.database_type == "postgresql":
        tags_query = "SELECT string_agg(tt.name, ', ') FROM post_tags ptg JOIN tag_types tt ON ptg.tag_id = tt.id WHERE ptg.post_id = p.id"
        is_current = "TRUE"
        is_latest = "TRUE"
        is_deleted = "FALSE"
    else:
        tags_query = "SELECT GROUP_CONCAT(tt.name, ', ') FROM post_tags ptg JOIN tag_types tt ON ptg.tag_id = tt.id WHERE ptg.post_id = p.id"
        is_current = "1"
        is_latest = "1"
        is_deleted = "0"
    
    query = f"""
        SELECT p.id, p.title, p.author_id, u.display_name as author_name,
               COALESCE(pc.content, p.feed_content, '') as content,
               p.created_ts,
               ({tags_query}) as tags,
               COALESCE(
                   (SELECT COUNT(*) FROM user_events ue WHERE ue.target_id = p.id AND ue.target_type = 'post' AND ue.event_type_id = 'event-view'),
                   0
               ) as view_count,
               COALESCE(
                   (SELECT COUNT(*) FROM reactions r WHERE r.target_id = p.id AND r.target_type = 'post'),
                   0
               ) as like_count,
               COALESCE(
                   (SELECT COUNT(*) FROM post_discussions pd WHERE pd.post_id = p.id AND pd.is_deleted = {is_deleted}),
                   0
               ) as comment_count
        FROM posts p
        JOIN users u ON p.author_id = u.id
        LEFT JOIN posts_content pc ON p.id = pc.post_id AND pc.is_current = {is_current}
        WHERE p.status = 'published'
          AND p.is_latest = {is_latest}
          AND p.created_ts >= ?
        ORDER BY (
            COALESCE((SELECT COUNT(*) FROM user_events ue WHERE ue.target_id = p.id AND ue.target_type = 'post' AND ue.event_type_id = 'event-view'), 0) * 1 +
            COALESCE((SELECT COUNT(*) FROM reactions r WHERE r.target_id = p.id AND r.target_type = 'post'), 0) * 5 +
            COALESCE((SELECT COUNT(*) FROM post_discussions pd WHERE pd.post_id = p.id AND pd.is_deleted = {is_deleted}), 0) * 10
        ) DESC
        LIMIT ?
    """
    
    if settings.database_type == "postgresql":
        query = db._convert_placeholders(query)
        results = await db.execute_query(query, (since_date, limit))
    else:
        results = await db.execute_query(query, (since_date.isoformat(), limit))
    
    logger.debug(f"Found {len(results) if results else 0} trending posts")
    return results or []


async def _get_recent_comments(db, since_date: datetime, limit: int = 5) -> List[Dict[str, Any]]:
    """Get recent comments/discussions from the last week"""
    logger.debug(f"Fetching top {limit} recent comments since {since_date}")
    is_deleted_check = "FALSE" if settings.database_type == "postgresql" else "0"
    query = f"""
        SELECT pd.id, pd.content, pd.created_ts,
               u.display_name as author_name,
               p.id as post_id, p.title as post_title
        FROM post_discussions pd
        JOIN users u ON pd.author_id = u.id
        JOIN posts p ON pd.post_id = p.id
        WHERE pd.is_deleted = {is_deleted_check}
          AND pd.created_ts >= ?
        ORDER BY pd.created_ts DESC
        LIMIT ?
    """
    
    if settings.database_type == "postgresql":
        query = db._convert_placeholders(query)
        results = await db.execute_query(query, (since_date, limit))
    else:
        results = await db.execute_query(query, (since_date.isoformat(), limit))
    
    logger.debug(f"Found {len(results) if results else 0} recent comments")
    return results or []


async def _collect_user_digest_data(db, user_id: str, user_email: str, since_date: datetime) -> Dict[str, Any]:
    """Collect all data needed for a user's digest email"""
    logger.debug(f"Collecting digest data for user {user_id} ({user_email})")
    
    # Use asyncio.gather to fetch all data in parallel
    results = await asyncio.gather(
        _get_user_favorite_tags(db, user_id),
        _get_trending_posts(db, since_date, limit=5),
        _get_recent_comments(db, since_date, limit=5),
        return_exceptions=True
    )
    
    # Unpack results
    favorite_tags = results[0] if not isinstance(results[0], Exception) else []
    trending_posts = results[1] if not isinstance(results[1], Exception) else []
    recent_comments = results[2] if not isinstance(results[2], Exception) else []
    
    # Get posts from favorite tags if user has any
    favorite_posts = []
    if favorite_tags:
        favorite_posts = await _get_posts_from_favorite_tags(db, user_id, favorite_tags, since_date)
    
    logger.debug(f"  → Found {len(favorite_posts)} posts from favorite tags, {len(recent_comments)} comments, {len(trending_posts)} trending posts")
    
    return {
        "user_id": user_id,
        "user_email": user_email,
        "favorite_posts": favorite_posts,
        "trending_posts": trending_posts,
        "recent_comments": recent_comments
    }


def _render_digest_email(data: Dict[str, Any], date_range: str) -> str:
    """Render the digest email HTML from template"""
    logger.debug(f"Rendering digest email for user {data.get('user_id')} with {len(data.get('favorite_posts', []))} favorite posts, {len(data.get('trending_posts', []))} trending posts, {len(data.get('recent_comments', []))} comments")
    # Load template
    with open(TEMPLATE_PATH, 'r') as f:
        template = Template(f.read())
    
    # Prepare data for template
    base_url = settings.app_base_url or "http://localhost:3000"
    
    # Transform posts
    def transform_post(post):
        tags = post.get('tags', '').split(', ') if post.get('tags') else []
        return {
            'title': post['title'],
            'author_name': post['author_name'],
            'created_at': _format_date(post['created_ts']),
            'excerpt': _get_excerpt(post.get('content', '')),
            'tags': tags,
            'view_count': post.get('view_count', 0),
            'like_count': post.get('like_count', 0),
            'comment_count': post.get('comment_count', 0),
            'url': f"{base_url}/posts/{post['id']}?utm_source=email&utm_medium=digest&utm_campaign=weekly_digest"
        }
    
    favorite_posts = [transform_post(p) for p in data.get('favorite_posts', [])]
    trending_posts = [transform_post(p) for p in data.get('trending_posts', [])]
    
    # Transform comments
    recent_comments = []
    for comment in data.get('recent_comments', []):
        recent_comments.append({
            'author_name': comment['author_name'],
            'post_title': comment['post_title'],
            'created_at': _format_date(comment['created_ts']),
            'text': _get_excerpt(comment.get('content', ''), 200),
            'url': f"{base_url}/posts/{comment['post_id']}?utm_source=email&utm_medium=digest&utm_campaign=weekly_digest&utm_content=discussion"
        })
    
    # Check if we have any content
    has_content = bool(favorite_posts or recent_comments)
    
    logger.debug(f"Rendering template with has_content={has_content}")
    
    # Render template
    html = template.render(
        date_range=date_range,
        has_content=has_content,
        favorite_posts=favorite_posts,
        trending_posts=trending_posts,
        recent_comments=recent_comments,
        app_base_url=base_url,
        unsubscribe_url=f"{base_url}/settings/notifications?utm_source=email&utm_medium=digest&utm_campaign=weekly_digest&utm_content=unsubscribe",
        settings_url=f"{base_url}/settings?utm_source=email&utm_medium=digest&utm_campaign=weekly_digest&utm_content=settings"
    )
    
    logger.debug(f"Template rendered successfully, HTML length: {len(html)} chars")
    return html


async def send_weekly_digest():
    """Send weekly digest emails to users"""
    logger.info("📧 Starting weekly digest job...")
    
    try:
        db = DatabaseServiceFactory.create_service()
        email_service = get_email_service()
        
        # Calculate date range (last 7 days)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        date_range = f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d, %Y')}"
        
        logger.info(f"  → Date range: {date_range}")
        
        # Get all active users who haven't received digest in last 7 days
        query = """
            SELECT u.id, u.email, u.username
            FROM users u
            WHERE u.email IS NOT NULL
              AND u.email != ''
              AND NOT EXISTS (
                  SELECT 1 FROM user_events ue
                  INNER JOIN event_types et ON ue.event_type_id = et.id
                  WHERE ue.user_id = u.id
                    AND et.id = 'event-digest-email'
                    AND ue.created_ts >= ?
              )
            ORDER BY u.created_ts
        """
        
        if settings.database_type == "postgresql":
            query = db._convert_placeholders(query)
            users = await db.execute_query(query, (start_date,))
        else:
            users = await db.execute_query(query, (start_date.isoformat(),))
        
        if not users:
            logger.info("  → No users to send digest to")
            return
        
        logger.info(f"  → Found {len(users)} users to send digest to")
        
        # Process in batches of 50
        batch_size = 50
        total_sent = 0
        total_failed = 0
        
        for i in range(0, len(users), batch_size):
            batch = users[i:i + batch_size]
            logger.info(f"  → Processing batch {i // batch_size + 1}/{(len(users) + batch_size - 1) // batch_size} ({len(batch)} users)")
            
            # Collect data for all users in batch (parallel)
            digest_data_tasks = [
                _collect_user_digest_data(db, user['id'], user['email'], start_date)
                for user in batch
            ]
            batch_digest_data = await asyncio.gather(*digest_data_tasks, return_exceptions=True)
            
            # Prepare emails
            emails_to_send = []
            for user, digest_data in zip(batch, batch_digest_data):
                if isinstance(digest_data, Exception):
                    logger.error(f"  → Error collecting data for user {user['id']}: {digest_data}")
                    continue
                
                try:
                    # Render email
                    html_content = _render_digest_email(digest_data, date_range)
                    emails_to_send.append((user['email'], f"Your Weekly Digest - {date_range}", html_content, user['id']))
                    logger.debug(f"  → Prepared digest for {user['email']}")
                except Exception as e:
                    logger.error(f"  → Error rendering email for user {user['id']}: {e}")
            
            logger.info(f"  → Sending {len(emails_to_send)} emails from this batch...")
            
            # Send emails in batch
            for email, subject, html_content, user_id in emails_to_send:
                logger.debug(f"  → Sending digest to {email}...")
                success = await email_service.send_html_email(email, subject, html_content)
                
                if success:
                    # Log event that digest was sent
                    try:
                        await db.log_user_event(
                            user_id=user_id,
                            event_type_id='event-digest-email',
                            target_type='system',
                            target_id='weekly-digest',
                            metadata={'date_range': date_range}
                        )
                        total_sent += 1
                        logger.debug(f"  → Successfully sent and logged digest for user {user_id}")
                    except Exception as e:
                        logger.warning(f"  → Failed to log digest event for user {user_id}: {e}")
                        total_sent += 1  # Still count as sent
                else:
                    total_failed += 1
                    logger.warning(f"  → Failed to send digest to {email} (user {user_id})")
            
            # Small delay between batches
            if i + batch_size < len(users):
                logger.debug(f"  → Waiting 10s before next batch...")
                await asyncio.sleep(10)
        
        logger.info(f"✅ Weekly digest job completed: {total_sent} sent, {total_failed} failed out of {len(users)} total")
        
    except Exception as e:
        logger.error(f"❌ Error in weekly digest job: {e}", exc_info=True)
        raise
