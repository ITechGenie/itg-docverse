-- Migration: Add event-mentioned, event-notice-acknowledged, event-subscription-email event types
-- Description: Adds the 'event-mentioned', 'event-notice-acknowledged', and 'event-subscription-email' event types to support user mentions in posts and comments
-- Date: 2025-12-10

INSERT INTO event_types (id, name, category, description, created_ts, created_by)
VALUES (
    'event-mentioned',
    'mentioned',
    'engagement',
    'User was mentioned in a post or comment',
    CURRENT_TIMESTAMP,
    'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'  -- System user
), (
    'event-notice-acknowledged',
    'notice-acknowledged',
    'engagement',
    'User acknowledged a notice',
    CURRENT_TIMESTAMP,
    'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'  -- System user
), (
    'event-subscription-email',
    'subscription-email',
    'engagement',
    'Email notification sent to user for subscription',
    CURRENT_TIMESTAMP,
    'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'  -- System user
);