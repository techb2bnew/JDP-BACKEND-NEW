-- Migration: Add estimated_price to products table
-- This adds a new column for storing estimated price for products

-- Add estimated_price column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS estimated_price NUMERIC(10,2);

-- Add comment to the column for documentation
COMMENT ON COLUMN products.estimated_price IS 'Estimated price for the product';

