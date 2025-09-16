-- Add system_ip field to lead_labor table
ALTER TABLE lead_labor 
ADD COLUMN system_ip VARCHAR(45);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_lead_labor_system_ip ON lead_labor(system_ip);
