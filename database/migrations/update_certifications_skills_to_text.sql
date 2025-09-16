-- Migration to change certifications and skills columns from VARCHAR(100) to TEXT
-- This allows storing larger JSON arrays for certifications and skills

ALTER TABLE labor 
ALTER COLUMN certifications TYPE TEXT,
ALTER COLUMN skills TYPE TEXT;

-- Add comment to document the change
COMMENT ON COLUMN labor.certifications IS 'JSON array of certifications stored as TEXT';
COMMENT ON COLUMN labor.skills IS 'JSON array of skills stored as TEXT';
