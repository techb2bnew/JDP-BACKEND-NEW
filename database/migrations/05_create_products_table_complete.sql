

CREATE TABLE IF NOT EXISTS products (
  id                  BIGSERIAL PRIMARY KEY,
  product_name        TEXT NOT NULL,
  category            TEXT,
  supplier_id         BIGINT REFERENCES suppliers(id) ON DELETE CASCADE, 
  job_id              INT REFERENCES jobs(id) ON DELETE SET NULL,
  description         TEXT,
  supplier_sku        TEXT,
  jdp_sku             TEXT,
  supplier_cost_price NUMERIC(10,2),
  markup_percentage   NUMERIC(5,2),
  markup_amount       NUMERIC(10,2),
  jdp_price           NUMERIC(10,2),
  profit_margin       NUMERIC(5,2),
  stock_quantity      INT,
  unit                TEXT,
  status              VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
  system_ip           VARCHAR(45),
  created_by          INT REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_system_ip ON products(system_ip);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products(created_by);
CREATE INDEX IF NOT EXISTS idx_products_job_id ON products(job_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);


COMMENT ON TABLE products IS 'Products table with supplier and job relationships';
COMMENT ON COLUMN products.status IS 'Product status: active, inactive, or draft';
COMMENT ON COLUMN products.job_id IS 'Associated job ID for product assignment';
