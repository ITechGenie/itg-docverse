-- Migration: Add event-mentioned event type
-- Description: Adds the 'event-mentioned' event type to support user mentions in posts and comments
-- Date: 2025-12-10

INSERT INTO event_types (id, name, category, description, created_ts, created_by)
VALUES (
    'event-mentioned',
    'Mentioned',
    'engagement',
    'User was mentioned in a post or comment',
    CURRENT_TIMESTAMP,
    'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'  -- System user
);
