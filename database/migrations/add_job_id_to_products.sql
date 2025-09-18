-- Add job_id column to existing products table
-- This migration adds the job_id foreign key to products table

-- Add job_id column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS job_id INT REFERENCES jobs(id) ON DELETE SET NULL;

-- Add is_custom column to distinguish custom products from regular products
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;

-- Add unit_cost column for product unit cost
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2) DEFAULT 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_job_id ON products(job_id);
CREATE INDEX IF NOT EXISTS idx_products_is_custom ON products(is_custom);

-- Update existing products to have NULL job_id and is_custom = false (optional)
-- UPDATE products SET job_id = NULL, is_custom = FALSE WHERE job_id IS NULL;
