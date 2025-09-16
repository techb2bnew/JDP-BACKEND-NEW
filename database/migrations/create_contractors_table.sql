-- Create contractors table
CREATE TABLE IF NOT EXISTS contractors (
  id                  SERIAL PRIMARY KEY,
  contractor_name     VARCHAR(150) NOT NULL,
  company_name        VARCHAR(150),
  email               VARCHAR(150) UNIQUE,
  phone               VARCHAR(20),
  contact_person      VARCHAR(100),
  address             TEXT,
  job_id              VARCHAR(100),
  status              VARCHAR(20) DEFAULT 'active' CHECK (
                        status IN ('active', 'inactive')
                      ),
  created_by          INT REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contractors_email ON contractors(email);
CREATE INDEX IF NOT EXISTS idx_contractors_phone ON contractors(phone);
CREATE INDEX IF NOT EXISTS idx_contractors_contractor_name ON contractors(contractor_name);
CREATE INDEX IF NOT EXISTS idx_contractors_company_name ON contractors(company_name);
CREATE INDEX IF NOT EXISTS idx_contractors_job_id ON contractors(job_id);
CREATE INDEX IF NOT EXISTS idx_contractors_status ON contractors(status);
CREATE INDEX IF NOT EXISTS idx_contractors_created_by ON contractors(created_by);
