-- Migration: Add site_settings table for version tracking
-- Description: Adds site_settings table to enable migration system
-- Date: 2025-12-10

CREATE TABLE IF NOT EXISTS site_settings (
    id VARCHAR(50) PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string',
    user_id VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    UNIQUE(setting_key, user_id)
);

-- Set the current version to 2.1.0 (since we already have event-mentioned)
INSERT OR IGNORE INTO site_settings (id, setting_key, setting_value, setting_type, user_id, description, created_by, updated_by) VALUES
('set-db-version', 'database.version', '2.1.0', 'string', NULL, 'Current database schema version', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('set-upload-enabled', 'features.upload_enabled', 'true', 'boolean', NULL, 'Enable file uploads', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27'),
('set-max-upload-size', 'upload.max_file_size', '10485760', 'number', NULL, 'Maximum file upload size in bytes (10MB)', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27', 'ef85dcf4-97dd-4ccb-b481-93067b0cfd27');
