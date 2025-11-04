-- Migration: Add profile_image to staff table
-- This adds a column to store staff profile image URL from S3

-- Add profile_image column to staff table
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- Add comment to the column for documentation
COMMENT ON COLUMN staff.profile_image IS 'Profile image URL stored in S3 bucket';

-- Create index for better performance when querying by profile image (optional)
-- CREATE INDEX IF NOT EXISTS idx_staff_profile_image ON staff(profile_image) WHERE profile_image IS NOT NULL;
