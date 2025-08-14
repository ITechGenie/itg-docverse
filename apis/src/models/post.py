"""
Post Model
Represents a post in the ITG DocVerse system
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field

class PostType(str, Enum):
    """Post type enumeration - matches database post_types table"""
    POSTS = "posts"                     # Articles and blog posts
    THOUGHTS = "thoughts"               # Quick thoughts and micro-posts
    LLM_SHORT = "llm-short"            # AI-generated short summaries
    LLM_LONG = "llm-long"              # AI-generated detailed documentation
    BLOCK_DIAGRAM = "block-diagram"     # Visual diagrams and flowcharts
    CODE_SNIPPET = "code-snippet"      # Code examples and snippets
    DISCUSSION = "discussion"           # Discussion starters and questions

class PostStatus(str, Enum):
    """Post status enumeration"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class Post(BaseModel):
    """Post model"""
    id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    author_id: str
    post_type: PostType = PostType.POSTS
    status: PostStatus = PostStatus.DRAFT
    tags: List[str] = Field(default_factory=list)
    
    # Document-specific fields
    is_document: bool = Field(default=False)
    project_id: Optional[str] = Field(None, max_length=100)
    git_url: Optional[str] = Field(None, max_length=500)
    
    # Statistics
    view_count: int = Field(default=0, ge=0)
    like_count: int = Field(default=0, ge=0)
    comment_count: int = Field(default=0, ge=0)
    
    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class PostCreate(BaseModel):
    """Post creation model"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    post_type: PostType = PostType.POSTS
    tags: List[str] = Field(default_factory=list)
    is_document: bool = Field(default=False)
    project_id: Optional[str] = Field(None, max_length=100)
    git_url: Optional[str] = Field(None, max_length=500)
    status: PostStatus = PostStatus.DRAFT

class PostUpdate(BaseModel):
    """Post update model"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    tags: Optional[List[str]] = None
    status: Optional[PostStatus] = None
    is_document: Optional[bool] = None
    project_id: Optional[str] = Field(None, max_length=100)
    git_url: Optional[str] = Field(None, max_length=500)

class PostPublic(BaseModel):
    """Public post model"""
    id: str
    title: str
    content: str
    author_id: str
    author_name: str = ""
    author_username: str = ""
    post_type: PostType
    status: PostStatus
    tags: List[dict] = Field(
        default_factory=list,
        description="List of tag objects with id, name, and color"
    )
    is_document: bool = False
    project_id: Optional[str] = None
    git_url: Optional[str] = None
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
