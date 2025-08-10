-- ITG DocVerse Database Schema Bootstrap
-- This file contains the complete database schema and initial data
-- Compatible with SQLite, PostgreSQL, and Redis (through application layer)

-- Enable foreign key constraints for SQLite
PRAGMA foreign_keys = ON;

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
-- INITIAL DATA SETUP
-- =====================================================

-- STEP 1: Insert users FIRST (no foreign key dependencies)
INSERT OR IGNORE INTO users (id, username, display_name, email, bio, location, website, created_by) VALUES
('ef85dcf4-97dd-4ccb-b481-93067b0cfd27', 'system', 'System', 'system@itgdocverse.com', 'System user for automated actions', 'Cloud', NULL, NULL),
('ac2402cf-9a84-46a5-8484-d32400e7a18d', 'prakashm88', 'Prakash M', 'prakash@example.com', 'Full Stack Developer | Tech Enthusiast | Open Source Contributor', 'Bangalore, India', 'https://prakash.dev', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('75765941-6b90-4acf-8b4d-6937329d9c08', 'sarah_dev', 'Sarah Johnson', 'sarah@example.com', 'Frontend Developer | React Specialist | UI/UX Enthusiast', 'San Francisco, USA', 'https://sarahdev.com', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('0492735d-ac0d-4e41-808a-199e19c0f3ac', 'mike_backend', 'Mike Chen', 'mike@example.com', 'Backend Engineer | Python & Go | Distributed Systems', 'Toronto, Canada', NULL, 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('d5d03fb7-d966-4f0c-a534-5b2c77097965', 'itg-docverse', 'ITG DocVerse User', 'user@itgdocverse.com', 'Default user for ITG DocVerse hackathon', 'ITG Office', NULL, 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('61aa7084-a14f-48ee-ac75-6645e2ad9ec4', 'admin', 'System Administrator', 'admin@itgdocverse.com', 'System Administrator for ITG DocVerse', 'ITG Office', NULL, 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27');

-- STEP 2: Insert master data tables (reference users via created_by)
-- Insert default post types
INSERT OR IGNORE INTO post_types (id, name, description, icon, color, created_by) VALUES
('posts', 'Posts', 'Articles and blog posts', '📝', '#4A90E2', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('thoughts', 'Thoughts', 'Quick thoughts and micro-posts', '💭', '#F39C12', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('llm-short', 'LLM Short', 'AI-generated short summaries', '🤖', '#9B59B6', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('llm-long', 'LLM Long', 'AI-generated detailed documentation', '🤖', '#8E44AD', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('block-diagram', 'Block Diagram', 'Visual diagrams and flowcharts', '📊', '#2ECC71', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('code-snippet', 'Code Snippet', 'Code examples and snippets', '💻', '#E67E22', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('discussion', 'Discussion', 'Discussion starters and questions', '🗣️', '#3498DB', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27');

-- Insert default event types
INSERT OR IGNORE INTO event_types (id, name, description, category, icon, color, created_by) VALUES
-- Reaction events (matching frontend ReactionType)
('event-heart', 'heart', 'Heart reaction', 'reaction', '❤️', '#E74C3C', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-broken-heart', 'broken-heart', 'Broken heart reaction', 'reaction', '💔', '#E74C3C', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-thumbs-up', 'thumbs-up', 'Thumbs up reaction', 'reaction', '👍', '#3498DB', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-thumbs-down', 'thumbs-down', 'Thumbs down reaction', 'reaction', '👎', '#E74C3C', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-unicorn', 'unicorn', 'Unicorn reaction', 'reaction', '🦄', '#9B59B6', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-fire', 'fire', 'Fire reaction', 'reaction', '🔥', '#E67E22', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-celebrate', 'celebrate', 'Celebrate reaction', 'reaction', '🎉', '#F1C40F', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-surprised', 'surprised', 'Surprised reaction', 'reaction', '😮', '#95A5A6', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-thinking', 'thinking', 'Thinking reaction', 'reaction', '🤔', '#34495E', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-favorite', 'favorite', 'Favorite/Bookmark', 'reaction', '⭐', '#F39C12', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),

-- Engagement events
('event-view', 'view', 'Content view', 'engagement', '👁️', '#95A5A6', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-share', 'share', 'Content share', 'engagement', '📤', '#3498DB', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-comment', 'comment', 'Comment posted', 'engagement', '💬', '#9B59B6', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-follow', 'follow', 'Follow user/tag', 'engagement', '➕', '#2ECC71', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-unfollow', 'unfollow', 'Unfollow user/tag', 'engagement', '➖', '#E74C3C', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),

-- User action events
('event-login', 'login', 'User login', 'user_action', '🔐', '#34495E', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-logout', 'logout', 'User logout', 'user_action', '🚪', '#34495E', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-register', 'register', 'User registration', 'user_action', '👤', '#2ECC71', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-profile-update', 'profile_update', 'Profile update', 'user_action', '✏️', '#3498DB', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),

-- Content events
('event-post-create', 'post_create', 'Post created', 'content', '📝', '#2ECC71', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-post-update', 'post_update', 'Post updated', 'content', '✏️', '#F39C12', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-post-publish', 'post_publish', 'Post published', 'content', '🚀', '#9B59B6', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-post-delete', 'post_delete', 'Post deleted', 'content', '🗑️', '#E74C3C', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),

-- System events
('event-badge-awarded', 'badge_awarded', 'Badge awarded to user', 'system', '🏆', '#F39C12', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('event-milestone', 'milestone', 'User milestone reached', 'system', '🎯', '#E67E22', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27');

-- Insert default tag types
INSERT OR IGNORE INTO tag_types (id, name, description, color, category, created_by) VALUES
('tag-javascript', 'Javascript', 'JavaScript programming language', '#f7df1e', 'technology', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('tag-react', 'React', 'React library for building UIs', '#61dafb', 'technology', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('tag-typescript', 'TypeScript', 'TypeScript superset of JavaScript', '#3178c6', 'technology', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('tag-webdev', 'Web Development', 'Web Development', '#ff6b6b', 'technology', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('tag-opensource', 'Open Source', 'Open Source Software', '#4ecdc4', 'technology', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('tag-python', 'Python', 'Python programming language', '#3776ab', 'technology', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('tag-fastapi', 'FastAPI', 'FastAPI web framework', '#009688', 'technology', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('tag-redis', 'Redis', 'Redis in-memory database', '#DC382D', 'technology', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('tag-css', 'CSS', 'Cascading Style Sheets', '#1572B6', 'technology', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('tag-documentation', 'Documentation', 'Technical documentation', '#3B82F6', 'documentation', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('tag-api', 'API', 'Application Programming Interface', '#10B981', 'documentation', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('tag-tutorial', 'Tutorial', 'Step-by-step tutorials', '#8B5CF6', 'documentation', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('tag-beginner', 'Beginner', 'Beginner-friendly content', '#06D6A0', 'user_journey', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('tag-advanced', 'Advanced', 'Advanced technical content', '#F72585', 'user_journey', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('tag-architecture', 'Architecture', 'Software architecture and design', '#9b59b6', 'technology', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27');

-- STEP 3: Initialize user stats (references users.id)
INSERT OR IGNORE INTO user_stats (user_id, posts_count, comments_count, tags_followed) VALUES
('ac2402cf-9a84-46a5-8484-d32400e7a18d', 25, 120, 8),
('75765941-6b90-4acf-8b4d-6937329d9c08', 18, 85, 6),
('0492735d-ac0d-4e41-808a-199e19c0f3ac', 12, 45, 4),
('ef85dcf4-97dd-4ccb-b481-93067b0cfd27', 0, 0, 0),
('d5d03fb7-d966-4f0c-a534-5b2c77097965', 0, 0, 0),
('61aa7084-a14f-48ee-ac75-6645e2ad9ec4', 0, 0, 0);

-- Initialize tag stats (references tag_types.id)
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

-- =====================================================
-- STEP 4: SAMPLE POSTS AND CONTENT (references users, post_types, tag_types)
-- =====================================================

-- Insert sample posts
INSERT OR IGNORE INTO posts (
    id, post_type_id, title, feed_content, author_id, status, revision, is_latest, 
    read_time, created_ts, updated_ts, created_by, updated_by
) VALUES
-- Welcome post about ITG DocVerse
(
    'post-welcome-itg-docverse',
    'posts',
    'Welcome to ITG DocVerse: Your Knowledge Management Platform',
    'ITG DocVerse is a modern knowledge management and documentation platform designed to streamline how teams create, share, and discover information. Built with React and FastAPI, it offers a seamless experience for managing documentation, sharing thoughts, and building a collaborative knowledge base.',
    'd5d03fb7-d966-4f0c-a534-5b2c77097965',
    'published',
    1,
    TRUE,
    5,
    '2025-01-30T10:00:00Z',
    '2025-01-30T10:00:00Z',
    'd5d03fb7-d966-4f0c-a534-5b2c77097965',
    'd5d03fb7-d966-4f0c-a534-5b2c77097965'
),
-- Getting started guide
(
    'post-getting-started-guide',
    'posts',
    'Getting Started with ITG DocVerse: A Complete Guide',
    'This comprehensive guide will walk you through setting up and using ITG DocVerse effectively. Learn how to create posts, organize content with tags, engage with the community, and make the most of the platform''s features.',
    'ac2402cf-9a84-46a5-8484-d32400e7a18d',
    'published',
    1,
    TRUE,
    8,
    '2025-01-29T14:30:00Z',
    '2025-01-29T14:30:00Z',
    'ac2402cf-9a84-46a5-8484-d32400e7a18d',
    'ac2402cf-9a84-46a5-8484-d32400e7a18d'
),
-- Technical architecture post
(
    'post-technical-architecture',
    'posts',
    'ITG DocVerse Technical Architecture: React + FastAPI + SQLite',
    'Dive deep into the technical architecture of ITG DocVerse. Learn about our technology stack, design decisions, and how different components work together to create a scalable knowledge management platform.',
    '0492735d-ac0d-4e41-808a-199e19c0f3ac',
    'published',
    1,
    TRUE,
    12,
    '2025-01-28T09:15:00Z',
    '2025-01-28T09:15:00Z',
    '0492735d-ac0d-4e41-808a-199e19c0f3ac',
    '0492735d-ac0d-4e41-808a-199e19c0f3ac'
),
-- Sample thoughts
(
    'thoughts-react-best-practices',
    'thoughts',
    'React Best Practices for 2025',
    'Just discovered some amazing React patterns that are game-changers for performance! useCallback and useMemo are powerful but can hurt performance if overused. The key is understanding when NOT to use them. #react #webdev',
    '75765941-6b90-4acf-8b4d-6937329d9c08',
    'published',
    1,
    TRUE,
    1,
    '2025-01-31T15:45:00Z',
    '2025-01-31T15:45:00Z',
    '75765941-6b90-4acf-8b4d-6937329d9c08',
    '75765941-6b90-4acf-8b4d-6937329d9c08'
),
(
    'thoughts-typescript-tips',
    'thoughts',
    'TypeScript Satisfies Operator',
    'TypeScript tip: Use the `satisfies` operator instead of type assertions when you want to ensure an object conforms to a type while preserving its literal types. It''s a game changer! #typescript #webdev',
    'ac2402cf-9a84-46a5-8484-d32400e7a18d',
    'published',
    1,
    TRUE,
    1,
    '2025-01-30T11:20:00Z',
    '2025-01-30T11:20:00Z',
    'ac2402cf-9a84-46a5-8484-d32400e7a18d',
    'ac2402cf-9a84-46a5-8484-d32400e7a18d'
),
(
    'thoughts-css-layouts',
    'thoughts',
    'CSS Grid vs Flexbox',
    'Quick reminder: CSS Grid is for 2D layouts (rows AND columns), Flexbox is for 1D layouts (either row OR column). Stop trying to force Flexbox into Grid''s job! #css #webdev',
    '75765941-6b90-4acf-8b4d-6937329d9c08',
    'published',
    1,
    TRUE,
    1,
    '2025-01-29T16:30:00Z',
    '2025-01-29T16:30:00Z',
    '75765941-6b90-4acf-8b4d-6937329d9c08',
    '75765941-6b90-4acf-8b4d-6937329d9c08'
);

-- Insert detailed content for posts
INSERT OR IGNORE INTO posts_content (
    id, post_id, revision, content, content_summary, word_count, is_current, created_ts, created_by
) VALUES
-- Welcome post content
(
    'content-welcome-itg-docverse',
    'post-welcome-itg-docverse',
    1,
    '# Welcome to ITG DocVerse: Your Knowledge Management Platform

## What is ITG DocVerse?

ITG DocVerse is a modern, collaborative knowledge management platform designed to streamline how teams create, share, and discover information. Whether you''re documenting APIs, sharing quick thoughts, or building a comprehensive knowledge base, ITG DocVerse provides the tools you need.

## Key Features

### 🚀 **Modern Technology Stack**
- **Frontend**: React 18 with TypeScript for a robust, type-safe user experience
- **Backend**: FastAPI with Python for high-performance API endpoints
- **Database**: SQLite for lightweight, efficient data storage
- **Authentication**: JWT-based secure authentication system

### 📝 **Content Creation**
- **Posts**: Write detailed articles and documentation
- **Thoughts**: Share quick insights and micro-posts
- **Markdown Support**: Rich text formatting with markdown
- **Version Control**: Track changes and revisions

### 🏷️ **Organization & Discovery**
- **Smart Tagging**: Organize content with customizable tags
- **Search & Filter**: Find content quickly with powerful search
- **Categories**: Group related content together
- **Trending Content**: Discover popular and engaging posts

### 👥 **Community Features**
- **User Profiles**: Personalized profiles with stats and activity
- **Reactions**: Express yourself with various reaction types
- **Comments**: Engage in meaningful discussions
- **Following**: Stay updated with favorite tags and users

## Getting Started

1. **Create Your Profile**: Set up your profile with bio, location, and interests
2. **Explore Content**: Browse the feed to discover existing posts and thoughts
3. **Start Creating**: Share your first thought or write a detailed post
4. **Engage**: React to content, leave comments, and join discussions
5. **Organize**: Use tags to categorize and discover content

## Why ITG DocVerse?

In today''s fast-paced development environment, teams need a centralized place to:
- Document processes and decisions
- Share knowledge and insights
- Collaborate on ideas
- Build institutional memory

ITG DocVerse bridges the gap between formal documentation and casual knowledge sharing, creating a vibrant ecosystem where information flows freely and team knowledge grows collectively.

## Join the Community

Ready to start your journey? Create your first post, share a thought, or simply explore what others are building. Welcome to ITG DocVerse!',
    'Welcome to ITG DocVerse, a modern knowledge management platform built with React and FastAPI. Learn about key features including content creation, organization tools, and community features.',
    420,
    TRUE,
    '2025-01-30T10:00:00Z',
    'd5d03fb7-d966-4f0c-a534-5b2c77097965'
),
-- Getting started guide content
(
    'content-getting-started-guide',
    'post-getting-started-guide',
    1,
    '# Getting Started with ITG DocVerse: A Complete Guide

Welcome to ITG DocVerse! This guide will help you make the most of our knowledge management platform.

## Step 1: Setting Up Your Profile

Your profile is your identity on ITG DocVerse. Here''s how to make it shine:

### Profile Information
- **Display Name**: How others will see you
- **Bio**: Tell your story in a few sentences
- **Location**: Where you''re based
- **Website**: Link to your personal site or portfolio

### Profile Tips
- Use a clear, professional display name
- Write a bio that highlights your expertise
- Add relevant tags you''re interested in following

## Step 2: Understanding Content Types

ITG DocVerse supports different types of content:

### Posts
- **Long-form content** for detailed articles
- **Markdown support** for rich formatting
- **Cover images** to make posts visually appealing
- **Read time estimation** automatically calculated

### Thoughts
- **Quick insights** and micro-posts
- **Perfect for** tips, observations, or questions
- **Tag integration** for discoverability
- **Real-time sharing** for immediate engagement

## Step 3: Using Tags Effectively

Tags are the backbone of content organization:

### Tag Categories
- **Technology**: javascript, react, python, fastapi
- **Documentation**: api, tutorial, beginner, advanced
- **User Journey**: getting-started, best-practices

### Best Practices
- Use 3-5 relevant tags per post
- Follow existing tag conventions
- Create new tags when needed
- Consider your audience when tagging

## Step 4: Engaging with Content

### Reactions
Express yourself with various reaction types:
- ❤️ Heart for appreciation
- 🔥 Fire for exciting content
- 🤔 Thinking for thought-provoking posts
- 🎉 Celebrate for achievements
- ⭐ Favorite to bookmark content

### Comments
- Engage in meaningful discussions
- Ask clarifying questions
- Share related experiences
- Provide constructive feedback

## Step 5: Building Your Network

### Following Tags
- Follow tags relevant to your interests
- Get notifications for new content
- Discover trending topics in your areas

### Community Participation
- React to posts you find valuable
- Leave thoughtful comments
- Share your own insights regularly
- Help newcomers get started

## Advanced Features

### Search and Discovery
- Use the search bar to find specific content
- Filter by content type, tags, or authors
- Explore trending content
- Browse by tag categories

### Profile Analytics
- Track your posting activity
- See engagement metrics
- Monitor your growing influence
- Celebrate milestones

## Tips for Success

1. **Be Consistent**: Regular posting builds your presence
2. **Be Helpful**: Share knowledge that benefits others
3. **Be Engaged**: Participate in discussions actively
4. **Be Authentic**: Share your genuine experiences
5. **Be Patient**: Building a community presence takes time

## Need Help?

If you have questions or need assistance:
- Check the FAQ section
- Reach out to community moderators
- Post questions with the #help tag
- Contact support through the platform

Welcome to the ITG DocVerse community! We''re excited to see what you''ll share and discover.',
    'Complete guide to getting started with ITG DocVerse. Learn about profiles, content types, tags, engagement features, and best practices for success.',
    650,
    TRUE,
    '2025-01-29T14:30:00Z',
    'ac2402cf-9a84-46a5-8484-d32400e7a18d'
),
-- Technical architecture content
(
    'content-technical-architecture',
    'post-technical-architecture',
    1,
    '# ITG DocVerse Technical Architecture: React + FastAPI + SQLite

Let''s dive into the technical foundation that powers ITG DocVerse and explore the architectural decisions that make it scalable, maintainable, and performant.

## Technology Stack Overview

### Frontend: React 18 + TypeScript
**Why React + TypeScript?**
- **Type Safety**: Catch errors at compile time
- **Developer Experience**: Excellent tooling and IntelliSense
- **Component Reusability**: Modular, maintainable codebase
- **Performance**: Virtual DOM and modern React features
- **Ecosystem**: Rich library ecosystem and community

### Backend: FastAPI + Python
**Why FastAPI?**
- **Performance**: Async/await support for high concurrency
- **Automatic Documentation**: OpenAPI/Swagger integration
- **Type Hints**: Python type hints for API validation
- **Modern Python**: Latest Python features and best practices
- **Easy Testing**: Built-in testing framework support

### Database: SQLite with Migration Support
**Why SQLite?**
- **Zero Configuration**: No separate database server needed
- **ACID Compliance**: Reliable transactions and data integrity
- **Lightweight**: Perfect for development and small to medium deployments
- **Migration Path**: Easy to migrate to PostgreSQL when needed
- **Backup Friendly**: Single file database for easy backups

## Architecture Patterns

### Clean Architecture Principles

#### 1. Separation of Concerns
Frontend organized into components, pages, hooks, services, types, and utilities for clear separation.

#### 2. Dependency Injection
FastAPI uses dependency injection for clean separation of database services and business logic.

#### 3. Interface Segregation
Separate interfaces for different concerns like PostCard props and PostDetail props.

### Data Flow Architecture

#### Frontend State Management
Context-based state management with AuthContext providing authentication state throughout the application.

#### API Layer Design
Centralized API client with error handling and consistent response patterns.

### Database Design Patterns

#### 1. Audit Trail Pattern
Every table includes audit columns: created_ts, updated_ts, created_by, updated_by

#### 2. Soft Delete Pattern
Preserve data integrity with soft deletes using is_deleted, deleted_ts, deleted_by fields

#### 3. Event Sourcing for Analytics
Track all user interactions for analytics with user_events table storing JSON metadata

## Performance Optimizations

### Frontend Performance
- **Code Splitting**: Route-based lazy loading
- **Memoization**: React.memo and useMemo for expensive operations
- **Virtual Scrolling**: For large lists of posts
- **Image Optimization**: Lazy loading and responsive images

### Backend Performance
- **Database Indexing**: Strategic indexes for common queries
- **Connection Pooling**: Efficient database connection management
- **Caching Strategy**: Redis for session and frequently accessed data
- **Async Processing**: Background tasks for non-critical operations

### Database Performance
Optimized indexes for common query patterns including posts by author/status, creation timestamps, and reaction targets.

## Security Considerations

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication
- **Role-Based Access**: Granular permission system
- **Input Validation**: Pydantic models for request validation
- **SQL Injection Prevention**: Parameterized queries

### Data Protection
- **Password Hashing**: Secure password storage
- **Rate Limiting**: API endpoint protection
- **CORS Configuration**: Controlled cross-origin requests
- **Data Sanitization**: XSS prevention

## Scalability Roadmap

### Horizontal Scaling Options
1. **Database**: SQLite → PostgreSQL → Distributed databases
2. **Caching**: In-memory → Redis → Redis Cluster
3. **Search**: SQL queries → Elasticsearch → Distributed search
4. **Files**: Local storage → S3 → CDN

### Microservices Migration Path
- **Authentication Service**: User management and JWT handling
- **Content Service**: Posts, comments, and reactions
- **Search Service**: Full-text search and recommendations
- **Analytics Service**: User behavior and metrics

## Development Workflow

### Local Development
Backend setup: Create virtual environment, install requirements, run main.py
Frontend setup: Install npm dependencies, run development server

### Testing Strategy
- **Unit Tests**: Jest for React components, pytest for Python
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Playwright for user workflow testing
- **Performance Tests**: Load testing with realistic data

## Conclusion

ITG DocVerse''s architecture balances simplicity with scalability, providing a solid foundation for growth while maintaining developer productivity. The chosen technologies work together seamlessly to create a platform that''s both powerful and maintainable.

Key architectural wins:
- **Type Safety**: End-to-end type safety from database to UI
- **Modularity**: Clean separation of concerns for maintainability
- **Performance**: Optimized for both development and production
- **Scalability**: Clear migration path for growth
- **Developer Experience**: Modern tooling and best practices

The architecture supports rapid development while providing the flexibility to evolve as requirements change and the platform grows.',
    'Deep dive into ITG DocVerse technical architecture covering React + TypeScript frontend, FastAPI backend, SQLite database, and key architectural patterns for scalability.',
    980,
    TRUE,
    '2025-01-28T09:15:00Z',
    '0492735d-ac0d-4e41-808a-199e19c0f3ac'
);

-- Insert post tags associations
INSERT OR IGNORE INTO post_tags (id, post_id, tag_id, created_ts, created_by) VALUES
-- Welcome post tags
('pt-welcome-opensource', 'post-welcome-itg-docverse', 'tag-opensource', '2025-01-30T10:00:00Z', 'd5d03fb7-d966-4f0c-a534-5b2c77097965'),
('pt-welcome-documentation', 'post-welcome-itg-docverse', 'tag-documentation', '2025-01-30T10:00:00Z', 'd5d03fb7-d966-4f0c-a534-5b2c77097965'),
('pt-welcome-beginner', 'post-welcome-itg-docverse', 'tag-beginner', '2025-01-30T10:00:00Z', 'd5d03fb7-d966-4f0c-a534-5b2c77097965'),

-- Getting started guide tags
('pt-guide-tutorial', 'post-getting-started-guide', 'tag-tutorial', '2025-01-29T14:30:00Z', 'ac2402cf-9a84-46a5-8484-d32400e7a18d'),
('pt-guide-beginner', 'post-getting-started-guide', 'tag-beginner', '2025-01-29T14:30:00Z', 'ac2402cf-9a84-46a5-8484-d32400e7a18d'),
('pt-guide-documentation', 'post-getting-started-guide', 'tag-documentation', '2025-01-29T14:30:00Z', 'ac2402cf-9a84-46a5-8484-d32400e7a18d'),

-- Technical architecture tags
('pt-arch-architecture', 'post-technical-architecture', 'tag-architecture', '2025-01-28T09:15:00Z', '0492735d-ac0d-4e41-808a-199e19c0f3ac'),
('pt-arch-react', 'post-technical-architecture', 'tag-react', '2025-01-28T09:15:00Z', '0492735d-ac0d-4e41-808a-199e19c0f3ac'),
('pt-arch-typescript', 'post-technical-architecture', 'tag-typescript', '2025-01-28T09:15:00Z', '0492735d-ac0d-4e41-808a-199e19c0f3ac'),
('pt-arch-python', 'post-technical-architecture', 'tag-python', '2025-01-28T09:15:00Z', '0492735d-ac0d-4e41-808a-199e19c0f3ac'),
('pt-arch-fastapi', 'post-technical-architecture', 'tag-fastapi', '2025-01-28T09:15:00Z', '0492735d-ac0d-4e41-808a-199e19c0f3ac'),
('pt-arch-advanced', 'post-technical-architecture', 'tag-advanced', '2025-01-28T09:15:00Z', '0492735d-ac0d-4e41-808a-199e19c0f3ac'),

-- Thoughts tags
('pt-thoughts-react-react', 'thoughts-react-best-practices', 'tag-react', '2025-01-31T15:45:00Z', '75765941-6b90-4acf-8b4d-6937329d9c08'),
('pt-thoughts-react-webdev', 'thoughts-react-best-practices', 'tag-webdev', '2025-01-31T15:45:00Z', '75765941-6b90-4acf-8b4d-6937329d9c08'),

('pt-thoughts-ts-typescript', 'thoughts-typescript-tips', 'tag-typescript', '2025-01-30T11:20:00Z', 'ac2402cf-9a84-46a5-8484-d32400e7a18d'),
('pt-thoughts-ts-webdev', 'thoughts-typescript-tips', 'tag-webdev', '2025-01-30T11:20:00Z', 'ac2402cf-9a84-46a5-8484-d32400e7a18d'),

('pt-thoughts-css-css', 'thoughts-css-layouts', 'tag-css', '2025-01-29T16:30:00Z', '75765941-6b90-4acf-8b4d-6937329d9c08'),
('pt-thoughts-css-webdev', 'thoughts-css-layouts', 'tag-webdev', '2025-01-29T16:30:00Z', '75765941-6b90-4acf-8b4d-6937329d9c08');

-- Update user stats to reflect the new posts
UPDATE user_stats SET posts_count = posts_count + 1 WHERE user_id = 'd5d03fb7-d966-4f0c-a534-5b2c77097965';
UPDATE user_stats SET posts_count = posts_count + 2 WHERE user_id = 'ac2402cf-9a84-46a5-8484-d32400e7a18d';
UPDATE user_stats SET posts_count = posts_count + 1 WHERE user_id = '0492735d-ac0d-4e41-808a-199e19c0f3ac';
UPDATE user_stats SET posts_count = posts_count + 2 WHERE user_id = '75765941-6b90-4acf-8b4d-6937329d9c08';

-- =====================================================
-- SAMPLE REACTIONS AND INTERACTIONS
-- =====================================================

-- Add some sample reactions to make posts feel alive
INSERT OR IGNORE INTO reactions (id, event_type_id, user_id, target_type, target_id, created_ts) VALUES
-- Reactions for welcome post
('reaction-welcome-heart-1', 'event-heart', 'ac2402cf-9a84-46a5-8484-d32400e7a18d', 'post', 'post-welcome-itg-docverse', '2025-01-30T10:30:00Z'),
('reaction-welcome-heart-2', 'event-heart', '75765941-6b90-4acf-8b4d-6937329d9c08', 'post', 'post-welcome-itg-docverse', '2025-01-30T11:15:00Z'),
('reaction-welcome-fire-1', 'event-fire', '0492735d-ac0d-4e41-808a-199e19c0f3ac', 'post', 'post-welcome-itg-docverse', '2025-01-30T12:00:00Z'),
('reaction-welcome-favorite-1', 'event-favorite', 'ac2402cf-9a84-46a5-8484-d32400e7a18d', 'post', 'post-welcome-itg-docverse', '2025-01-30T10:35:00Z'),

-- Reactions for getting started guide
('reaction-guide-heart-1', 'event-heart', 'd5d03fb7-d966-4f0c-a534-5b2c77097965', 'post', 'post-getting-started-guide', '2025-01-29T15:00:00Z'),
('reaction-guide-thumbs-1', 'event-thumbs-up', '75765941-6b90-4acf-8b4d-6937329d9c08', 'post', 'post-getting-started-guide', '2025-01-29T16:30:00Z'),
('reaction-guide-favorite-1', 'event-favorite', '0492735d-ac0d-4e41-808a-199e19c0f3ac', 'post', 'post-getting-started-guide', '2025-01-29T17:45:00Z'),
('reaction-guide-celebrate-1', 'event-celebrate', 'd5d03fb7-d966-4f0c-a534-5b2c77097965', 'post', 'post-getting-started-guide', '2025-01-30T08:20:00Z'),

-- Reactions for technical architecture
('reaction-arch-fire-1', 'event-fire', 'ac2402cf-9a84-46a5-8484-d32400e7a18d', 'post', 'post-technical-architecture', '2025-01-28T10:00:00Z'),
('reaction-arch-fire-2', 'event-fire', '75765941-6b90-4acf-8b4d-6937329d9c08', 'post', 'post-technical-architecture', '2025-01-28T11:30:00Z'),
('reaction-arch-unicorn-1', 'event-unicorn', 'd5d03fb7-d966-4f0c-a534-5b2c77097965', 'post', 'post-technical-architecture', '2025-01-28T14:20:00Z'),
('reaction-arch-thinking-1', 'event-thinking', 'ac2402cf-9a84-46a5-8484-d32400e7a18d', 'post', 'post-technical-architecture', '2025-01-28T15:45:00Z'),

-- Reactions for thoughts
('reaction-react-heart-1', 'event-heart', 'ac2402cf-9a84-46a5-8484-d32400e7a18d', 'post', 'thoughts-react-best-practices', '2025-01-31T16:00:00Z'),
('reaction-react-thumbs-1', 'event-thumbs-up', '0492735d-ac0d-4e41-808a-199e19c0f3ac', 'post', 'thoughts-react-best-practices', '2025-01-31T16:30:00Z'),

('reaction-ts-fire-1', 'event-fire', '75765941-6b90-4acf-8b4d-6937329d9c08', 'post', 'thoughts-typescript-tips', '2025-01-30T11:45:00Z'),
('reaction-ts-heart-1', 'event-heart', '0492735d-ac0d-4e41-808a-199e19c0f3ac', 'post', 'thoughts-typescript-tips', '2025-01-30T12:30:00Z'),

('reaction-css-thumbs-1', 'event-thumbs-up', 'ac2402cf-9a84-46a5-8484-d32400e7a18d', 'post', 'thoughts-css-layouts', '2025-01-29T17:00:00Z'),
('reaction-css-heart-1', 'event-heart', 'd5d03fb7-d966-4f0c-a534-5b2c77097965', 'post', 'thoughts-css-layouts', '2025-01-29T18:15:00Z');

-- Add some sample comments/discussions
INSERT OR IGNORE INTO post_discussions (
    id, post_id, author_id, content, thread_level, thread_path, created_ts, created_by
) VALUES
-- Comments on welcome post
(
    'discussion-welcome-1',
    'post-welcome-itg-docverse',
    'ac2402cf-9a84-46a5-8484-d32400e7a18d',
    'This is exactly what our team needed! Love the clean interface and the ability to organize content with tags. Can''t wait to start documenting our API endpoints here.',
    0,
    '1',
    '2025-01-30T11:30:00Z',
    'ac2402cf-9a84-46a5-8484-d32400e7a18d'
),
(
    'discussion-welcome-2',
    'post-welcome-itg-docverse',
    '75765941-6b90-4acf-8b4d-6937329d9c08',
    'The React + FastAPI stack is perfect. As a frontend developer, I appreciate the type safety with TypeScript throughout the entire application.',
    0,
    '2',
    '2025-01-30T13:45:00Z',
    '75765941-6b90-4acf-8b4d-6937329d9c08'
),

-- Reply to the first comment
(
    'discussion-welcome-1-reply',
    'post-welcome-itg-docverse',
    'd5d03fb7-d966-4f0c-a534-5b2c77097965',
    'Thanks for the feedback! We designed it specifically with developer teams in mind. The API documentation features are coming in the next release!',
    1,
    '1.1',
    '2025-01-30T14:00:00Z',
    'd5d03fb7-d966-4f0c-a534-5b2c77097965'
),

-- Comments on getting started guide
(
    'discussion-guide-1',
    'post-getting-started-guide',
    '0492735d-ac0d-4e41-808a-199e19c0f3ac',
    'Great guide! The section on using tags effectively is really helpful. I''ve been struggling with how to organize content properly.',
    0,
    '1',
    '2025-01-29T18:30:00Z',
    '0492735d-ac0d-4e41-808a-199e19c0f3ac'
),

-- Comments on technical architecture
(
    'discussion-arch-1',
    'post-technical-architecture',
    '75765941-6b90-4acf-8b4d-6937329d9c08',
    'Fascinating deep dive! The clean architecture patterns really show. Question: Are you planning to add Redis caching for better performance at scale?',
    0,
    '1',
    '2025-01-28T16:20:00Z',
    '75765941-6b90-4acf-8b4d-6937329d9c08'
),
(
    'discussion-arch-2',
    'post-technical-architecture',
    'ac2402cf-9a84-46a5-8484-d32400e7a18d',
    'The migration path from SQLite to PostgreSQL is well thought out. This gives confidence that the platform can grow with our team.',
    0,
    '2',
    '2025-01-28T17:45:00Z',
    'ac2402cf-9a84-46a5-8484-d32400e7a18d'
);

-- Add some tag favorites to make the platform feel more interactive
INSERT OR IGNORE INTO reactions (id, event_type_id, user_id, target_type, target_id, created_ts) VALUES
-- Users following various tags
('favorite-tag-react-1', 'event-favorite', 'ac2402cf-9a84-46a5-8484-d32400e7a18d', 'tag', 'tag-react', '2025-01-30T09:00:00Z'),
('favorite-tag-react-2', 'event-favorite', '75765941-6b90-4acf-8b4d-6937329d9c08', 'tag', 'tag-react', '2025-01-30T09:30:00Z'),
('favorite-tag-typescript-1', 'event-favorite', 'ac2402cf-9a84-46a5-8484-d32400e7a18d', 'tag', 'tag-typescript', '2025-01-30T09:15:00Z'),
('favorite-tag-typescript-2', 'event-favorite', '0492735d-ac0d-4e41-808a-199e19c0f3ac', 'tag', 'tag-typescript', '2025-01-30T10:00:00Z'),
('favorite-tag-python-1', 'event-favorite', '0492735d-ac0d-4e41-808a-199e19c0f3ac', 'tag', 'tag-python', '2025-01-30T10:30:00Z'),
('favorite-tag-fastapi-1', 'event-favorite', '0492735d-ac0d-4e41-808a-199e19c0f3ac', 'tag', 'tag-fastapi', '2025-01-30T10:45:00Z'),
('favorite-tag-webdev-1', 'event-favorite', '75765941-6b90-4acf-8b4d-6937329d9c08', 'tag', 'tag-webdev', '2025-01-30T11:00:00Z'),
('favorite-tag-documentation-1', 'event-favorite', 'ac2402cf-9a84-46a5-8484-d32400e7a18d', 'tag', 'tag-documentation', '2025-01-30T11:30:00Z');
-- Title: Short Summary - Project payment-gateway-api
-- Author: d5d03fb7-d966-4f0c-a534-5b2c77097965 (prakashm88)
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
    -- Ensure unique generation type per trigger per post
    UNIQUE(trigger_id, post_id, generation_type)
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
-- KNOWLEDGE BASE SAMPLE DATA
-- =====================================================

-- Insert sample KB types
INSERT OR IGNORE INTO kb_types (id, name, category, description, icon, color, is_active) VALUES
-- External knowledge base types
('kb-type-1', 'gitlab-repo', 'code-repository', 'GitLab Repository', 'git-branch', '#FC6D26', TRUE),
('kb-type-2', 'pdf-document', 'document', 'PDF Document', 'file-text', '#FF0000', TRUE),
('kb-type-3', 'website', 'web-content', 'Website/Web Page', 'globe', '#0066CC', TRUE),
('kb-type-4', 'user-post', 'user-content', 'User Generated Post', 'edit', '#6366F1', TRUE),
-- Post types as knowledge base categories  
('kb-type-posts-posts', 'posts-posts', 'posts', 'Articles and blog posts', '📝', '#4A90E2', TRUE),
('kb-type-posts-thoughts', 'posts-thoughts', 'posts', 'Quick thoughts and micro-posts', '💭', '#F39C12', TRUE),
('kb-type-posts-llm-short', 'posts-llm-short', 'posts', 'AI-generated short summaries', '🤖', '#9B59B6', TRUE),
('kb-type-posts-llm-long', 'posts-llm-long', 'posts', 'AI-generated detailed documentation', '🤖', '#8E44AD', TRUE),
('kb-type-posts-block-diagram', 'posts-block-diagram', 'posts', 'Visual diagrams and flowcharts', '📊', '#2ECC71', TRUE),
('kb-type-posts-code-snippet', 'posts-code-snippet', 'posts', 'Code examples and snippets', '💻', '#E67E22', TRUE),
('kb-type-posts-discussion', 'posts-discussion', 'posts', 'Discussion starters and questions', '🗣️', '#3498DB', TRUE),
-- Virtual knowledge base for semantic search
('kb-type-semantic-search', 'semantic-search', 'system', 'Virtual knowledge base for semantic search indexing', '🔍', '#6B73FF', TRUE);

-- Insert sample knowledge base entries
INSERT OR IGNORE INTO knowledge_base (id, kb_type_id, title, description, source_url, source_identifier, status, created_by) VALUES
('kb-1', 'kb-type-1', 'Payment Gateway API', 'Core payment processing API with Stripe integration', 'https://gitlab.com/company/payment-gateway-api.git', 'payment-gateway-api', 'indexed', 'd5d03fb7-d966-4f0c-a534-5b2c77097965'),
('kb-2', 'kb-type-2', 'API Documentation.pdf', 'Comprehensive API documentation for payment gateway', '/uploads/api-docs.pdf', 'doc-hash-12345', 'processing', 'd5d03fb7-d966-4f0c-a534-5b2c77097965'),
('kb-3', 'kb-type-3', 'Stripe API Reference', 'Official Stripe API documentation', 'https://stripe.com/docs/api', 'stripe-docs', 'discovered', 'd5d03fb7-d966-4f0c-a534-5b2c77097965'),
-- Virtual knowledge base for semantic search operations
('semantic-search-kb', 'kb-type-semantic-search', 'Semantic Search Knowledge Base', 'Virtual knowledge base for semantic search indexing operations', 'internal://semantic-search', 'semantic-search-system', 'indexed', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27');

-- Insert sample trigger entries
INSERT OR IGNORE INTO kb_index_triggers (id, kb_id, triggered_by, trigger_type, trigger_context, expected_generations, overall_status, total_expected) VALUES
('trigger-1', 'kb-1', 'ac2402cf-9a84-46a5-8484-d32400e7a18d', 'manual', '{"branch": "main", "files": ["src/api/payments.py", "README.md"]}', '["llm-short", "llm-full", "system-diagram"]', 'completed', 3),
('trigger-2', 'kb-2', 'ac2402cf-9a84-46a5-8484-d32400e7a18d', 'auto', '{"pages": "1-50", "sections": ["api-endpoints", "authentication"]}', '["llm-short", "api-flow"]', 'processing', 2);

-- Insert sample kb_indexes (bridges to posts)
INSERT OR IGNORE INTO kb_indexes (id, trigger_id, post_id, generation_type, generation_status, created_by) VALUES
('kb-idx-1', 'trigger-1', 'post-welcome-itg-docverse', 'llm-short', 'completed', 'ac2402cf-9a84-46a5-8484-d32400e7a18d'),
('kb-idx-2', 'trigger-1', 'post-getting-started-guide', 'llm-full', 'completed', 'ac2402cf-9a84-46a5-8484-d32400e7a18d'),
('kb-idx-3', 'trigger-2', 'post-technical-architecture', 'llm-short', 'generating', '75765941-6b90-4acf-8b4d-6937329d9c08');

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
