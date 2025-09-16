-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id                  SERIAL PRIMARY KEY,
  customer_name       VARCHAR(150) NOT NULL,
  company_name        VARCHAR(150),
  email               VARCHAR(150) UNIQUE,
  phone               VARCHAR(20),
  contact_person      VARCHAR(100),
  address             TEXT,
  created_by          INT REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_customer_name ON customers(customer_name);
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);

