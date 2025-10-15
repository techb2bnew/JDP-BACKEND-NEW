
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

CREATE INDEX idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX idx_user_tokens_token ON user_tokens(token);
CREATE INDEX idx_user_tokens_expires_at ON user_tokens(expires_at);

CREATE TABLE IF NOT EXISTS staff (
  id              SERIAL PRIMARY KEY,
  user_id         INT REFERENCES users(id) ON DELETE CASCADE,
  position        VARCHAR(100),
  department      VARCHAR(100),
  date_of_joining DATE,
  address         TEXT
  management_type VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS lead_labor (
  id                SERIAL PRIMARY KEY,
  user_id           INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  labor_code        VARCHAR(20) UNIQUE,
  dob               DATE NOT NULL,
  address           TEXT NOT NULL,
  notes             TEXT,
  department        VARCHAR(100) NOT NULL,
  date_of_joining   DATE NOT NULL,
  specialization    VARCHAR(100),
  trade             VARCHAR(100),            
  experience        VARCHAR(50),
  id_proof_url      TEXT,
  photo_url         TEXT,
  resume_url        TEXT,
  management_type VARCHAR(50)
  agreed_terms      BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS labor (
  id                SERIAL PRIMARY KEY,
  user_id           INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  labor_code        VARCHAR(20) UNIQUE,
  dob               DATE NOT NULL,
  address           TEXT NOT NULL,
  notes             TEXT,
  date_of_joining   DATE NOT NULL,
  trade             VARCHAR(100),            
  experience        VARCHAR(50),
  hourly_rate       NUMERIC(10,2),
  hours_worked      DECIMAL(8,2) DEFAULT 0,
  supervisor_id     INT REFERENCES users(id),
  availability      VARCHAR(100),
  certifications      TEXT,
  skills      TEXT,
  management_type VARCHAR(50),
  is_custom       BOOLEAN DEFAULT FALSE,
  job_id          INT REFERENCES jobs(id) ON DELETE SET NULL,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id               SERIAL PRIMARY KEY,
  user_id          INT REFERENCES users(id) ON DELETE CASCADE,
  supplier_code    VARCHAR(20) UNIQUE,
  company_name     VARCHAR(150) NOT NULL,
  contact_person   VARCHAR(100) NOT NULL,
  address          TEXT,
  contract_start   DATE,
  contract_end     DATE,
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  role_name   VARCHAR(100) NOT NULL,
  role_type   VARCHAR(50) NOT NULL, 
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_name, role_type)
);

CREATE TABLE IF NOT EXISTS modules (
  id          SERIAL PRIMARY KEY,
  module_name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id          SERIAL PRIMARY KEY,
  module      VARCHAR(100) NOT NULL REFERENCES modules(module_name) ON DELETE CASCADE,
  action      VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(module, action)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id            SERIAL PRIMARY KEY,
  role_id       INT REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
  allowed       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id            SERIAL PRIMARY KEY,
  user_id       INT REFERENCES users(id) ON DELETE CASCADE,
  permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
  allowed       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);


ALTER TABLE users 
ADD COLUMN is_temporary_password BOOLEAN DEFAULT TRUE,
ADD COLUMN password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;


CREATE TABLE IF NOT EXISTS products (
  id                  BIGSERIAL PRIMARY KEY,
  product_name        TEXT NOT NULL,
  category            TEXT,
  supplier_id         BIGINT REFERENCES suppliers(id) ON DELETE CASCADE, 
  job_id              INT REFERENCES jobs(id) ON DELETE SET NULL,
  estimate_id         INT REFERENCES estimates(id) ON DELETE SET NULL,
  description         TEXT,
  supplier_sku        TEXT,
  jdp_sku             TEXT,
  supplier_cost_price NUMERIC(10,2),
  estimated_price     NUMERIC(10,2),
  markup_percentage   NUMERIC(5,2),
  markup_amount       NUMERIC(10,2),
  jdp_price           NUMERIC(10,2),
  profit_margin       NUMERIC(5,2),
  stock_quantity      INT,
  unit                TEXT,
  status              VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
  system_ip           VARCHAR(45),
  created_by          INT REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_system_ip ON products(system_ip);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products(created_by);
CREATE INDEX IF NOT EXISTS idx_products_estimate_id ON products(estimate_id);
CREATE INDEX IF NOT EXISTS idx_products_job_id ON products(job_id);








