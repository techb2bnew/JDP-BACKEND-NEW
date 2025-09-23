
CREATE TABLE IF NOT EXISTS labor (
  id                SERIAL PRIMARY KEY,
  user_id           INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  labor_code        VARCHAR(20) UNIQUE,
  dob               DATE NOT NULL,
  address           TEXT NOT NULL,
  notes             TEXT,
  date_of_joining   DATE NOT NULL,
  trade             VARCHAR(100),            
  experience        VARCHAR(50),
  hourly_rate       NUMERIC(10,2),
  hours_worked      DECIMAL(8,2) DEFAULT 0,
  supervisor_id     INT REFERENCES users(id),
  availability      VARCHAR(100),
  certifications    TEXT,
  skills            TEXT,
  management_type   VARCHAR(50),
  is_custom         BOOLEAN DEFAULT FALSE,
  job_id            INT REFERENCES jobs(id) ON DELETE SET NULL,
  system_ip         VARCHAR(45),
  created_at        TIMESTAMP DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_labor_user_id ON labor(user_id);
CREATE INDEX IF NOT EXISTS idx_labor_labor_code ON labor(labor_code);
CREATE INDEX IF NOT EXISTS idx_labor_job_id ON labor(job_id);
CREATE INDEX IF NOT EXISTS idx_labor_supervisor_id ON labor(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_labor_system_ip ON labor(system_ip);
CREATE INDEX IF NOT EXISTS idx_labor_is_custom ON labor(is_custom);


COMMENT ON TABLE labor IS 'Labor workers table with job assignments and work tracking';
COMMENT ON COLUMN labor.job_id IS 'Associated job ID for labor assignment';
COMMENT ON COLUMN labor.hours_worked IS 'Total hours worked by this labor worker';
COMMENT ON COLUMN labor.is_custom IS 'Whether this is a custom labor entry';
