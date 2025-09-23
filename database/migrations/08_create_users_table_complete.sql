

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  password      TEXT NOT NULL,                        
  role          VARCHAR(50) NOT NULL,
  status        VARCHAR(20) DEFAULT 'active' CHECK (
                  status IN ('active','inactive','pending','on_leave' ,'suspended')
                ),
  otp           VARCHAR(6),
  otp_expiry    TIMESTAMP,
  is_temporary_password BOOLEAN DEFAULT FALSE,
  password_changed_at TIMESTAMP,
  photo_url     TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS user_tokens (
  id            SERIAL PRIMARY KEY,
  user_id       INT REFERENCES users(id) ON DELETE CASCADE,
  token         TEXT NOT NULL,
  token_type    VARCHAR(20) DEFAULT 'access' CHECK (token_type IN ('access', 'refresh')),
  expires_at    TIMESTAMP NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_otp ON users(otp);

CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_token ON user_tokens(token);
CREATE INDEX IF NOT EXISTS idx_user_tokens_expires_at ON user_tokens(expires_at);


COMMENT ON TABLE users IS 'Users table with authentication and profile management';
COMMENT ON TABLE user_tokens IS 'User authentication tokens table';
