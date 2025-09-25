-- Fix Staff and Lead Labor Tables Migration
-- This migration fixes syntax errors in staff and lead_labor tables

-- Fix staff table (add missing comma)
DROP TABLE IF EXISTS staff CASCADE;
CREATE TABLE IF NOT EXISTS staff (
  id              SERIAL PRIMARY KEY,
  user_id         INT REFERENCES users(id) ON DELETE CASCADE,
  position        VARCHAR(100),
  department      VARCHAR(100),
  date_of_joining DATE,
  address         TEXT,
  management_type VARCHAR(50),
  system_ip       VARCHAR(45)
);

-- Fix lead_labor table (add missing id and comma)
DROP TABLE IF EXISTS lead_labor CASCADE;
CREATE TABLE IF NOT EXISTS lead_labor (
  id                SERIAL PRIMARY KEY,
  user_id           INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  labor_code        VARCHAR(20) UNIQUE,
  dob               DATE NOT NULL,
  address           TEXT NOT NULL,
  notes             TEXT,
  department        VARCHAR(100) NOT NULL,
  date_of_joining   DATE NOT NULL,
  specialization    VARCHAR(100),
  trade             VARCHAR(100),            
  experience        VARCHAR(50),
  id_proof_url      TEXT,
  photo_url         TEXT,
  resume_url        TEXT,
  management_type   VARCHAR(50),
  agreed_terms      BOOLEAN DEFAULT FALSE,
  system_ip         VARCHAR(45),
  created_at        TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department);
CREATE INDEX IF NOT EXISTS idx_staff_system_ip ON staff(system_ip);

CREATE INDEX IF NOT EXISTS idx_lead_labor_user_id ON lead_labor(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_labor_labor_code ON lead_labor(labor_code);
CREATE INDEX IF NOT EXISTS idx_lead_labor_department ON lead_labor(department);
CREATE INDEX IF NOT EXISTS idx_lead_labor_system_ip ON lead_labor(system_ip);

-- Add comments
COMMENT ON TABLE staff IS 'Staff members table with department and position tracking';
COMMENT ON TABLE lead_labor IS 'Lead labor workers table with department and specialization';

