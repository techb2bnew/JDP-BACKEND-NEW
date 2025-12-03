-- Create staff_timesheets table
CREATE TABLE IF NOT EXISTS staff_timesheets (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  total_hours DECIMAL(8,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_timesheets_staff_id ON staff_timesheets(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_timesheets_date ON staff_timesheets(date);
CREATE INDEX IF NOT EXISTS idx_staff_timesheets_staff_date ON staff_timesheets(staff_id, date);

-- Add comments
COMMENT ON TABLE staff_timesheets IS 'Staff timesheet entries for tracking work hours';
COMMENT ON COLUMN staff_timesheets.title IS 'Title or description of the work/task';
COMMENT ON COLUMN staff_timesheets.staff_id IS 'Reference to staff member';
COMMENT ON COLUMN staff_timesheets.date IS 'Date of the timesheet entry';
COMMENT ON COLUMN staff_timesheets.start_time IS 'Start time of work';
COMMENT ON COLUMN staff_timesheets.end_time IS 'End time of work';
COMMENT ON COLUMN staff_timesheets.total_hours IS 'Total hours worked (can be calculated from start_time and end_time)';

