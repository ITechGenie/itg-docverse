-- ITG DocVerse Database Schema Bootstrap
-- This file contains the complete database schema and initial data
-- Compatible with SQLite, PostgreSQL, and Redis (through application layer)

-- =====================================================
-- 1. USERS TABLE - User profile information
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    bio TEXT,
    location VARCHAR(100),
    website VARCHAR(255),
    avatar_url VARCHAR(500),
    joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    -- Audit columns
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

-- =====================================================
-- 2. POST_TYPES TABLE - Master data for post types
-- =====================================================
CREATE TABLE IF NOT EXISTS post_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    -- Audit columns
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50)
);

-- =====================================================
-- 3. POSTS TABLE - Main posts table (similar to posts.json)
-- =====================================================
CREATE TABLE IF NOT EXISTS posts (
    id VARCHAR(50) PRIMARY KEY,
    post_type_id VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    feed_content TEXT,
    cover_image_url VARCHAR(500),
    author_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived, deleted
    revision INTEGER DEFAULT 0,
    is_latest BOOLEAN DEFAULT TRUE,
    read_time INTEGER DEFAULT 0, -- in minutes
    -- Document specific fields
    project_id VARCHAR(100),
    branch_name VARCHAR(100),
    git_url VARCHAR(500),
    indexed_date TIMESTAMP,
    document_type VARCHAR(50), -- llm-short, llm-long, block-diagram, etc.
    -- Audit columns
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    -- Constraints
    FOREIGN KEY (post_type_id) REFERENCES post_types(id),
    FOREIGN KEY (author_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- =====================================================
-- 4. POSTS_CONTENT TABLE - Version management (similar to post-details.json)
-- =====================================================
CREATE TABLE IF NOT EXISTS posts_content (
    id VARCHAR(50) PRIMARY KEY,
    post_id VARCHAR(50) NOT NULL,
    revision INTEGER NOT NULL,
    content TEXT NOT NULL, -- Full markdown/html content
    content_summary TEXT, -- Auto-generated summary
    word_count INTEGER DEFAULT 0,
    -- Version metadata
    version_notes TEXT,
    is_current BOOLEAN DEFAULT FALSE,
    -- Audit columns
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    -- Constraints
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(post_id, revision)
);

-- =====================================================
-- 5. TAG_TYPES TABLE - Master data for tags
-- =====================================================
CREATE TABLE IF NOT EXISTS tag_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#666666',
    category VARCHAR(50), -- technology, documentation, user_journey, etc.
    is_active BOOLEAN DEFAULT TRUE,
    -- Audit columns
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50)
);

-- =====================================================
-- 6. POST_TAGS TABLE - Association between posts and tags
-- =====================================================
CREATE TABLE IF NOT EXISTS post_tags (
    id VARCHAR(50) PRIMARY KEY,
    post_id VARCHAR(50) NOT NULL,
    tag_id VARCHAR(50) NOT NULL,
    -- Audit columns
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    -- Constraints
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (tag_id) REFERENCES tag_types(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(post_id, tag_id)
);

-- =====================================================
-- 7. EVENT_TYPES TABLE - Master data for all portal events
-- =====================================================
CREATE TABLE IF NOT EXISTS event_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50), -- reaction, engagement, system, user_action, content
    icon VARCHAR(50),
    color VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    -- Audit columns
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50)
);

