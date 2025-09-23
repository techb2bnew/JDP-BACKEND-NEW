
CREATE TABLE IF NOT EXISTS suppliers (
  id               SERIAL PRIMARY KEY,
  user_id          INT REFERENCES users(id) ON DELETE CASCADE,
  supplier_code    VARCHAR(20) UNIQUE,
  company_name     VARCHAR(150) NOT NULL,
  contact_person   VARCHAR(100) NOT NULL,
  address          TEXT,
  contract_start   DATE,
  contract_end     DATE,
  notes            TEXT,
  system_ip        VARCHAR(45),
  created_at       TIMESTAMP DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_name ON suppliers(company_name);
CREATE INDEX IF NOT EXISTS idx_suppliers_system_ip ON suppliers(system_ip);


COMMENT ON TABLE suppliers IS 'Suppliers table with user relationships';
COMMENT ON COLUMN suppliers.user_id IS 'Associated user ID for supplier';
