-- Migration: Add total_cost field to labor and products tables
-- This adds total_cost calculation fields for better invoice generation

-- Add total_cost field to labor table
ALTER TABLE labor 
ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10,2) DEFAULT 0;

-- Add total_cost field to products table  
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10,2) DEFAULT 0;

-- Add index for better performance on total_cost queries
CREATE INDEX IF NOT EXISTS idx_labor_total_cost ON labor(total_cost);
CREATE INDEX IF NOT EXISTS idx_products_total_cost ON products(total_cost);

-- Add comments
COMMENT ON COLUMN labor.total_cost IS 'Total cost calculated as hours_worked * hourly_rate';
COMMENT ON COLUMN products.total_cost IS 'Total cost for this product (can be calculated or manually set)';

-- Update existing records with calculated total_cost
-- For labor: total_cost = hours_worked * hourly_rate
UPDATE labor 
SET total_cost = COALESCE(hours_worked * hourly_rate, 0) 
WHERE total_cost = 0;

-- For products: total_cost = jdp_price (or supplier_cost_price if jdp_price is null)
UPDATE products 
SET total_cost = COALESCE(jdp_price, supplier_cost_price, 0) 
WHERE total_cost = 0;
