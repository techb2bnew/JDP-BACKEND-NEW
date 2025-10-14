-- Migration: Remove cost calculation fields from estimates table
-- Description: Removing deprecated cost fields, keeping only estimate_additional_costs table

-- Remove cost calculation fields from estimates table
ALTER TABLE estimates DROP COLUMN IF EXISTS materials_cost;
ALTER TABLE estimates DROP COLUMN IF EXISTS labor_cost;
ALTER TABLE estimates DROP COLUMN IF EXISTS additional_costs;
ALTER TABLE estimates DROP COLUMN IF EXISTS subtotal;
ALTER TABLE estimates DROP COLUMN IF EXISTS tax_percentage;
ALTER TABLE estimates DROP COLUMN IF EXISTS tax_amount;

-- Update comment
COMMENT ON TABLE estimates IS 'Estimates table with invoice fields. Use estimate_additional_costs table for additional costs.';
COMMENT ON TABLE estimate_additional_costs IS 'Additional costs for estimates - this table remains functional';

