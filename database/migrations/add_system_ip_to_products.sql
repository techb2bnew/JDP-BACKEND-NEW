-- Add system_ip field to products table
ALTER TABLE products 
ADD COLUMN system_ip VARCHAR(45);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_system_ip ON products(system_ip);
