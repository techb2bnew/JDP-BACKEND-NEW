
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
  

  materials_cost      DECIMAL(12,2) DEFAULT 0,
  labor_cost          DECIMAL(12,2) DEFAULT 0,
  additional_costs    DECIMAL(12,2) DEFAULT 0,
  subtotal            DECIMAL(12,2) DEFAULT 0,
  tax_percentage      DECIMAL(5,2) DEFAULT 8.00,
  tax_amount          DECIMAL(12,2) DEFAULT 0,
  total_amount        DECIMAL(12,2) DEFAULT 0,
  

  invoice_type        VARCHAR(50) DEFAULT 'estimate' CHECK (invoice_type IN ('estimate', 'proposal_invoice', 'progressive_invoice', 'final_invoice')),
  invoice_number      VARCHAR(50) UNIQUE,
  issue_date          DATE,
  due_date            DATE,
  

  status              VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  
  
  created_by          INT REFERENCES users(id) ON DELETE SET NULL,
  system_ip           VARCHAR(45),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS estimate_additional_costs (
  id                  SERIAL PRIMARY KEY,
  estimate_id         INT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  description         VARCHAR(200) NOT NULL,
  amount              DECIMAL(12,2) NOT NULL,
  

  created_by          INT REFERENCES users(id) ON DELETE SET NULL,
  system_ip           VARCHAR(45),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_estimates_job_id ON estimates(job_id);
CREATE INDEX IF NOT EXISTS idx_estimates_customer_id ON estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_estimate_date ON estimates(estimate_date);
CREATE INDEX IF NOT EXISTS idx_estimates_created_by ON estimates(created_by);
CREATE INDEX IF NOT EXISTS idx_estimates_invoice_type ON estimates(invoice_type);
CREATE INDEX IF NOT EXISTS idx_estimates_invoice_number ON estimates(invoice_number);
CREATE INDEX IF NOT EXISTS idx_estimates_issue_date ON estimates(issue_date);
CREATE INDEX IF NOT EXISTS idx_estimates_due_date ON estimates(due_date);

CREATE INDEX IF NOT EXISTS idx_estimate_additional_costs_estimate_id ON estimate_additional_costs(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_additional_costs_created_by ON estimate_additional_costs(created_by);

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_number INTEGER;
    invoice_num TEXT;
BEGIN

    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
  
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-' || current_year || '-(.+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM estimates 
    WHERE invoice_number LIKE 'INV-' || current_year || '-%';
    

    invoice_num := 'INV-' || current_year || '-' || LPAD(next_number::TEXT, 3, '0');
    
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;


COMMENT ON TABLE estimates IS 'Estimates table with invoice fields and additional costs support';
COMMENT ON COLUMN estimates.invoice_type IS 'Type of invoice: estimate, proposal_invoice, progressive_invoice, final_invoice';
COMMENT ON COLUMN estimates.invoice_number IS 'Auto-generated invoice number in format INV-YYYY-XXX';
COMMENT ON COLUMN estimates.issue_date IS 'Date when the invoice was issued';
COMMENT ON COLUMN estimates.due_date IS 'Date when the invoice payment is due';
COMMENT ON TABLE estimate_additional_costs IS 'Additional costs for estimates';
