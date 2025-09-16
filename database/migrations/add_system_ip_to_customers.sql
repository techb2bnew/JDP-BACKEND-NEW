-- Add system_ip field to customers table
ALTER TABLE customers 
ADD COLUMN system_ip VARCHAR(45);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_customers_system_ip ON customers(system_ip);
