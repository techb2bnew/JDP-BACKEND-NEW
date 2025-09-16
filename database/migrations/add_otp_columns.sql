-- Migration: Add OTP columns to users table
-- Date: 2024-01-XX
-- Description: Add otp and otp_expiry columns for forgot password functionality

-- Add OTP columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS otp VARCHAR(6),
ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_temporary_password BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Add index on otp for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_otp ON users(otp);

-- Add index on otp_expiry for cleanup queries
CREATE INDEX IF NOT EXISTS idx_users_otp_expiry ON users(otp_expiry);

-- Add comment to document the columns
COMMENT ON COLUMN users.otp IS '6-digit OTP for password reset';
COMMENT ON COLUMN users.otp_expiry IS 'OTP expiration timestamp';
COMMENT ON COLUMN users.is_temporary_password IS 'Flag to indicate if user has temporary password';
COMMENT ON COLUMN users.password_changed_at IS 'Timestamp when password was last changed';
