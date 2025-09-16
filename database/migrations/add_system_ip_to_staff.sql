-- Add system_ip field to staff table
ALTER TABLE staff 
ADD COLUMN system_ip VARCHAR(45);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_staff_system_ip ON staff(system_ip);
