-- Add status field to customers table
ALTER TABLE customers 
ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (
  status IN ('active', 'inactive')
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
