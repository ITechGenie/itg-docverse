-- ITG DocVerse Database Bootstrap Script
-- This script contains all initial data and schema definitions
-- Run this script when setting up the database for the first time

-- ============================================
-- INITIAL SAMPLE DATA
-- ============================================

-- Sample Users
-- User ID: 1
-- Username: prakashm88
-- Display Name: Prakash M
-- Email: prakash@example.com
-- Password: hashed_password_here
-- Bio: Full Stack Developer | Tech Enthusiast | Open Source Contributor
-- Location: Chennai, India
-- Website: https://itechgenie.com 
-- Joined Date: 2024-01-15T00:00:00Z

-- User ID: 2
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
