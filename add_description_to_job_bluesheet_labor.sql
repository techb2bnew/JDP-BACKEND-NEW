-- SQL Commands to add description field to job_bluesheet_labor table
-- Run these commands in your SQL editor

-- Step 1: Add description column to job_bluesheet_labor table
ALTER TABLE job_bluesheet_labor 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Step 2: Add comment for documentation
COMMENT ON COLUMN job_bluesheet_labor.description IS 'Description or notes for the labor entry';

-- Step 3: Verify the column was added (optional - for checking)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'job_bluesheet_labor' 
AND column_name = 'description';

-- Step 4: Check table structure (optional - for verification)
\d job_bluesheet_labor;

-- Note: The description field is now ready to use in your APIs
-- It will accept NULL values by default, so existing records won't be affected
