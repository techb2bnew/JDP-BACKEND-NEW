ALTER TABLE staff_timesheets 
ADD COLUMN IF NOT EXISTS job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_staff_timesheets_job_id ON staff_timesheets(job_id);

CREATE INDEX IF NOT EXISTS idx_staff_timesheets_job_date ON staff_timesheets(job_id, date);

COMMENT ON COLUMN staff_timesheets.job_id IS 'Reference to job (optional - staff timesheet can be linked to a specific job)';

