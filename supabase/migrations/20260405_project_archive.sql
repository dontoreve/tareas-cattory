-- Add archived_at column to projects for soft-archive support
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;
