
CREATE TABLE IF NOT EXISTS job_transactions (
  id                  SERIAL PRIMARY KEY,
  job_id              INT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  invoice_type        VARCHAR(50) NOT NULL CHECK (invoice_type IN ('estimate', 'proposal_invoice', 'progressive_invoice', 'final_invoice')),
  description         TEXT,
  amount              DECIMAL(12,2) NOT NULL,
  due_date            DATE,
  

  created_by          INT REFERENCES users(id) ON DELETE SET NULL,
  system_ip           VARCHAR(45),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_job_transactions_job_id ON job_transactions(job_id);
CREATE INDEX IF NOT EXISTS idx_job_transactions_invoice_type ON job_transactions(invoice_type);
CREATE INDEX IF NOT EXISTS idx_job_transactions_created_by ON job_transactions(created_by);


COMMENT ON TABLE job_transactions IS 'Job transactions and invoices table';
COMMENT ON COLUMN job_transactions.invoice_type IS 'Type of invoice: estimate, proposal_invoice, progressive_invoice, final_invoice';
