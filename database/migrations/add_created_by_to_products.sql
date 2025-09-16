-- Add created_by field to products table
ALTER TABLE products 
ADD COLUMN created_by INT REFERENCES users(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products(created_by);
