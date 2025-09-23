

CREATE TABLE IF NOT EXISTS customers (
  id                  SERIAL PRIMARY KEY,
  customer_name       VARCHAR(150) NOT NULL,
  company_name        VARCHAR(150),
  email               VARCHAR(150) UNIQUE,
  phone               VARCHAR(20),
  contact_person      VARCHAR(100),
  address             TEXT,
  status              VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by          INT REFERENCES users(id) ON DELETE SET NULL,
  system_ip           VARCHAR(45),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_customer_name ON customers(customer_name);
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_system_ip ON customers(system_ip);


COMMENT ON TABLE customers IS 'Customers table with status tracking';
COMMENT ON COLUMN customers.status IS 'Customer status: active or inactive';
