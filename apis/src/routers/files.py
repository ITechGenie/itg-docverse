"""
File Upload Router
Handles image/file uploads with database storage and tagging
"""
import uuid
import os
import tempfile
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel, Field

from ..utils.logger import get_logger
from ..database.connection import get_database_service
from ..middleware.dependencies import get_current_user_from_middleware
from ..config.settings import settings
from ..utils.file_cache import serve_cached_or_db_file

router = APIRouter()
logger = get_logger("FilesAPI", level="INFO", json_format=False)

# Request/Response Models
class FileUploadResponse(BaseModel):
    id: str
    filename: str
    title: str
    url: str
    content_type: str
    file_size: int
    visibility: str
    tags: List[str]

class FileResponse(BaseModel):
    id: str
    filename: str
    title: str
    url: str
    content_type: str
    file_size: int
    visibility: str
    tags: List[str]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class FileMetadataUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    visibility: Optional[str] = Field(None, pattern="^(private|public|shared)$")
    tags: Optional[List[str]] = None

class MyImagesResponse(BaseModel):
    files: List[FileUploadResponse]
    total: int
    page: int
    limit: int

# Allowed file types
ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/gif", 
    "image/webp", "image/svg+xml", "image/bmp"
}

def validate_image_file(file: UploadFile) -> None:
    """Validate uploaded file"""
    if not file.content_type or file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )
    
    if file.size and file.size > settings.max_file_size:
        max_mb = settings.max_file_size / (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {max_mb:.1f}MB"
        )

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    visibility: str = Form("private"),
    current_user: dict = Depends(get_current_user_from_middleware),
    db = Depends(get_database_service)
):
    """Upload a file with metadata and tags"""
    try:
        logger.info(f"🔄 File upload started: {file.filename}")
        logger.info(f"👤 Current user: {current_user}")
        
        # Check if current_user has required fields
        if 'user_id' not in current_user:
            logger.error(f"❌ Current user missing 'user_id' field: {current_user}")
            raise HTTPException(status_code=401, detail="Invalid user session")
        
        # Validate file
        validate_image_file(file)
        
        # Parse tags
        import json
        try:
            tag_names = json.loads(tags) if tags else []
        except json.JSONDecodeError:
            tag_names = []
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
        filename = f"{file_id}.{file_extension}" if file_extension else file_id
        
        # Read file content
        file_content = await file.read()
        
        # Create upload record
        upload_data = {
            'id': file_id,
            'filename': filename,
            'original_filename': file.filename or 'untitled',
            'content_type': file.content_type,
            'file_size': len(file_content),
            'file_data': file_content,
            'uploaded_by': current_user['user_id'],
            'updated_by': current_user['user_id'],  # Add missing updated_by field
            'is_public': visibility == 'public',  # Add the missing is_public field
            'visibility': visibility,
            'title': title or file.filename or 'Untitled',
            'description': description,
            'created_by': current_user['user_id']
        }
        
        logger.info(f"📊 Upload data keys: {list(upload_data.keys())}")
        logger.info(f"💾 Saving file {file_id} to database")
        
        # Save to database with proper error handling
        try:
            await db.create_content_upload(upload_data)
            logger.info(f"✅ File saved to database: {file_id}")
        except Exception as db_error:
            logger.error(f"❌ Database save failed: {str(db_error)}")
            raise HTTPException(status_code=500, detail=f"Database save failed: {str(db_error)}")
        
        # Associate tags if provided with proper error handling
        if tag_names:
            try:
                await db.associate_tags_with_upload(current_user['user_id'], file_id, tag_names)
                logger.info(f"✅ Tags associated: {tag_names}")
            except Exception as tag_error:
                logger.error(f"❌ Tag association failed: {str(tag_error)}")
                # Don't fail the entire upload for tag errors, just log it
                logger.warning(f"Continuing without tags due to error: {tag_error}")
        
        # Get tags for response with error handling
        try:
            upload_tags = await db.get_upload_tags(file_id)
            tag_names = [tag['name'] for tag in upload_tags]
        except Exception as tag_get_error:
            logger.error(f"❌ Failed to get tags for response: {str(tag_get_error)}")
            tag_names = []  # Return empty tags if we can't fetch them
        
        # Determine the correct URL based on visibility with filename
        original_filename = file.filename or 'untitled'
        # Sanitize filename for URL
        sanitized_filename = original_filename.replace(' ', '-').replace('/', '-')
        file_url = f"/files/{file_id}/{sanitized_filename}" if visibility == 'public' else f"/apis/files/{file_id}/{sanitized_filename}"
        
        logger.info(f"✅ File uploaded: {file_id} by user {current_user['user_id']}")
        
        return FileUploadResponse(
            id=file_id,
            filename=file.filename or 'untitled',  # Use original filename as filename
            title=title or file.filename or 'Untitled',
            url=file_url,
            content_type=file.content_type,
            file_size=len(file_content),
            visibility=visibility,
            tags=tag_names
        )
        
    except HTTPException:
        logger.error(f"❌ File upload failed: {file.filename} - {file.content_type}")   
        raise
    except Exception as e:
        logger.error(f"❌ File upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Upload failed")

