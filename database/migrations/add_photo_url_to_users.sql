-- Migration to add photo_url column to users table
-- This allows storing user profile photos in the users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment
COMMENT ON COLUMN users.photo_url IS 'URL of user profile photo stored in S3';
