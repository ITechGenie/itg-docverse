"""
Comment Model
Represents a comment in the ITG DocVerse system
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class Comment(BaseModel):
    """Comment model"""
    id: Optional[str] = None
    post_id: str
    author_id: str
    content: str = Field(..., min_length=1, max_length=1000)
    parent_id: Optional[str] = None  # For nested comments
    like_count: int = Field(default=0, ge=0)
    is_edited: bool = Field(default=False)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class CommentCreate(BaseModel):
    """Comment creation model"""
    post_id: str
    content: str = Field(..., min_length=1, max_length=1000)
    parent_id: Optional[str] = None

class CommentUpdate(BaseModel):
    """Comment update model"""
    content: str = Field(..., min_length=1, max_length=1000)

class CommentPublic(BaseModel):
    """Public comment model"""
    id: str
    post_id: str
    author_id: str
    author_name: Optional[str] = None  # Display name of the author
    author_username: Optional[str] = None  # Username of the author
    content: str
    parent_id: Optional[str] = None
    like_count: int = 0
    is_edited: bool = False
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
