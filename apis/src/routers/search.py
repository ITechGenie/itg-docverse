"""
Search API Router
Handles both semantic search (with Ollama embeddings) and traditional database search with fallback
"""

import json
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from pydantic import BaseModel
import ollama
import numpy as np
import redis
import asyncio

from ..services.database.factory import DatabaseServiceFactory
from ..services.database.base import DatabaseService
from ..middleware.dependencies import get_current_user_from_middleware
from ..utils.logger import get_logger
from ..config.settings import get_settings

router = APIRouter()

# Global services
settings = get_settings()
logger = get_logger("SearchAPI", level="DEBUG", json_format=False)

async def get_db_service() -> DatabaseService:
    """Dependency to get database service - using singleton pattern"""
    return DatabaseServiceFactory.create_service()

# Redis connection for vector storage (only if AI search is enabled)
redis_client = None
if settings.enable_ai_search:
    try:
        redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            decode_responses=False  # Keep binary for vector data
        )
        # Test connection
        redis_client.ping()
        logger.info("Redis connection established for AI search")
    except Exception as e:
        logger.warning(f"Redis connection failed, AI search will be disabled: {e}")
        redis_client = None

# Ollama configuration (only set if AI search is enabled)
OLLAMA_MODEL = settings.ollama_model if settings.enable_ai_search else None
VECTOR_DIMENSION = 768  # nomic-embed-text produces 768-dimensional vectors

class IndexRequest(BaseModel):
    force_reindex: bool = False
    post_types: Optional[List[str]] = None  # Optional filter for specific post types

class SearchRequest(BaseModel):
    query: str
    limit: int = 10
    similarity_threshold: float = 0.7
    post_types: Optional[List[str]] = None

class SearchResult(BaseModel):
    post_id: str
    title: str
    content_snippet: str
    author_name: str
    post_type: str
    tags: List[str]
    created_at: str
    similarity_score: Optional[float] = None  # Optional for traditional search

class IndexStatus(BaseModel):
    trigger_id: str
    status: str
    total_posts: int
    processed_posts: int
    failed_posts: int
    created_at: str
    updated_at: str

