-- Add system_ip field to suppliers table
ALTER TABLE suppliers 
ADD COLUMN system_ip VARCHAR(45);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_suppliers_system_ip ON suppliers(system_ip);
