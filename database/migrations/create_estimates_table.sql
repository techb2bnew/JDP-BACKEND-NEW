-- Create estimates table
-- This migration creates the estimates table for job estimates

CREATE TABLE IF NOT EXISTS estimates (
  id                  SERIAL PRIMARY KEY,
  job_id              INT REFERENCES jobs(id) ON DELETE CASCADE,
  estimate_title      VARCHAR(200) NOT NULL,
  customer_id         INT REFERENCES customers(id) ON DELETE SET NULL,
  priority            VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  valid_until         DATE,
  location            VARCHAR(200),
  description         TEXT,
  service_type        VARCHAR(50) NOT NULL CHECK (service_type IN ('service_based', 'contract_based')),
  email_address       VARCHAR(150) NOT NULL,
  estimate_date       DATE NOT NULL,
  
  -- Cost breakdown
  materials_cost      DECIMAL(12,2) DEFAULT 0,
  labor_cost          DECIMAL(12,2) DEFAULT 0,
  additional_costs    DECIMAL(12,2) DEFAULT 0,
  subtotal            DECIMAL(12,2) DEFAULT 0,
  tax_percentage      DECIMAL(5,2) DEFAULT 8.00,
  tax_amount          DECIMAL(12,2) DEFAULT 0,
  total_amount        DECIMAL(12,2) DEFAULT 0,
  
  -- Status
  status              VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  
  -- System fields
  created_by          INT REFERENCES users(id) ON DELETE SET NULL,
  system_ip           VARCHAR(45),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- Create additional_costs table for estimate additional costs
CREATE TABLE IF NOT EXISTS estimate_additional_costs (
  id                  SERIAL PRIMARY KEY,
  estimate_id         INT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  description         VARCHAR(200) NOT NULL,
  amount              DECIMAL(12,2) NOT NULL,
  
  -- System fields
  created_by          INT REFERENCES users(id) ON DELETE SET NULL,
  system_ip           VARCHAR(45),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_estimates_job_id ON estimates(job_id);
CREATE INDEX IF NOT EXISTS idx_estimates_customer_id ON estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_estimate_date ON estimates(estimate_date);
CREATE INDEX IF NOT EXISTS idx_estimates_created_by ON estimates(created_by);

CREATE INDEX IF NOT EXISTS idx_estimate_additional_costs_estimate_id ON estimate_additional_costs(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_additional_costs_created_by ON estimate_additional_costs(created_by);
