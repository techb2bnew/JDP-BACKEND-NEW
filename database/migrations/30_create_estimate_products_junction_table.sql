-- Migration: Create estimate_products junction table for many-to-many relationship
-- This allows same product to be used in multiple estimates without duplication

-- Create the junction table
CREATE TABLE IF NOT EXISTS estimate_products (
  id                  SERIAL PRIMARY KEY,
  estimate_id         INT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  product_id          BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_by          INT REFERENCES users(id) ON DELETE SET NULL,
  system_ip           VARCHAR(45),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique combination of estimate and product
  UNIQUE(estimate_id, product_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_estimate_products_estimate_id ON estimate_products(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_products_product_id ON estimate_products(product_id);
CREATE INDEX IF NOT EXISTS idx_estimate_products_created_by ON estimate_products(created_by);

-- Add comments for documentation
COMMENT ON TABLE estimate_products IS 'Junction table for many-to-many relationship between estimates and products';
COMMENT ON COLUMN estimate_products.estimate_id IS 'Reference to the estimate';
COMMENT ON COLUMN estimate_products.product_id IS 'Reference to the product';