@router.get("/my-images")
async def get_my_images(
    visibility: Optional[str] = None,
    tags: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "recent",
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user_from_middleware),
    db = Depends(get_database_service)
):
    """Get user's uploaded images with filtering"""
    try:
        logger.info(f"🖼️ Getting images for user: {current_user.get('user_id', 'unknown')}")
        logger.info(f"📋 Parameters: visibility={visibility}, tags={tags}, search={search}, page={page}, limit={limit}")
        
        offset = (page - 1) * limit
        
        # Get files with filters
        files = await db.get_user_uploads(
            user_id=current_user['user_id'],
            offset=offset,
            limit=limit,
            visibility=visibility,
            tags=[tags] if tags else None,
            search=search
        )
        
        logger.info(f"📁 Found {len(files)} files")
        
        # Get total count
        total = await db.count_user_uploads(
            user_id=current_user['user_id'],
            visibility=visibility,
            tags=[tags] if tags else None,
            search=search
        )
        
        logger.info(f"📊 Total count: {total}")
        
        # Format response
        file_responses = []
        for file_data in files:
            # Get tags for each file
            upload_tags = await db.get_upload_tags(file_data['id'])
            tag_names = [tag['name'] for tag in upload_tags]
            
            # Determine the correct URL based on visibility with filename
            original_filename = file_data['original_filename'] or 'untitled'
            # Sanitize filename for URL
            sanitized_filename = original_filename.replace(' ', '-').replace('/', '-')
            file_url = f"/files/{file_data['id']}/{sanitized_filename}" if file_data['visibility'] == 'public' else f"/apis/files/{file_data['id']}/{sanitized_filename}"
            
            file_responses.append(FileUploadResponse(
                id=file_data['id'],
                filename=file_data['original_filename'],  # Use original_filename as filename
                title=file_data['title'],
                url=file_url,
                content_type=file_data['content_type'],
                file_size=file_data['file_size'],
                visibility=file_data['visibility'],
                tags=tag_names
            ))
        
        logger.info(f"✅ Returning {len(file_responses)} images")
        
        return MyImagesResponse(
            files=file_responses,
            total=total,
            page=page,
            limit=limit
        )
        
    except Exception as e:
        logger.error(f"❌ Get my images failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get images")

@router.get("/{file_id}")
@router.get("/{file_id}/{filename}")
async def get_file(
    file_id: str,
    filename: str = None,  # Optional filename for SEO/aesthetics
    current_user: dict = Depends(get_current_user_from_middleware),
    db = Depends(get_database_service)
):
    """Serve file content with caching"""
    try:
        # Access checker function for private files
        def check_access(file_data: dict, user: dict):
            if (file_data['visibility'] == 'private' and 
                file_data['uploaded_by'] != user['user_id']):
                from fastapi import HTTPException
                raise HTTPException(status_code=403, detail="Access denied")
        
        return await serve_cached_or_db_file(
            file_id=file_id,
            db_getter_func=db.get_content_upload,
            access_checker_func=check_access,
            current_user=current_user
        )
        
    except Exception as e:
        logger.error(f"❌ File serve failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to serve file")

@router.post("/{file_id}/update", response_model=FileUploadResponse)
async def update_file_metadata(
    file_id: str,
    updates: FileMetadataUpdate,
    current_user: dict = Depends(get_current_user_from_middleware),
    db = Depends(get_database_service)
):
    """Update file metadata (instead of PUT method)"""
    try:
        # Check if file exists and user owns it
        file_data = await db.get_content_upload(file_id)
        
        if not file_data:
            raise HTTPException(status_code=404, detail="File not found")
        
        if file_data['uploaded_by'] != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update metadata
        update_data = {}
        if updates.title is not None:
            update_data['title'] = updates.title
        if updates.description is not None:
            update_data['description'] = updates.description
        if updates.visibility is not None:
            update_data['visibility'] = updates.visibility
        
        if update_data:
            await db.update_content_upload(file_id, update_data)
        
        # Update tags if provided
        if updates.tags is not None:
            await db.update_upload_tags(current_user['user_id'], file_id, updates.tags)
        
        # Get updated file data
        updated_file = await db.get_content_upload(file_id)
        upload_tags = await db.get_upload_tags(file_id)
        tag_names = [tag['name'] for tag in upload_tags]
        
        # Generate URL with filename
        original_filename = updated_file['original_filename'] or 'untitled'
        sanitized_filename = original_filename.replace(' ', '-').replace('/', '-')
        file_url = f"/files/{file_id}/{sanitized_filename}" if updated_file['visibility'] == 'public' else f"/apis/files/{file_id}/{sanitized_filename}"
        
        return FileUploadResponse(
            id=file_id,
            filename=updated_file['original_filename'],  # Use original_filename as filename
            title=updated_file['title'],
            url=file_url,
            content_type=updated_file['content_type'],
            file_size=updated_file['file_size'],
            visibility=updated_file['visibility'],
            tags=tag_names
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Update file metadata failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update file")

@router.post("/{file_id}/delete")
async def delete_file(
    file_id: str,
    current_user: dict = Depends(get_current_user_from_middleware),
    db = Depends(get_database_service)
):
    """Soft delete file (instead of DELETE method)"""
    try:
        # Check if file exists and user owns it
        file_data = await db.get_content_upload(file_id)
        
        if not file_data:
            raise HTTPException(status_code=404, detail="File not found")
        
        if file_data['uploaded_by'] != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Soft delete
        await db.update_content_upload(file_id, {'is_active': False})
        
        logger.info(f"✅ File soft deleted: {file_id} by user {current_user['user_id']}")
        
        return {"message": "File deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Delete file failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete file")
