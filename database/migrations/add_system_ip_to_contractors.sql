-- Add system_ip field to contractors table
ALTER TABLE contractors 
ADD COLUMN system_ip VARCHAR(45);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_contractors_system_ip ON contractors(system_ip);
