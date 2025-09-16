-- Run this SQL directly in your Supabase SQL Editor
-- This will add the missing OTP columns to the users table

-- Add OTP columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS otp VARCHAR(6),
ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_temporary_password BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_otp ON users(otp);
CREATE INDEX IF NOT EXISTS idx_users_otp_expiry ON users(otp_expiry);

-- Add comments to document the columns
COMMENT ON COLUMN users.otp IS '6-digit OTP for password reset';
COMMENT ON COLUMN users.otp_expiry IS 'OTP expiration timestamp';
COMMENT ON COLUMN users.is_temporary_password IS 'Flag to indicate if user has temporary password';
COMMENT ON COLUMN users.password_changed_at IS 'Timestamp when password was last changed';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('otp', 'otp_expiry', 'is_temporary_password', 'password_changed_at')
ORDER BY column_name;
