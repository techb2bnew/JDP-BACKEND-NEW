-- Add missing columns to products table
-- Run this SQL in your Supabase dashboard

-- Add status column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft'));

-- Add system_ip column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS system_ip VARCHAR(45);

-- Add created_by column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_system_ip ON products(system_ip);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products(created_by);

-- Update existing products to have 'active' status
UPDATE products SET status = 'active' WHERE status IS NULL;