async def traditional_database_search(
    query: str, 
    limit: int = 10, 
    post_types: Optional[List[str]] = None,
    db_service: DatabaseService = None
) -> List[Dict[str, Any]]:
    """
    Traditional database search using SQL LIKE queries
    Fallback when AI search is disabled or unavailable
    """
    try:
        # Get database-specific settings
        settings = get_settings()
        
        if settings.database_type == "postgresql":
            # PostgreSQL - use string_agg and TRUE
            tag_aggregation = "string_agg(tt.name, ', ')"
            is_active = "TRUE"
            is_latest = "TRUE"
        else:
            # SQLite - use GROUP_CONCAT and 1
            tag_aggregation = "GROUP_CONCAT(tt.name)"
            is_active = "1"
            is_latest = "1"

        # Prepare base SQL query with LIKE search
        base_query = f"""
            SELECT 
                p.id,
                p.title,
                COALESCE(pc.content, p.feed_content, '') as content,
                p.post_type_id,
                p.created_ts,
                p.updated_ts,
                u.display_name as author_name,
                u.username as author_username,
                {tag_aggregation} as tags
            FROM posts p
            LEFT JOIN users u ON p.author_id = u.id
            LEFT JOIN posts_content pc ON p.id = pc.post_id AND pc.is_current = {is_latest}
            LEFT JOIN post_tags pt ON p.id = pt.post_id
            LEFT JOIN tag_types tt ON pt.tag_id = tt.id
            WHERE p.status = 'published' AND (
                p.title LIKE ? OR 
                COALESCE(pc.content, p.feed_content, '') LIKE ? OR
                tt.name LIKE ?
            )
        """
        
        params = [f"%{query}%", f"%{query}%", f"%{query}%"]
        
        # Add post type filter if specified
        if post_types:
            if settings.database_type == "postgresql":
                # PostgreSQL uses numbered placeholders
                start_param = len(params) + 1
                placeholders = ",".join([f"${i}" for i in range(start_param, start_param + len(post_types))])
            else:
                # SQLite uses ? placeholders
                placeholders = ",".join(["?" for _ in post_types])
            base_query += f" AND p.post_type_id IN ({placeholders})"
            params.extend(post_types)
        
        # Add grouping and ordering (simplified to avoid tt.name reference issues)
        base_query += """
            GROUP BY p.id, p.title, pc.content, p.feed_content, p.post_type_id, 
                     p.created_ts, p.updated_ts, u.display_name, u.username
            ORDER BY 
                CASE 
                    WHEN p.title LIKE {title_param} THEN 1
                    WHEN COALESCE(pc.content, p.feed_content, '') LIKE {content_param} THEN 2
                    ELSE 3
                END,
                p.created_ts DESC
            LIMIT {limit_param}
        """
        
        # Add ordering parameters and format based on database type
        if settings.database_type == "postgresql":
            # PostgreSQL numbered parameters
            next_param = len(params) + 1
            base_query = base_query.format(
                title_param=f"${next_param}",
                content_param=f"${next_param + 1}",
                limit_param=f"${next_param + 2}"
            )
            # Convert existing ? to numbered parameters
            for i, param in enumerate(params):
                base_query = base_query.replace("?", f"${i + 1}", 1)
        else:
            # SQLite ? parameters
            base_query = base_query.format(
                title_param="?",
                content_param="?", 
                limit_param="?"
            )
        
        params.extend([f"%{query}%", f"%{query}%", limit])
        
        # Execute query
        logger.debug(f"Executing traditional search query: {base_query}")
        logger.debug(f"Query parameters: {params}")
        results = await db_service.execute_query(base_query, tuple(params))
        logger.debug(f"Query returned {len(results) if results else 0} results")
        
        if results:
            logger.debug(f"First result row: {results[0]}")
            logger.debug(f"First result row length: {len(results[0])}")
            for i, col in enumerate(results[0]):
                logger.debug(f"  Column {i}: {col} (type: {type(col)})")
        
        # Format results
        formatted_results = []
        if results:
            for row in results:
                try:
                    # Handle both tuple and dict-like row objects
                    if hasattr(row, 'keys'):
                        # Row object with named columns
                        content = row.get('content') or ""
                        content_snippet = content[:200] + "..." if len(content) > 200 else content
                        
                        # Parse tags  
                        tags = []
                        if row.get('tags') and str(row.get('tags')).strip():
                            tags = str(row.get('tags')).split(",")
                        
                        # Get author name with fallback
                        author_name = row.get('author_name') or row.get('author_username') or "Unknown"
                        
                        # Convert datetime objects to strings
                        created_at = row.get('created_ts', '')
                        if isinstance(created_at, datetime):
                            created_at = created_at.isoformat()
                        
                        updated_at = row.get('updated_ts', '')
                        if isinstance(updated_at, datetime):
                            updated_at = updated_at.isoformat()
                        
                        formatted_results.append({
                            "id": row.get('id', ''),
                            "title": row.get('title', ''),
                            "content_snippet": content_snippet,
                            "post_type": row.get('post_type_id', ''),
                            "author_name": author_name,
                            "tags": tags,
                            "created_at": created_at,
                            "updated_at": updated_at,
                            "search_type": "traditional",
                            "similarity_score": None
                        })
                    else:
                        # Tuple-like row object
                        if len(row) < 9:
                            logger.warning(f"Row has insufficient columns ({len(row)}): {row}")
                            continue
                        
                        # Create content snippet (first 200 chars)
                        content = row[2] or ""
                        content_snippet = content[:200] + "..." if len(content) > 200 else content
                        
                        # Parse tags  
                        tags = []
                        if row[8] and str(row[8]).strip():
                            tags = str(row[8]).split(",")
                        
                        # Get author name with fallback
                        author_name = row[6] or row[7] or "Unknown"
                        
                        # Convert datetime objects to strings
                        created_at = row[4] or ""
                        if isinstance(created_at, datetime):
                            created_at = created_at.isoformat()
                        
                        updated_at = row[5] or ""
                        if isinstance(updated_at, datetime):
                            updated_at = updated_at.isoformat()
                        
                        formatted_results.append({
                            "id": row[0],
                            "title": row[1] or "",
                            "content_snippet": content_snippet,
                            "post_type": row[3] or "",
                            "author_name": author_name,
                            "tags": tags,
                            "created_at": created_at,
                            "updated_at": updated_at,
                            "search_type": "traditional",
                            "similarity_score": None
                        })
                except Exception as row_error:
                    logger.error(f"Error processing row {row}: {str(row_error)}")
                    continue
        
        logger.info(f"Traditional search found {len(formatted_results)} results for query: {query}")
        return formatted_results
        
    except Exception as e:
        logger.error(f"Traditional search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

async def generate_embedding(text: str) -> List[float]:
    """Generate embedding using Ollama"""
    try:
        # Use ollama client to generate embeddings
        response = ollama.embeddings(
            model=OLLAMA_MODEL,
            prompt=text
        )
        return response['embedding']
    except Exception as e:
        logger.error(f"Failed to generate embedding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")

async def chunk_text(text: str, max_chunk_size: int = 1000) -> List[str]:
    """Split text into chunks for better search granularity"""
    if len(text) <= max_chunk_size:
        return [text]
    
    # Simple chunking by sentences, keeping it under max_chunk_size
    sentences = text.split('. ')
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        if len(current_chunk + sentence) <= max_chunk_size:
            current_chunk += sentence + ". "
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence + ". "
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks if chunks else [text[:max_chunk_size]]

async def store_vector_in_redis(chunk_id: str, vector: List[float], metadata: Dict[str, Any]):
    """Store vector and metadata in Redis"""
    try:
        # Convert vector to numpy array and then to bytes
        vector_array = np.array(vector, dtype=np.float32)
        vector_bytes = vector_array.tobytes()
        
        # Store vector
        redis_client.hset(f"search:vector:{chunk_id}", "vector", vector_bytes)
        
        # Store metadata as JSON
        redis_client.hset(f"search:vector:{chunk_id}", "metadata", json.dumps(metadata))
        
        # Add to searchable index
        redis_client.sadd("search:chunks", chunk_id)
        
        logger.debug(f"Stored vector for chunk {chunk_id}")
        
    except Exception as e:
        logger.error(f"Failed to store vector in Redis: {str(e)}")
        raise

async def search_vectors_in_redis(query_vector: List[float], limit: int = 10, threshold: float = 0.7) -> List[Dict[str, Any]]:
    """Search for similar vectors in Redis"""
    try:
        query_array = np.array(query_vector, dtype=np.float32)
        results = []
        
        # Get all chunk IDs
        chunk_ids = redis_client.smembers("search:chunks")
        
        for chunk_id in chunk_ids:
            chunk_id = chunk_id.decode('utf-8') if isinstance(chunk_id, bytes) else chunk_id
            
            # Get vector and metadata
            vector_bytes = redis_client.hget(f"search:vector:{chunk_id}", "vector")
            metadata_json = redis_client.hget(f"search:vector:{chunk_id}", "metadata")
            
            if vector_bytes and metadata_json:
                # Convert bytes back to numpy array
                stored_vector = np.frombuffer(vector_bytes, dtype=np.float32)
                
                # Calculate cosine similarity
                similarity = np.dot(query_array, stored_vector) / (np.linalg.norm(query_array) * np.linalg.norm(stored_vector))
                
                if similarity >= threshold:
                    metadata = json.loads(metadata_json.decode('utf-8') if isinstance(metadata_json, bytes) else metadata_json)
                    results.append({
                        "chunk_id": chunk_id,
                        "similarity": float(similarity),
                        "metadata": metadata
                    })
        
        # Sort by similarity (highest first) and limit
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:limit]
        
    except Exception as e:
        logger.error(f"Failed to search vectors in Redis: {str(e)}")
        raise

