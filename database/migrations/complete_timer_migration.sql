-- Complete migration script to add all timer and work fields
-- Run this script to add all the new fields to your existing database

-- Step 1: Drop existing work_activity column if it exists (in case it's JSONB)
ALTER TABLE jobs DROP COLUMN IF EXISTS work_activity;

-- Step 2: Add work_activity as INTEGER column
ALTER TABLE jobs ADD COLUMN work_activity INTEGER DEFAULT 0;

-- Step 3: Add total_work_time if it doesn't exist
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS total_work_time INTERVAL DEFAULT '00:00:00';

-- Step 4: Add timer fields for mobile app
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS start_timer TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS end_timer TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pause_timer JSONB DEFAULT '[]';

-- Step 5: Update existing records to have default values
UPDATE jobs SET 
    work_activity = 0,
    total_work_time = '00:00:00'::interval
WHERE work_activity IS NULL OR total_work_time IS NULL;

-- Step 6: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_work_activity ON jobs (work_activity);
CREATE INDEX IF NOT EXISTS idx_jobs_total_work_time ON jobs (total_work_time);
CREATE INDEX IF NOT EXISTS idx_jobs_start_timer ON jobs (start_timer);
CREATE INDEX IF NOT EXISTS idx_jobs_end_timer ON jobs (end_timer);
CREATE INDEX IF NOT EXISTS idx_jobs_pause_timer ON jobs (pause_timer);

-- Step 7: Verify all columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND column_name IN ('work_activity', 'total_work_time', 'start_timer', 'end_timer', 'pause_timer')
ORDER BY column_name;

-- Step 8: Test insert with all fields
INSERT INTO jobs (
    job_title, 
    job_type, 
    description, 
    priority, 
    status,
    work_activity,
    total_work_time,
    start_timer,
    end_timer,
    pause_timer,
    created_from
) VALUES (
    'Test Job - Complete Timer',
    'service_based',
    'Test job with all timer fields',
    'medium',
    'active',
    5,
    '02:30:45'::interval,
    '2024-01-15T09:00:00Z'::timestamp,
    '2024-01-15T17:00:00Z'::timestamp,
    '[{"title": "Lunch Break", "duration": "00:30:45"}, {"title": "Equipment Issue", "duration": "00:15:30"}]'::jsonb,
    'app'
);

-- Step 9: Verify the test insert
SELECT 
    id,
    job_title,
    work_activity,
    total_work_time,
    start_timer,
    end_timer,
    pause_timer
FROM jobs 
WHERE job_title = 'Test Job - Complete Timer';

-- Step 10: Test update
UPDATE jobs 
SET 
    work_activity = 10,
    total_work_time = '08:00:00'::interval,
    start_timer = '2024-01-15T08:00:00Z'::timestamp,
    end_timer = '2024-01-15T18:00:00Z'::timestamp,
    pause_timer = '[{"title": "Lunch Break", "duration": "00:30:00"}, {"title": "Material Pickup", "duration": "00:45:00"}, {"title": "Customer Meeting", "duration": "01:00:00"}]'::jsonb
WHERE job_title = 'Test Job - Complete Timer';

-- Step 11: Verify the update
SELECT 
    id,
    job_title,
    work_activity,
    total_work_time,
    start_timer,
    end_timer,
    pause_timer
FROM jobs 
WHERE job_title = 'Test Job - Complete Timer';

-- Step 12: Clean up test data
DELETE FROM jobs WHERE job_title = 'Test Job - Complete Timer';

-- Success message
SELECT 'Complete timer migration successful! All fields added and tested.' as status;
