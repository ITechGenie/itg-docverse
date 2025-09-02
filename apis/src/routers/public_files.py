"""
Public API Router to serve files 
Handles files endpoints that don't require JWT tokens
"""
from fastapi import APIRouter, Depends, HTTPException
from ..database.connection import get_database_service
from ..utils.logger import get_logger
from ..utils.file_cache import serve_cached_or_db_file

router = APIRouter()

logger = get_logger("PublicFilesAPI", level="INFO", json_format=False)

@router.get("/{file_id}")
@router.get("/{file_id}/{filename}")
async def get_public_file(
    file_id: str,
    filename: str = None,  # Optional filename for SEO/aesthetics
    db = Depends(get_database_service)
):
    """Serve public file content without authentication with caching"""
    try:
        # Access checker function for public files only
        def check_public_access(file_data: dict, user: dict = None):
            if file_data['visibility'] != 'public':
                from fastapi import HTTPException
                raise HTTPException(status_code=403, detail="File is not public")
        
        return await serve_cached_or_db_file(
            file_id=file_id,
            db_getter_func=db.get_content_upload,
            access_checker_func=check_public_access,
            current_user=None  # No user for public access
        )
        
    except Exception as e:
        logger.error(f"❌ Public file serve failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to serve file")
