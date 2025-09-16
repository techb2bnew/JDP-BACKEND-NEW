-- Migration to create user_tokens table for token management
-- This allows storing JWT tokens in database for secure logout functionality

CREATE TABLE IF NOT EXISTS user_tokens (
  id            SERIAL PRIMARY KEY,
  user_id       INT REFERENCES users(id) ON DELETE CASCADE,
  token         TEXT NOT NULL,
  token_type    VARCHAR(20) DEFAULT 'access' CHECK (token_type IN ('access', 'refresh')),
  expires_at    TIMESTAMP NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_token ON user_tokens(token);
CREATE INDEX IF NOT EXISTS idx_user_tokens_expires_at ON user_tokens(expires_at);

-- Add comments
COMMENT ON TABLE user_tokens IS 'Stores JWT tokens for secure authentication and logout';
COMMENT ON COLUMN user_tokens.token IS 'JWT token string';
COMMENT ON COLUMN user_tokens.token_type IS 'Type of token: access or refresh';
COMMENT ON COLUMN user_tokens.expires_at IS 'Token expiration timestamp';
COMMENT ON COLUMN user_tokens.is_active IS 'Whether token is active (not revoked)';
