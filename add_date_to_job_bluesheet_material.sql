-- SQL Commands to add date field to job_bluesheet_material table
-- Run these commands in your SQL editor

-- Step 1: Add date column to job_bluesheet_material table
ALTER TABLE job_bluesheet_material 
ADD COLUMN IF NOT EXISTS date DATE;

-- Step 2: Add comment for documentation
COMMENT ON COLUMN job_bluesheet_material.date IS 'Date of the material entry';

-- Step 3: Add index for better performance on date queries
CREATE INDEX IF NOT EXISTS idx_job_bluesheet_material_date ON job_bluesheet_material(date);

-- Step 4: Verify the column was added (optional - for checking)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'job_bluesheet_material' 
AND column_name = 'date';

-- Step 5: Check table structure (optional - for verification)
\d job_bluesheet_material;

-- Note: The date field is now ready to use in your APIs
-- It will accept NULL values by default, so existing records won't be affected
