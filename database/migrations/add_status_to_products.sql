-- Add status field to products table
ALTER TABLE products 
ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (
  status IN ('active', 'inactive', 'draft')
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
