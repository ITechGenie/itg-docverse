-- Migration: Add content_uploads table for image/file storage
-- Compatible with both SQLite and PostgreSQL

-- =====================================================
-- CONTENT_UPLOADS TABLE - Store uploaded files in database
-- =====================================================
CREATE TABLE IF NOT EXISTS content_uploads (
    id VARCHAR(50) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    file_data BLOB NOT NULL,  -- BLOB for SQLite, BYTEA for PostgreSQL
    
    -- User & Privacy
    uploaded_by VARCHAR(50) NOT NULL,
    is_public BOOLEAN DEFAULT false,
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'shared')),
    
    -- Organization & Discovery
    title VARCHAR(255),
    description TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    
    -- Foreign keys
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_uploads_uploaded_by ON content_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_content_uploads_visibility ON content_uploads(visibility);
CREATE INDEX IF NOT EXISTS idx_content_uploads_created_at ON content_uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_content_uploads_active ON content_uploads(is_active);

-- =====================================================
-- CONTENT_UPLOAD_TAGS TABLE - Link uploads to existing tags
-- =====================================================
CREATE TABLE IF NOT EXISTS content_upload_tags (
    id VARCHAR(50) PRIMARY KEY,
    upload_id VARCHAR(50) NOT NULL,
    tag_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    
    -- Foreign keys
    FOREIGN KEY (upload_id) REFERENCES content_uploads(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tag_types(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    -- Prevent duplicate tag assignments
    UNIQUE(upload_id, tag_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_upload_tags_upload_id ON content_upload_tags(upload_id);
CREATE INDEX IF NOT EXISTS idx_content_upload_tags_tag_id ON content_upload_tags(tag_id);
