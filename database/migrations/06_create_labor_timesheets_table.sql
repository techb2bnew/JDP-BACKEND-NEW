CREATE TABLE labor_timesheets (
  id SERIAL PRIMARY KEY,
  labor_id INTEGER REFERENCES labor(id),
  lead_labor_id INTEGER REFERENCES lead_labor(id),
  job_id INTEGER REFERENCES jobs(id),
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  work_activity TEXT,
  pause_timer JSONB DEFAULT '[]',
  job_status VARCHAR(50),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