-- =====================================================
-- 8. REACTIONS TABLE - Reactions, views, favorites for posts/discussions/users
-- =====================================================
CREATE TABLE IF NOT EXISTS reactions (
    id VARCHAR(50) PRIMARY KEY,
    event_type_id VARCHAR(50) NOT NULL, -- References event_types for reaction type
    user_id VARCHAR(50) NOT NULL,
    target_type VARCHAR(20) NOT NULL, -- post, discussion, user, comment
    target_id VARCHAR(50) NOT NULL, -- ID of the target entity
    target_revision INTEGER, -- For posts, track which revision was reacted to
    reaction_value INTEGER DEFAULT 1, -- For likes/hearts, views count, etc.
    metadata TEXT, -- JSON for additional data
    -- Audit columns
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Constraints
    FOREIGN KEY (event_type_id) REFERENCES event_types(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(event_type_id, user_id, target_type, target_id) -- Prevent duplicate reactions
);

-- =====================================================
-- 9. USER_EVENTS TABLE - Record all user events for analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS user_events (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    event_type_id VARCHAR(50) NOT NULL,
    target_type VARCHAR(20), -- post, user, system, etc.
    target_id VARCHAR(50),
    session_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata TEXT, -- JSON for additional event data
    -- Audit columns
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Constraints
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (event_type_id) REFERENCES event_types(id)
);

-- =====================================================
-- 10. POST_DISCUSSIONS TABLE - Comments/discussions with threading support
-- =====================================================
CREATE TABLE IF NOT EXISTS post_discussions (
    id VARCHAR(50) PRIMARY KEY,
    post_id VARCHAR(50) NOT NULL,
    post_revision INTEGER, -- Track which version discussion is based on
    parent_discussion_id VARCHAR(50), -- For threading support (replies to replies)
    author_id VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text', -- text, markdown, html
    is_edited BOOLEAN DEFAULT FALSE,
    edit_reason TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    delete_reason TEXT,
    -- Threading metadata
    thread_level INTEGER DEFAULT 0, -- 0 = root comment, 1 = reply, 2 = reply to reply, etc.
    thread_path TEXT, -- Path like "1.2.3" for efficient querying
    -- Audit columns
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    deleted_ts TIMESTAMP,
    deleted_by VARCHAR(50),
    -- Constraints
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (parent_discussion_id) REFERENCES post_discussions(id),
    FOREIGN KEY (author_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    FOREIGN KEY (deleted_by) REFERENCES users(id)
);

-- =====================================================
-- 11. USER_STATS TABLE - Aggregated user statistics (for performance)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_stats (
    user_id VARCHAR(50) PRIMARY KEY,
    posts_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    reactions_given INTEGER DEFAULT 0,
    reactions_received INTEGER DEFAULT 0,
    tags_followed INTEGER DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    -- Audit columns
    updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Constraints
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =====================================================
-- 12. TAG_STATS TABLE - Aggregated tag statistics (for performance)
-- =====================================================
CREATE TABLE IF NOT EXISTS tag_stats (
    tag_id VARCHAR(50) PRIMARY KEY,
    posts_count INTEGER DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    -- Audit columns
    updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Constraints
    FOREIGN KEY (tag_id) REFERENCES tag_types(id)
);

-- =====================================================
-- INDEXES for Performance Optimization
-- =====================================================

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_author_status ON posts(author_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_type_status ON posts(post_type_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_created_ts ON posts(created_ts DESC);
CREATE INDEX IF NOT EXISTS idx_posts_updated_ts ON posts(updated_ts DESC);

-- Posts content indexes
CREATE INDEX IF NOT EXISTS idx_posts_content_post_revision ON posts_content(post_id, revision);
CREATE INDEX IF NOT EXISTS idx_posts_content_current ON posts_content(post_id, is_current);

-- Reactions indexes
CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_type ON reactions(user_id, event_type_id);
CREATE INDEX IF NOT EXISTS idx_reactions_created_ts ON reactions(created_ts DESC);

-- Discussions indexes
CREATE INDEX IF NOT EXISTS idx_discussions_post ON post_discussions(post_id, created_ts DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_parent ON post_discussions(parent_discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussions_author ON post_discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_discussions_thread_path ON post_discussions(thread_path);

-- User events indexes
CREATE INDEX IF NOT EXISTS idx_user_events_user_time ON user_events(user_id, created_ts DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_type_time ON user_events(event_type_id, created_ts DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_session ON user_events(session_id);

-- Post tags indexes
CREATE INDEX IF NOT EXISTS idx_post_tags_post ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_id);

-- =====================================================
-- INITIAL DATA SETUP
-- =====================================================

-- Insert default post types
INSERT OR IGNORE INTO post_types (id, name, description, icon, color) VALUES
('posts', 'Posts', 'Articles and blog posts', '📝', '#4A90E2'),
('thoughts', 'Thoughts', 'Quick thoughts and micro-posts', '💭', '#F39C12'),
('llm-short', 'LLM Short', 'AI-generated short summaries', '🤖', '#9B59B6'),
('llm-long', 'LLM Long', 'AI-generated detailed documentation', '🤖', '#8E44AD'),
('block-diagram', 'Block Diagram', 'Visual diagrams and flowcharts', '📊', '#2ECC71'),
('code-snippet', 'Code Snippet', 'Code examples and snippets', '💻', '#E67E22'),
('discussion', 'Discussion', 'Discussion starters and questions', '🗣️', '#3498DB');

-- Insert default event types
INSERT OR IGNORE INTO event_types (id, name, description, category, icon, color) VALUES
-- Reaction events (matching frontend ReactionType)
('event-heart', 'heart', 'Heart reaction', 'reaction', '❤️', '#E74C3C'),
('event-broken-heart', 'broken-heart', 'Broken heart reaction', 'reaction', '�', '#E74C3C'),
('event-thumbs-up', 'thumbs-up', 'Thumbs up reaction', 'reaction', '�👍', '#3498DB'),
('event-thumbs-down', 'thumbs-down', 'Thumbs down reaction', 'reaction', '👎', '#E74C3C'),
('event-unicorn', 'unicorn', 'Unicorn reaction', 'reaction', '🦄', '#9B59B6'),
('event-fire', 'fire', 'Fire reaction', 'reaction', '🔥', '#E67E22'),
('event-celebrate', 'celebrate', 'Celebrate reaction', 'reaction', '🎉', '#F1C40F'),
('event-surprised', 'surprised', 'Surprised reaction', 'reaction', '😮', '#95A5A6'),
('event-thinking', 'thinking', 'Thinking reaction', 'reaction', '🤔', '#34495E'),
('event-favorite', 'favorite', 'Favorite/Bookmark', 'reaction', '⭐', '#F39C12'),

-- Engagement events
('event-view', 'view', 'Content view', 'engagement', '👁️', '#95A5A6'),
('event-share', 'share', 'Content share', 'engagement', '📤', '#3498DB'),
('event-comment', 'comment', 'Comment posted', 'engagement', '💬', '#9B59B6'),
('event-follow', 'follow', 'Follow user/tag', 'engagement', '➕', '#2ECC71'),
('event-unfollow', 'unfollow', 'Unfollow user/tag', 'engagement', '➖', '#E74C3C'),

-- User action events
('event-login', 'login', 'User login', 'user_action', '🔐', '#34495E'),
('event-logout', 'logout', 'User logout', 'user_action', '🚪', '#34495E'),
('event-register', 'register', 'User registration', 'user_action', '👤', '#2ECC71'),
('event-profile-update', 'profile_update', 'Profile update', 'user_action', '✏️', '#3498DB'),

-- Content events
('event-post-create', 'post_create', 'Post created', 'content', '📝', '#2ECC71'),
('event-post-update', 'post_update', 'Post updated', 'content', '✏️', '#F39C12'),
('event-post-publish', 'post_publish', 'Post published', 'content', '🚀', '#9B59B6'),
('event-post-delete', 'post_delete', 'Post deleted', 'content', '🗑️', '#E74C3C'),

-- System events
('event-badge-awarded', 'badge_awarded', 'Badge awarded to user', 'system', '🏆', '#F39C12'),
('event-milestone', 'milestone', 'User milestone reached', 'system', '🎯', '#E67E22');

-- Insert default tag types
INSERT OR IGNORE INTO tag_types (id, name, description, color, category) VALUES
('tag-javascript', 'Javascript', 'JavaScript programming language', '#f7df1e', 'technology'),
('tag-react', 'React', 'React library for building UIs', '#61dafb', 'technology'),
('tag-typescript', 'TypeScript', 'TypeScript superset of JavaScript', '#3178c6', 'technology'),
('tag-webdev', 'Web Development', 'Web Development', '#ff6b6b', 'technology'),
('tag-opensource', 'Open Source', 'Open Source Software', '#4ecdc4', 'technology'),
('tag-python', 'Python', 'Python programming language', '#3776ab', 'technology'),
('tag-fastapi', 'FastAPI', 'FastAPI web framework', '#009688', 'technology'),
('tag-redis', 'Redis', 'Redis in-memory database', '#DC382D', 'technology'),
('tag-css', 'CSS', 'Cascading Style Sheets', '#1572B6', 'technology'),
('tag-documentation', 'Documentation', 'Technical documentation', '#3B82F6', 'documentation'),
('tag-api', 'API', 'Application Programming Interface', '#10B981', 'documentation'),
('tag-tutorial', 'Tutorial', 'Step-by-step tutorials', '#8B5CF6', 'documentation'),
('tag-beginner', 'Beginner', 'Beginner-friendly content', '#06D6A0', 'user_journey'),
('tag-advanced', 'Advanced', 'Advanced technical content', '#F72585', 'user_journey'),
('tag-architecture', 'Architecture', 'Software architecture and design', '#9b59b6', 'technology');

-- Insert dummy user data
INSERT OR IGNORE INTO users (id, username, display_name, email, bio, location, website, created_by) VALUES
('user-1', 'prakashm88', 'Prakash M', 'prakash@example.com', 'Full Stack Developer | Tech Enthusiast | Open Source Contributor', 'Bangalore, India', 'https://prakash.dev', 'system'),
('user-2', 'sarah_dev', 'Sarah Johnson', 'sarah@example.com', 'Frontend Developer | React Specialist | UI/UX Enthusiast', 'San Francisco, USA', 'https://sarahdev.com', 'system'),
('user-3', 'mike_backend', 'Mike Chen', 'mike@example.com', 'Backend Engineer | Python & Go | Distributed Systems', 'Toronto, Canada', NULL, 'system'),
('user-system', 'system', 'System', 'system@itgdocverse.com', 'System user for automated actions', 'Cloud', NULL, 'system'),
('itg-docverse', 'ITG DocVerse User', 'ITG DocVerse User', 'user@itgdocverse.com', 'Default user for ITG DocVerse hackathon', 'ITG Office', NULL, 'system'),
('user-admin', 'admin', 'System Administrator', 'admin@itgdocverse.com', 'System Administrator for ITG DocVerse', 'ITG Office', NULL, 'system');

-- Initialize user stats
INSERT OR IGNORE INTO user_stats (user_id, posts_count, comments_count, tags_followed) VALUES
('user-1', 25, 120, 8),
('user-2', 18, 85, 6),
('user-3', 12, 45, 4),
('user-system', 0, 0, 0),
('itg-docverse', 0, 0, 0),
('user-admin', 0, 0, 0);

-- Initialize tag stats
INSERT OR IGNORE INTO tag_stats (tag_id, posts_count) VALUES
('tag-javascript', 1234),
('tag-react', 987),
('tag-typescript', 756),
('tag-webdev', 2345),
('tag-opensource', 654),
('tag-python', 890),
('tag-fastapi', 234),
('tag-redis', 145),
('tag-css', 1456),
('tag-documentation', 567),
('tag-api', 789),
('tag-tutorial', 445),
('tag-beginner', 332),
('tag-advanced', 198),
('tag-architecture', 276);
-- Username: sarah_dev
-- Display Name: Sarah Johnson
-- Email: sarah@example.com
-- Bio: Frontend Developer | React Enthusiast | UI/UX Designer

-- User ID: 3
-- Username: mike_ts
-- Display Name: Mike TS
-- Email: mike@example.com
-- Bio: Backend Developer | TypeScript Expert | Node.js Specialist

-- ============================================
-- INITIAL TAGS
-- ============================================

-- Tag: opensource (Color: #4ecdc4)
-- Tag: webdev (Color: #ff6b6b)
-- Tag: developer (Color: #45b7d1)
-- Tag: typescript (Color: #3178C6)
-- Tag: react (Color: #61DAFB)
-- Tag: css (Color: #1572B6)
-- Tag: documentation (Color: #3B82F6)
-- Tag: api (Color: #10B981)

-- ============================================
-- SAMPLE POSTS
-- ============================================

-- Post ID: post-1
-- Type: long-form
-- Title: 12 Open Source Alternatives to Popular Software (For Developers)
-- Author: user-1 (prakashm88)
-- Tags: opensource, webdev, developer
-- Status: published
-- Created: 2025-01-26T10:00:00Z

-- Post ID: thoughts-3282347
-- Type: thoughts
-- Title: #thoughts - 3282347
-- Content: Just discovered that React's useCallback and useMemo hooks can actually hurt performance if overused...
-- Author: user-1 (prakashm88)
-- Tags: webdev, react
-- Status: published
-- Created: 2025-01-25T10:30:00Z

-- Post ID: thoughts-5471829
-- Type: thoughts
-- Title: #thoughts - 5471829
-- Content: CSS Grid is for 2D layouts (rows AND columns), Flexbox is for 1D layouts...
-- Author: user-1 (prakashm88)
-- Tags: css, webdev
-- Status: published
-- Created: 2025-01-24T15:45:00Z

-- Post ID: thoughts-8392647
-- Type: thoughts
-- Title: #thoughts - 8392647
-- Content: TypeScript tip: Use `satisfies` operator instead of type assertion...
-- Author: user-1 (prakashm88)
-- Tags: typescript, webdev
-- Status: published
-- Created: 2025-01-23T09:15:00Z

-- Post ID: post-3
-- Type: long-form
-- Title: Building Scalable React Applications with Clean Architecture
-- Author: user-2 (sarah_dev)
-- Tags: react, webdev, developer
-- Status: published
-- Created: 2025-01-22T14:20:00Z

-- Post ID: doc-1
-- Type: long-form
-- Title: Short Summary - Project payment-gateway-api
-- Author: user-1 (prakashm88)
-- Tags: documentation, api
-- Status: draft
-- Is Document: true
-- Project ID: payment-gateway-api
-- Git URL: https://gitlab.com/company/payment-gateway-api.git
-- Created: 2025-07-27T14:30:00Z

-- ============================================
-- SAMPLE COMMENTS
-- ============================================

-- Comment on thoughts-3282347
-- Author: user-2 (sarah_dev)
-- Content: This is so true! I spent hours optimizing with useMemo only to find it made things slower.

-- Comment on thoughts-8392647
-- Author: user-3 (mike_ts)
-- Content: Mind blown! I've been using `as` everywhere. Thanks for this!

-- ============================================
-- SAMPLE REACTIONS
-- ============================================

-- Reactions on posts (like, insightful, helpful, etc.)
-- Each post has various reactions from different users

-- ============================================
-- USER STATS
-- ============================================

-- prakashm88: 25 posts, 120 comments, 8 tags followed
-- sarah_dev: 15 posts, 89 comments, 12 tags followed
-- mike_ts: 8 posts, 45 comments, 6 tags followed

-- ============================================
-- NOTES FOR IMPLEMENTATION
-- ============================================

-- 1. When implementing Redis service:
--    - Use JSON serialization for complex objects
--    - Use appropriate key patterns (e.g., user:id, post:id, tag:name)
--    - Implement proper indexing for search functionality
--    - Use Redis sets/sorted sets for relationships

-- 2. When implementing SQLite/PostgreSQL service:
--    - Create proper foreign key relationships
--    - Add indexes for commonly queried fields
--    - Use transactions for data consistency
--    - Implement proper pagination

-- 3. Common fields for all implementations:
--    - created_at, updated_at timestamps
--    - UUIDs for all entity IDs
--    - Proper status fields (draft/published)
--    - Soft delete support where needed

-- 4. Search functionality requirements:
--    - Full-text search on post content and titles
--    - Tag-based filtering
--    - User search by name/username
--    - Date range filtering

-- 5. Performance considerations:
--    - Cache frequently accessed data
--    - Use appropriate batch operations
--    - Implement proper connection pooling
--    - Add monitoring and logging

-- =====================================================
-- KNOWLEDGE BASE SYSTEM TABLES
-- =====================================================

-- =====================================================
-- 13. KNOWLEDGE BASE TYPES TABLE - Master data for KB types
-- =====================================================
CREATE TABLE IF NOT EXISTS kb_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,          -- 'gitlab-repo', 'pdf-document', 'website', 'user-post', etc.
    category VARCHAR(50) NOT NULL,              -- 'code-repository', 'document', 'user-content', 'web-content'
    description TEXT,
    icon VARCHAR(50),                           -- UI icon
    color VARCHAR(20),                          -- UI color
    processing_pipeline TEXT,                   -- JSON: steps to process this type
    is_active BOOLEAN DEFAULT TRUE,
    -- Audit columns
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50)
);

-- =====================================================
-- 14. KNOWLEDGE BASE TABLE - Core knowledge sources
-- =====================================================
CREATE TABLE IF NOT EXISTS knowledge_base (
    id VARCHAR(50) PRIMARY KEY,
    kb_type_id VARCHAR(50) NOT NULL,            -- FK to kb_types
    title VARCHAR(500) NOT NULL,                -- "Payment Gateway API", "ML Research Paper.pdf"
    description TEXT,
    source_url VARCHAR(1000),                   -- Git URL, website URL, file path, etc.
    source_identifier VARCHAR(200),             -- project_id, file_hash, URL slug, etc.
    status VARCHAR(20) DEFAULT 'discovered',    -- discovered, processing, indexed, failed, archived
    -- Processing metadata
    last_processed_ts TIMESTAMP,
    processing_metadata TEXT,                   -- JSON: file size, commit hash, processing details
    -- Audit columns
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    -- Constraints
    FOREIGN KEY (kb_type_id) REFERENCES kb_types(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- =====================================================
-- 15. KB INDEX TRIGGERS TABLE - Batch processing triggers
-- =====================================================
CREATE TABLE IF NOT EXISTS kb_index_triggers (
    id VARCHAR(50) PRIMARY KEY,                 -- trigger-20241215-payment-gateway-main
    kb_id VARCHAR(50) NOT NULL,                 -- FK to knowledge_base
    triggered_by VARCHAR(50) NOT NULL,          -- User who triggered the processing
    trigger_type VARCHAR(50) NOT NULL,          -- 'manual', 'scheduled', 'webhook', 'auto'
    trigger_context TEXT,                       -- JSON: branch_name, file_path, page_range, etc.
    expected_generations TEXT,                  -- JSON: ['llm-short', 'llm-full', 'system-diagram']
    overall_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, partial, failed
    -- Processing stats
    started_ts TIMESTAMP,
    completed_ts TIMESTAMP,
    total_expected INTEGER DEFAULT 0,
    total_completed INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    -- Audit columns
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Constraints
    FOREIGN KEY (kb_id) REFERENCES knowledge_base(id),
    FOREIGN KEY (triggered_by) REFERENCES users(id)
);

-- =====================================================
-- 16. KB INDEXES TABLE - Individual generated content bridge to posts
-- =====================================================
CREATE TABLE IF NOT EXISTS kb_indexes (
    id VARCHAR(50) PRIMARY KEY,
    trigger_id VARCHAR(50) NOT NULL,            -- FK to kb_index_triggers
    post_id VARCHAR(50) NOT NULL,               -- FK to posts (where actual content is stored)
    generation_type VARCHAR(50) NOT NULL,       -- 'llm-short', 'llm-full', 'system-diagram', 'api-flow'
    generation_status VARCHAR(20) DEFAULT 'pending', -- pending, generating, completed, failed
    -- Processing details
    processing_started_ts TIMESTAMP,
    processing_completed_ts TIMESTAMP,
    processing_metadata TEXT,                   -- JSON: AI model used, tokens, processing time, etc.
    error_message TEXT,                         -- Error details if failed
    -- Audit columns
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    -- Constraints
    FOREIGN KEY (trigger_id) REFERENCES kb_index_triggers(id),
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    -- Ensure unique generation type per trigger
    UNIQUE(trigger_id, generation_type)
);

-- =====================================================
-- 17. KB METADATA TABLE - Type-specific metadata
-- =====================================================
CREATE TABLE IF NOT EXISTS kb_metadata (
    id VARCHAR(50) PRIMARY KEY,
    kb_id VARCHAR(50) NOT NULL,                 -- FK to knowledge_base
    metadata_type VARCHAR(50) NOT NULL,         -- 'git-repo', 'file-info', 'web-page', etc.
    metadata_json TEXT NOT NULL,               -- JSON: type-specific data
    -- Audit columns
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Constraints
    FOREIGN KEY (kb_id) REFERENCES knowledge_base(id)
);

-- =====================================================
-- INDEXES for Knowledge Base Performance Optimization
-- =====================================================

-- Knowledge Base indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_base_type_status ON knowledge_base(kb_type_id, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source_identifier ON knowledge_base(source_identifier);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_created_ts ON knowledge_base(created_ts DESC);

-- KB Index Triggers indexes
CREATE INDEX IF NOT EXISTS idx_kb_triggers_kb_status ON kb_index_triggers(kb_id, overall_status);
CREATE INDEX IF NOT EXISTS idx_kb_triggers_user_time ON kb_index_triggers(triggered_by, created_ts DESC);
CREATE INDEX IF NOT EXISTS idx_kb_triggers_type_status ON kb_index_triggers(trigger_type, overall_status);

-- KB Indexes indexes
CREATE INDEX IF NOT EXISTS idx_kb_indexes_trigger ON kb_indexes(trigger_id);
CREATE INDEX IF NOT EXISTS idx_kb_indexes_post ON kb_indexes(post_id);
CREATE INDEX IF NOT EXISTS idx_kb_indexes_type_status ON kb_indexes(generation_type, generation_status);
CREATE INDEX IF NOT EXISTS idx_kb_indexes_status_time ON kb_indexes(generation_status, created_ts DESC);

-- KB Metadata indexes
CREATE INDEX IF NOT EXISTS idx_kb_metadata_kb_type ON kb_metadata(kb_id, metadata_type);

-- =====================================================
-- KNOWLEDGE BASE SAMPLE DATA
-- =====================================================

-- Insert sample KB types
INSERT OR IGNORE INTO kb_types (id, name, category, description, icon, color, is_active) VALUES
('kb-type-1', 'gitlab-repo', 'code-repository', 'GitLab Repository', 'git-branch', '#FC6D26', TRUE),
('kb-type-2', 'pdf-document', 'document', 'PDF Document', 'file-text', '#FF0000', TRUE),
('kb-type-3', 'website', 'web-content', 'Website/Web Page', 'globe', '#0066CC', TRUE),
('kb-type-4', 'user-post', 'user-content', 'User Generated Post', 'edit', '#6366F1', TRUE);

-- Insert sample knowledge base entries
INSERT OR IGNORE INTO knowledge_base (id, kb_type_id, title, description, source_url, source_identifier, status, created_by) VALUES
('kb-1', 'kb-type-1', 'Payment Gateway API', 'Core payment processing API with Stripe integration', 'https://gitlab.com/company/payment-gateway-api.git', 'payment-gateway-api', 'indexed', 'user-1'),
('kb-2', 'kb-type-2', 'API Documentation.pdf', 'Comprehensive API documentation for payment gateway', '/uploads/api-docs.pdf', 'doc-hash-12345', 'processing', 'user-1'),
('kb-3', 'kb-type-3', 'Stripe API Reference', 'Official Stripe API documentation', 'https://stripe.com/docs/api', 'stripe-docs', 'discovered', 'user-2');

-- Insert sample trigger entries
INSERT OR IGNORE INTO kb_index_triggers (id, kb_id, triggered_by, trigger_type, trigger_context, expected_generations, overall_status, total_expected) VALUES
('trigger-1', 'kb-1', 'user-1', 'manual', '{"branch": "main", "files": ["src/api/payments.py", "README.md"]}', '["llm-short", "llm-full", "system-diagram"]', 'completed', 3),
('trigger-2', 'kb-2', 'user-1', 'auto', '{"pages": "1-50", "sections": ["api-endpoints", "authentication"]}', '["llm-short", "api-flow"]', 'processing', 2);

-- Insert sample kb_indexes (bridges to posts)
INSERT OR IGNORE INTO kb_indexes (id, trigger_id, post_id, generation_type, generation_status, created_by) VALUES
('kb-idx-1', 'trigger-1', 'doc-1', 'llm-short', 'completed', 'user-1'),
('kb-idx-2', 'trigger-1', 'post-5', 'llm-full', 'completed', 'user-1'),
('kb-idx-3', 'trigger-2', 'post-6', 'llm-short', 'generating', 'user-1');

-- =====================================================
-- NOTES FOR KNOWLEDGE BASE IMPLEMENTATION
-- =====================================================

-- 1. Workflow Example:
--    a) User connects GitLab repo → creates knowledge_base entry
--    b) User triggers "Generate summaries" → creates kb_index_triggers entry
--    c) System processes in background → creates posts for each generation type
--    d) System links via kb_indexes → bridges KB sources to actual content

-- 2. Benefits of this approach:
--    - Batch processing prevents duplicate work
--    - Triggers track overall progress and can be resumed
--    - Posts table remains clean (just content)
--    - kb_indexes provides clear lineage from source to generated content
--    - Metadata table handles type-specific data without schema changes

-- 3. Generation Types Examples:
--    - 'llm-short': Quick AI summary (1-2 paragraphs)
--    - 'llm-full': Detailed AI analysis (multiple sections)
--    - 'system-diagram': Architecture diagrams from code
--    - 'api-flow': API workflow documentation
--    - 'code-samples': Extracted code examples
