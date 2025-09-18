

CREATE TABLE IF NOT EXISTS job_transactions (
  id                  SERIAL PRIMARY KEY,
  job_id              INT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  invoice_type    VARCHAR(50) NOT NULL CHECK (transaction_type IN ('estimate', 'invoice', 'payment', 'proposal')),
  description         TEXT,
  amount              DECIMAL(12,2) NOT NULL,
  due_date            DATE,
  
  -- System fields
  created_by          INT REFERENCES users(id) ON DELETE SET NULL,
  system_ip           VARCHAR(45),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS job_time_logs (
  id                  SERIAL PRIMARY KEY,
  job_id              INT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  labor_id            INT REFERENCES labor(id) ON DELETE SET NULL,
  lead_labor_id       INT REFERENCES lead_labor(id) ON DELETE SET NULL,
  worker_name         VARCHAR(200) NOT NULL,
  role                VARCHAR(100),
  work_description    TEXT,
  hours_worked        DECIMAL(8,2) NOT NULL,
  hourly_rate         DECIMAL(10,2) NOT NULL,
  total_cost          DECIMAL(12,2) NOT NULL,
  work_date           DATE NOT NULL,
  status              VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- System fields
  created_by          INT REFERENCES users(id) ON DELETE SET NULL,
  system_ip           VARCHAR(45),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);



-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_transactions_job_id ON job_transactions(job_id);
CREATE INDEX IF NOT EXISTS idx_job_transactions_type ON job_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_job_transactions_status ON job_transactions(status);
CREATE INDEX IF NOT EXISTS idx_job_transactions_created_by ON job_transactions(created_by);

CREATE INDEX IF NOT EXISTS idx_job_time_logs_job_id ON job_time_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_time_logs_labor_id ON job_time_logs(labor_id);
CREATE INDEX IF NOT EXISTS idx_job_time_logs_lead_labor_id ON job_time_logs(lead_labor_id);
CREATE INDEX IF NOT EXISTS idx_job_time_logs_work_date ON job_time_logs(work_date);
CREATE INDEX IF NOT EXISTS idx_job_time_logs_status ON job_time_logs(status);
CREATE INDEX IF NOT EXISTS idx_job_time_logs_created_by ON job_time_logs(created_by);


