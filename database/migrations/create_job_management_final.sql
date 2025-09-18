
CREATE TABLE IF NOT EXISTS jobs (
  id                  SERIAL PRIMARY KEY,
  job_title           VARCHAR(200) NOT NULL,
  job_type            VARCHAR(50) NOT NULL CHECK (job_type IN ('service_based', 'contract_based')),
  customer_id         INT REFERENCES customers(id) ON DELETE SET NULL,
  contractor_id       INT REFERENCES contractors(id) ON DELETE SET NULL,
  description         TEXT,
  priority            VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
 
  address             TEXT,
  city_zip            VARCHAR(100),
  phone               VARCHAR(20),
  email               VARCHAR(150),
  

  bill_to_address     TEXT,
  bill_to_city_zip    VARCHAR(100),
  bill_to_phone       VARCHAR(20),
  bill_to_email       VARCHAR(150),
  same_as_address     BOOLEAN DEFAULT FALSE,
  

  due_date            DATE,
  estimated_hours     DECIMAL(8,2) DEFAULT 0,
  estimated_cost      DECIMAL(12,2) DEFAULT 0,
  
 
  assigned_lead_labor_ids TEXT, 
  assigned_labor_ids      TEXT,
  
  assigned_material_ids   TEXT,
  

  status              VARCHAR(20) DEFAULT 'draft' CHECK (
                        status IN ('draft', 'active', 'in_progress', 'completed', 'cancelled', 'on_hold')
                      ),
  

  created_by          INT REFERENCES users(id) ON DELETE SET NULL,
  created_from        VARCHAR(20) DEFAULT 'admin' CHECK (created_from IN ('admin', 'app')),
  system_ip           VARCHAR(45),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_contractor_id ON jobs(contractor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority);
CREATE INDEX IF NOT EXISTS idx_jobs_due_date ON jobs(due_date);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_system_ip ON jobs(system_ip);






