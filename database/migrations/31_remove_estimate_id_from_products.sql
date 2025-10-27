-- Migration: Remove estimate_id from products table
-- Since we now use estimate_products junction table for many-to-many relationship

-- First, drop the foreign key constraint
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS fk_products_estimate_id;

-- Drop the index
DROP INDEX IF EXISTS idx_products_estimate_id;

-- Remove the estimate_id column
ALTER TABLE products 
DROP COLUMN IF EXISTS estimate_id;

-- Add comment for documentation
COMMENT ON TABLE products IS 'Products table - now uses estimate_products junction table for estimate relationships';
