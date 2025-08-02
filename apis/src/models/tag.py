"""
Tag Model
Represents a tag in the ITG DocVerse system
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class Tag(BaseModel):
    """Tag model"""
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=50, pattern=r'^[a-z0-9-]+$')
    display_name: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=200)
    color: str = Field(..., pattern=r'^#[0-9a-fA-F]{6}$')  # Hex color code
    post_count: int = Field(default=0, ge=0)
    follower_count: int = Field(default=0, ge=0)
    is_featured: bool = Field(default=False)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class TagCreate(BaseModel):
    """Tag creation model"""
    name: str = Field(..., min_length=1, max_length=50, pattern=r'^[a-z0-9-]+$')
    display_name: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=200)
    color: str = Field(..., pattern=r'^#[0-9a-fA-F]{6}$')

class TagUpdate(BaseModel):
    """Tag update model"""
    display_name: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=200)
    color: Optional[str] = Field(None, pattern=r'^#[0-9a-fA-F]{6}$')
    is_featured: Optional[bool] = None

class TagPublic(BaseModel):
    """Public tag model"""
    id: str
    name: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    color: str
    post_count: int = 0
    follower_count: int = 0
    is_featured: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
