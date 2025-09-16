-- Add system_ip field to labor table
ALTER TABLE labor 
ADD COLUMN system_ip VARCHAR(45);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_labor_system_ip ON labor(system_ip);