async def get_posts_to_index(db_service: DatabaseService, force_reindex: bool = False, post_types: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """Get posts that need to be indexed"""
    try:
        # Get database-specific aggregation function
        settings = get_settings()
        if settings.database_type == "postgresql":
            tag_aggregation = "string_agg(tt.name, ', ')"
            is_current = "TRUE"
        else:
            tag_aggregation = "GROUP_CONCAT(tt.name)"
            is_current = "1"

        # Build the query based on parameters
        if force_reindex:
            # Get all published posts
            if post_types:
                if settings.database_type == "postgresql":
                    # Use numbered placeholders for PostgreSQL
                    placeholders = ', '.join([f'${i+1}' for i in range(len(post_types))])
                else:
                    # Use ? placeholders for SQLite
                    placeholders = ', '.join(['?' for _ in post_types])
                
                posts_query = f"""
                    SELECT p.id, p.title, p.post_type_id, p.author_id, p.created_ts,
                           pc.content, u.display_name as author_name,
                           {tag_aggregation} as tags
                    FROM posts p
                    JOIN posts_content pc ON p.id = pc.post_id AND pc.is_current = {is_current}
                    JOIN users u ON p.author_id = u.id
                    LEFT JOIN post_tags pt ON p.id = pt.post_id
                    LEFT JOIN tag_types tt ON pt.tag_id = tt.id
                    WHERE p.status = 'published' AND p.post_type_id IN ({placeholders})
                    GROUP BY p.id
                """
                
                posts = await db_service.execute_query(posts_query, tuple(post_types))
            else:
                posts_query = f"""
                    SELECT p.id, p.title, p.post_type_id, p.author_id, p.created_ts,
                           pc.content, u.display_name as author_name,
                           {tag_aggregation} as tags
                    FROM posts p
                    JOIN posts_content pc ON p.id = pc.post_id AND pc.is_current = {is_current}
                    JOIN users u ON p.author_id = u.id
                    LEFT JOIN post_tags pt ON p.id = pt.post_id
                    LEFT JOIN tag_types tt ON pt.tag_id = tt.id
                    WHERE p.status = 'published'
                    GROUP BY p.id
                """
                posts = await db_service.execute_query(posts_query, ())
        else:
            # Get only posts not yet indexed (not in kb_indexes with generation_type = 'semantic-search')
            posts_query = f"""
                SELECT p.id, p.title, p.post_type_id, p.author_id, p.created_ts,
                       pc.content, u.display_name as author_name,
                       {tag_aggregation} as tags
                FROM posts p
                JOIN posts_content pc ON p.id = pc.post_id AND pc.is_current = {is_current}
                JOIN users u ON p.author_id = u.id
                LEFT JOIN post_tags pt ON p.id = pt.post_id
                LEFT JOIN tag_types tt ON pt.tag_id = tt.id
                LEFT JOIN kb_indexes ki ON p.id = ki.post_id AND ki.generation_type = 'semantic-search'
                WHERE p.status = 'published' AND ki.post_id IS NULL
                GROUP BY p.id
            """
            posts = await db_service.execute_query(posts_query, ())
        
        logger.info(f"Found {len(posts)} posts to index")
        return posts
        
    except Exception as e:
        logger.error(f"Failed to get posts to index: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get posts: {str(e)}")

async def create_index_trigger(db_service: DatabaseService, user_id: str, expected_posts: int) -> str:
    """Create a new index trigger record"""
    trigger_id = f"search-trigger-{uuid.uuid4()}"
    
    insert_query = """
        INSERT INTO kb_index_triggers 
        (id, kb_id, triggered_by, trigger_type, trigger_context, expected_generations, overall_status, total_expected, created_ts)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    
    await db_service.execute_command(insert_query, (
        trigger_id,
        'semantic-search-kb',  # Virtual KB for search indexing
        user_id,
        'manual',
        json.dumps({"operation": "semantic_search_indexing"}),
        json.dumps(["semantic-search"]),
        'processing',
        expected_posts,
        datetime.utcnow().isoformat()
    ))
    
    return trigger_id

async def update_trigger_status(db_service: DatabaseService, trigger_id: str, status: str, processed_count: int):
    """Update trigger status"""
    update_query = """
        UPDATE kb_index_triggers 
        SET overall_status = ?, updated_ts = ?
        WHERE id = ?
    """
    await db_service.execute_command(update_query, (status, datetime.utcnow().isoformat(), trigger_id))

async def create_kb_index_record(db_service: DatabaseService, trigger_id: str, post_id: str, user_id: str, status: str = 'completed'):
    """Create KB index record for processed post"""
    kb_index_id = f"search-idx-{uuid.uuid4()}"
    
    insert_query = """
        INSERT INTO kb_indexes 
        (id, trigger_id, post_id, generation_type, generation_status, created_by, created_ts)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """
    
    await db_service.execute_command(insert_query, (
        kb_index_id,
        trigger_id,
        post_id,
        'semantic-search',
        status,
        user_id,
        datetime.utcnow().isoformat()
    ))

async def process_posts_for_indexing(db_service: DatabaseService, trigger_id: str, posts: List[Dict[str, Any]], user_id: str):
    """Background task to process posts for indexing"""
    try:
        processed_count = 0
        failed_count = 0
        
        for post in posts:
            try:
                post_id = post['id']
                title = post['title'] or ""
                content = post['content'] or ""
                author_name = post['author_name'] or ""
                post_type = post['post_type_id'] or ""
                tags = post['tags'].split(',') if post['tags'] else []
                created_at = post['created_ts'] or ""
                
                # Combine title and content for embedding
                full_text = f"{title}\n\n{content}"
                
                # Chunk the text
                chunks = await chunk_text(full_text)
                
                for chunk_index, chunk in enumerate(chunks):
                    # Generate embedding
                    embedding = await generate_embedding(chunk)
                    
                    # Create chunk metadata
                    chunk_id = f"{post_id}-chunk-{chunk_index}"
                    metadata = {
                        "post_id": post_id,
                        "chunk_index": chunk_index,
                        "title": title,
                        "content": chunk,
                        "author_name": author_name,
                        "post_type": post_type,
                        "tags": tags,
                        "created_at": created_at
                    }
                    
                    # Store in Redis
                    await store_vector_in_redis(chunk_id, embedding, metadata)
                
                # Record successful processing
                await create_kb_index_record(db_service, trigger_id, post_id, user_id, 'completed')
                processed_count += 1
                
                logger.info(f"Successfully indexed post {post_id} with {len(chunks)} chunks")
                
            except Exception as e:
                logger.error(f"Failed to process post {post['id']}: {str(e)}")
                await create_kb_index_record(db_service, trigger_id, post['id'], user_id, 'failed')
                failed_count += 1
        
        # Update trigger status
        final_status = 'completed' if failed_count == 0 else 'partial_failure'
        await update_trigger_status(db_service, trigger_id, final_status, processed_count)
        
        logger.info(f"Indexing completed: {processed_count} successful, {failed_count} failed")
        
    except Exception as e:
        logger.error(f"Critical error in indexing process: {str(e)}")
        await update_trigger_status(db_service, trigger_id, 'failed', 0)

@router.post("/index", response_model=Dict[str, Any])
async def index_posts(
    request: IndexRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """
    Index posts for semantic search (only available when AI search is enabled)
    """
    try:
        # Check if AI search is enabled FIRST
        if not settings.enable_ai_search:
            raise HTTPException(
                status_code=501, 
                detail="AI search is disabled. Indexing is not available. Traditional search is being used instead."
            )
        
        # Check if Redis is available
        if redis_client is None:
            raise HTTPException(
                status_code=503,
                detail="Redis vector storage is not available. Cannot perform indexing."
            )
        
        # Check if Ollama is available
        if OLLAMA_MODEL is None:
            raise HTTPException(
                status_code=503,
                detail="Ollama model is not configured. Cannot perform indexing."
            )
        
        user_id = current_user.get('user_id')
        
        # Get posts that need indexing
        posts_to_index = await get_posts_to_index(
            db,
            force_reindex=request.force_reindex,
            post_types=request.post_types
        )
        
        if not posts_to_index:
            return {
                "message": "No posts need indexing",
                "posts_count": 0,
                "trigger_id": None
            }
        
        # Create index trigger
        trigger_id = await create_index_trigger(db, user_id, len(posts_to_index))
        
        # Start background indexing
        background_tasks.add_task(
            process_posts_for_indexing, 
            db,
            trigger_id, 
            posts_to_index, 
            user_id
        )
        
        return {
            "message": f"Started indexing {len(posts_to_index)} posts",
            "posts_count": len(posts_to_index),
            "trigger_id": trigger_id,
            "status": "processing"
        }
        
    except Exception as e:
        logger.error(f"Index endpoint error: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/semantic", response_model=List[SearchResult])
async def semantic_search(
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, description="Maximum number of results"),
    threshold: float = Query(None, description="Similarity threshold (AI search only)"),
    post_types: Optional[str] = Query(None, description="Comma-separated post types to filter"),
    current_user: Dict = Depends(get_current_user_from_middleware),
    db: DatabaseService = Depends(get_db_service)
):
    """
    Perform search on posts - uses AI semantic search if available, falls back to traditional search
    """
    try:
        if not q.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        # Parse post types filter
        post_type_filter = post_types.split(',') if post_types else None
        
        # Use default threshold if not provided
        if threshold is None:
            threshold = settings.search_similarity_threshold
        
        # Check if AI search is enabled and available
        ai_search_available = (
            settings.enable_ai_search and 
            redis_client is not None
        )
        
        if ai_search_available:
            try:
                # Try AI semantic search first
                logger.info(f"Attempting AI semantic search for query: '{q}'")
                
                # Generate embedding for query
                query_embedding = await generate_embedding(q)
                
                # Search vectors
                search_results = await search_vectors_in_redis(query_embedding, limit * 2, threshold)  # Get more to allow filtering
                
                # Process and filter results
                final_results = []
                seen_posts = set()
                
                for result in search_results:
                    metadata = result["metadata"]
                    post_id = metadata["post_id"]
                    
                    # Skip if we've already included this post (multiple chunks)
                    if post_id in seen_posts:
                        continue
                    
                    # Filter by post type if specified
                    if post_type_filter and metadata["post_type"] not in post_type_filter:
                        continue
                    
                    # Create search result
                    search_result = SearchResult(
                        post_id=post_id,
                        title=metadata["title"],
                        content_snippet=metadata["content"][:200] + "..." if len(metadata["content"]) > 200 else metadata["content"],
                        author_name=metadata["author_name"],
                        post_type=metadata["post_type"],
                        tags=metadata["tags"],
                        created_at=metadata["created_at"],
                        similarity_score=result["similarity"]
                    )
                    
                    final_results.append(search_result)
                    seen_posts.add(post_id)
                    
                    if len(final_results) >= limit:
                        break
                
                logger.info(f"AI semantic search for '{q}' returned {len(final_results)} results")
                return final_results
                
            except Exception as ai_error:
                logger.warning(f"AI search failed, falling back to traditional search: {str(ai_error)}")
                # Fall through to traditional search
        
        # Fallback to traditional database search
        logger.info(f"Using traditional database search for query: '{q}'")
        
        # Use traditional search
        traditional_results = await traditional_database_search(q, limit, post_type_filter, db)
        
        # Convert to SearchResult format
        final_results = []
        for result in traditional_results:
            search_result = SearchResult(
                post_id=result["id"],
                title=result["title"],
                content_snippet=result["content_snippet"],
                author_name=result["author_name"],
                post_type=result["post_type"],
                tags=result["tags"],
                created_at=result["created_at"],
                similarity_score=result["similarity_score"]  # Will be None for traditional search
            )
            final_results.append(search_result)
        
        search_type = "traditional" if not ai_search_available else "traditional (AI fallback)"
        logger.info(f"{search_type} search for '{q}' returned {len(final_results)} results")
        return final_results
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{trigger_id}", response_model=IndexStatus)
async def get_index_status(
    trigger_id: str,
    current_user: Dict = Depends(get_current_user_from_middleware),
    db_service: DatabaseService = Depends(get_db_service)
):
    """
    Get indexing status for a trigger
    """
    try:
        # Get trigger status
        trigger_query = """
            SELECT overall_status, total_expected, created_ts, updated_ts
            FROM kb_index_triggers
            WHERE id = ?
        """
        trigger_result = await db_service.execute_query(trigger_query, (trigger_id,))
        
        if not trigger_result:
            raise HTTPException(status_code=404, detail="Trigger not found")
        
        trigger = trigger_result[0]
        
        # Count processed and failed posts
        processed_query = """
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN generation_status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN generation_status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM kb_indexes
            WHERE trigger_id = ? AND generation_type = 'semantic-search'
        """
        counts_result = await db_service.execute_query(processed_query, (trigger_id,))
        counts = counts_result[0] if counts_result else {"total": 0, "completed": 0, "failed": 0}
        
        return IndexStatus(
            trigger_id=trigger_id,
            status=trigger["overall_status"],
            total_posts=trigger["total_expected"],
            processed_posts=counts["completed"],
            failed_posts=counts["failed"],
            created_at=trigger["created_ts"],
            updated_at=trigger.get("updated_ts", trigger["created_ts"])
        )
        
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/index", response_model=Dict[str, str])
async def clear_search_index(
    current_user: Dict = Depends(get_current_user_from_middleware)
):
    """
    Clear all search vectors from Redis (admin operation)
    """
    try:
        # Get all chunk IDs
        chunk_ids = redis_client.smembers("search:chunks")
        
        # Delete all vectors
        for chunk_id in chunk_ids:
            chunk_id = chunk_id.decode('utf-8') if isinstance(chunk_id, bytes) else chunk_id
            redis_client.delete(f"search:vector:{chunk_id}")
        
        # Clear the chunks set
        redis_client.delete("search:chunks")
        
        logger.info(f"Cleared {len(chunk_ids)} search vectors from Redis")
        
        return {"message": f"Cleared {len(chunk_ids)} search vectors"}
        
    except Exception as e:
        logger.error(f"Clear index error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/debug/chunks", response_model=Dict[str, Any])
async def debug_indexed_chunks(
    current_user: Dict = Depends(get_current_user_from_middleware)
):
    """
    Debug endpoint to see what's indexed in Redis
    """
    try:
        # Get all chunk IDs
        chunk_ids = redis_client.smembers("search:chunks")
        
        chunks_info = []
        for chunk_id in list(chunk_ids)[:10]:  # Limit to first 10 for readability
            chunk_id = chunk_id.decode('utf-8') if isinstance(chunk_id, bytes) else chunk_id
            
            # Get metadata
            metadata_json = redis_client.hget(f"search:vector:{chunk_id}", "metadata")
            if metadata_json:
                metadata = json.loads(metadata_json.decode('utf-8') if isinstance(metadata_json, bytes) else metadata_json)
                chunks_info.append({
                    "chunk_id": chunk_id,
                    "post_id": metadata.get("post_id"),
                    "title": metadata.get("title"),
                    "content_preview": metadata.get("content", "")[:100] + "...",
                    "author_name": metadata.get("author_name"),
                    "post_type": metadata.get("post_type"),
                    "tags": metadata.get("tags", [])
                })
        
        return {
            "total_chunks": len(chunk_ids),
            "sample_chunks": chunks_info,
            "message": f"Found {len(chunk_ids)} indexed chunks"
        }
        
    except Exception as e:
        logger.error(f"Debug chunks error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/debug/test")
async def debug_test_endpoint():
    """Simple test endpoint to check if the router is working"""
    try:
        return {
            "message": "Debug endpoint working",
            "ai_enabled": settings.enable_ai_search,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Debug test error: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config", response_model=Dict[str, Any])
async def get_search_config(
    current_user: Dict = Depends(get_current_user_from_middleware)
):
    """
    Get current search configuration and status
    """
    try:
        # Check AI search availability
        ai_enabled = settings.enable_ai_search
        redis_available = redis_client is not None
        ollama_available = False
        
        # Test Ollama connection if AI search is enabled
        if ai_enabled:
            try:
                test_response = ollama.embeddings(
                    model=settings.ollama_model,
                    prompt="test"
                )
                ollama_available = len(test_response.get('embedding', [])) > 0
            except Exception as e:
                logger.warning(f"Ollama test failed: {e}")
                ollama_available = False
        
        # Get indexed content count if Redis is available
        indexed_chunks = 0
        if redis_available:
            try:
                chunk_ids = redis_client.smembers("search:chunk_ids")
                indexed_chunks = len(chunk_ids)
            except Exception:
                indexed_chunks = 0
        
        return {
            "ai_search_enabled": ai_enabled,
            "ai_search_available": ai_enabled and redis_available and ollama_available,
            "search_mode": "AI + Traditional" if (ai_enabled and redis_available and ollama_available) else "Traditional Only",
            "components": {
                "ollama": {
                    "available": ollama_available,
                    "host": settings.ollama_host,
                    "model": settings.ollama_model
                },
                "redis": {
                    "available": redis_available,
                    "host": settings.redis_host,
                    "port": settings.redis_port
                }
            },
            "settings": {
                "similarity_threshold": settings.search_similarity_threshold,
                "chunk_size": settings.search_chunk_size,
                "chunk_overlap": settings.search_chunk_overlap
            },
            "statistics": {
                "indexed_chunks": indexed_chunks
            },
            "fallback_info": "Traditional database search is always available as fallback"
        }
        
    except Exception as e:
        logger.error(f"Config endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
