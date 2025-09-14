"""
File Caching Utility
Provides file caching functionality for database-stored files
"""
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from fastapi import Response

logger = logging.getLogger(__name__)

# Cache configuration
CACHE_DIR = Path("/tmp/docverse_files")
CACHE_DIR.mkdir(exist_ok=True)

def get_cache_path(file_id: str) -> Path:
    """Get the cache file path for a given file ID"""
    return CACHE_DIR / f"{file_id}.cache"

def get_metadata_cache_path(file_id: str) -> Path:
    """Get the metadata cache file path for a given file ID"""
    return CACHE_DIR / f"{file_id}.meta"

async def get_cached_file(file_id: str) -> Optional[Tuple[bytes, Dict[str, Any]]]:
    """
    Get cached file data and metadata
    Returns: (file_data, metadata) if cached, None if not cached
    """
    try:
        cache_path = get_cache_path(file_id)
        metadata_path = get_metadata_cache_path(file_id)
        
        if cache_path.exists() and metadata_path.exists():
            logger.info(f"📦 Cache hit for file: {file_id}")
            
            # Read file data
            with open(cache_path, 'rb') as f:
                file_data = f.read()
            
            # Read metadata
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            return file_data, metadata
        
        return None
    except Exception as e:
        logger.error(f"❌ Cache read failed for {file_id}: {e}")
        return None

async def cache_file(file_id: str, file_data: bytes, metadata: Dict[str, Any]) -> None:
    """
    Cache file data and metadata
    """
    try:
        cache_path = get_cache_path(file_id)
        metadata_path = get_metadata_cache_path(file_id)
        
        # Write file data
        with open(cache_path, 'wb') as f:
            f.write(file_data)
        
        # Write metadata
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f)
        
        logger.info(f"💾 Cached file: {file_id}")
    except Exception as e:
        logger.error(f"❌ Cache write failed for {file_id}: {e}")

def create_file_response(file_data: bytes, metadata: Dict[str, Any]) -> Response:
    """
    Create a FastAPI Response from file data and metadata
    """
    return Response(
        content=file_data,
        media_type=metadata.get('content_type', 'application/octet-stream'),
        headers={
            "Content-Disposition": f"inline; filename=\"{metadata.get('original_filename', 'file')}\""
        }
    )

async def serve_cached_or_db_file(file_id: str, db_getter_func, access_checker_func=None, current_user=None):
    """
    Serve file from cache or database with caching
    
    Args:
        file_id: The file ID to serve
        db_getter_func: Function to get file from database (should return file_data dict or None)
        access_checker_func: Optional function to check access permissions (should return True/False or raise HTTPException)
        current_user: Current user data for access checking
    
    Returns:
        FastAPI Response with file content
    """
    # Try to get from cache first
    cached_result = await get_cached_file(file_id)
    if cached_result:
        file_data, metadata = cached_result
        return create_file_response(file_data, metadata)
    
    # Cache miss - get from database
    logger.info(f"💾 Cache miss for file: {file_id}, fetching from database")
    
    file_data = await db_getter_func(file_id)
    if not file_data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check access permissions if provided
    if access_checker_func:
        if current_user:
            access_checker_func(file_data, current_user)
        else:
            access_checker_func(file_data)
    
    # Cache the file for future requests
    metadata = {
        'content_type': file_data['content_type'],
        'original_filename': file_data['original_filename'],
        'visibility': file_data.get('visibility', 'private'),
        'uploaded_by': file_data.get('uploaded_by')
    }
    
    await cache_file(file_id, file_data['file_data'], metadata)
    
    return create_file_response(file_data['file_data'], metadata)
