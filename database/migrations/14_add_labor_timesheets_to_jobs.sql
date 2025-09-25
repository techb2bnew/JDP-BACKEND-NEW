-- Migration: Add labor timesheets tracking to jobs table
-- This adds JSON fields to track individual labor work hours

-- Add labor_timesheets field to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS labor_timesheets JSONB DEFAULT '[]';

-- Add lead_labor_timesheets field to jobs table  
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS lead_labor_timesheets JSONB DEFAULT '[]';

-- Add index for better performance on JSON queries
CREATE INDEX IF NOT EXISTS idx_jobs_labor_timesheets ON jobs USING GIN (labor_timesheets);
CREATE INDEX IF NOT EXISTS idx_jobs_lead_labor_timesheets ON jobs USING GIN (lead_labor_timesheets);

-- Example structure for labor_timesheets:
-- [
--   {
--     "labor_id": 1,
--     "user_id": 123,
--     "labor_name": "John Doe",
--     "date": "2024-01-15",
--     "start_time": "09:00:00",
--     "end_time": "17:00:00", 
--     "total_hours": "08:00:00",
--     "break_duration": "01:00:00",
--     "work_hours": "07:00:00",
--     "hourly_rate": 25.00,
--     "total_cost": 175.00,
--     "work_activity": 5,
--     "status": "active",
--     "notes": "Electrical installation work",
--     "created_at": "2024-01-15T09:00:00Z",
--     "updated_at": "2024-01-15T17:00:00Z"
--   }
-- ]

-- Example structure for lead_labor_timesheets:
-- [
--   {
--     "lead_labor_id": 2,
--     "user_id": 124, 
--     "labor_name": "Mike Supervisor",
--     "date": "2024-01-15",
--     "start_time": "08:00:00",
--     "end_time": "18:00:00",
--     "total_hours": "10:00:00", 
--     "break_duration": "01:00:00",
--     "work_hours": "09:00:00",
--     "hourly_rate": 35.00,
--     "total_cost": 315.00,
--     "work_activity": 8,
--     "status": "active",
--     "notes": "Supervising electrical team",
--     "created_at": "2024-01-15T08:00:00Z",
--     "updated_at": "2024-01-15T18:00:00Z"
--   }
-- ]
