-- Add estimate_id column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS estimate_id INTEGER;

-- Add foreign key constraint
ALTER TABLE products 
ADD CONSTRAINT fk_products_estimate_id 
FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_products_estimate_id ON products(estimate_id);

-- Add comment
COMMENT ON COLUMN products.estimate_id IS 'Reference to the estimate this product belongs to';
