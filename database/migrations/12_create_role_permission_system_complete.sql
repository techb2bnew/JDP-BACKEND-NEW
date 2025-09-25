-- Complete Role Permission System Migration
-- This migration creates all role, permission, and module tables with initial data

-- Create modules table first (referenced by permissions)
CREATE TABLE IF NOT EXISTS modules (
  id          SERIAL PRIMARY KEY,
  module_name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Create roles table
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

-- Create permissions table (references modules)
CREATE TABLE IF NOT EXISTS permissions (
  id          SERIAL PRIMARY KEY,
  module      VARCHAR(100) NOT NULL REFERENCES modules(module_name) ON DELETE CASCADE,
  action      VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(module, action)
);

-- Create role_permissions table (references roles and permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
  id            SERIAL PRIMARY KEY,
  role_id       INT REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
  allowed       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Create user_permissions table (references users and permissions)
CREATE TABLE IF NOT EXISTS user_permissions (
  id            SERIAL PRIMARY KEY,
  user_id       INT REFERENCES users(id) ON DELETE CASCADE,
  permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
  allowed       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- Insert all required modules
INSERT INTO modules (module_name, display_name, description) VALUES
('dashboard', 'Dashboard', 'Main dashboard module'),
('jobs', 'Jobs', 'Job management module'),
('products', 'Products', 'Product management module'),
('orders', 'Orders', 'Order management module'),
('invoices', 'Invoices', 'Invoice management module'),
('customers', 'Customers', 'Customer management module'),
('suppliers', 'Suppliers', 'Supplier management module'),
('reports', 'Reports', 'Reports and analytics module'),
('staff', 'Staff', 'Staff management module'),
('labour', 'Labour', 'Labour management module'),
('lead_labour', 'Lead Labour', 'Lead labour management module'),
('notification', 'Notifications', 'Notification management module'),
('inventory_price', 'Inventory & Pricing', 'Inventory and pricing management module'),
('bluesheet', 'Blue Sheet', 'Blue sheet management module'),
('role_permission', 'Role & Permissions', 'Role and permission management module')
ON CONFLICT (module_name) DO NOTHING;

-- Insert all required permissions
INSERT INTO permissions (module, action, display_name, description) VALUES
-- Dashboard permissions
('dashboard', 'view', 'View Dashboard', 'View main dashboard'),

-- Jobs permissions
('jobs', 'view', 'View Jobs', 'View job listings'),
('jobs', 'create', 'Create Jobs', 'Create new jobs'),
('jobs', 'edit', 'Edit Jobs', 'Edit existing jobs'),
('jobs', 'delete', 'Delete Jobs', 'Delete jobs'),
('jobs', 'assign', 'Assign Jobs', 'Assign jobs to workers'),

-- Products permissions
('products', 'view', 'View Products', 'View product listings'),
('products', 'create', 'Create Products', 'Create new products'),
('products', 'edit', 'Edit Products', 'Edit existing products'),
('products', 'delete', 'Delete Products', 'Delete products'),
('products', 'upload', 'Upload Products', 'Upload product data'),

-- Orders permissions
('orders', 'view', 'View Orders', 'View order listings'),
('orders', 'create', 'Create Orders', 'Create new orders'),
('orders', 'edit', 'Edit Orders', 'Edit existing orders'),
('orders', 'delete', 'Delete Orders', 'Delete orders'),

-- Invoices permissions
('invoices', 'view', 'View Invoices', 'View invoice listings'),
('invoices', 'create', 'Create Invoices', 'Create new invoices'),
('invoices', 'edit', 'Edit Invoices', 'Edit existing invoices'),
('invoices', 'delete', 'Delete Invoices', 'Delete invoices'),
('invoices', 'export', 'Export Invoices', 'Export invoice data'),

-- Customers permissions
('customers', 'view', 'View Customers', 'View customer listings'),
('customers', 'create', 'Create Customers', 'Create new customers'),
('customers', 'edit', 'Edit Customers', 'Edit existing customers'),
('customers', 'delete', 'Delete Customers', 'Delete customers'),

-- Suppliers permissions
('suppliers', 'view', 'View Suppliers', 'View supplier listings'),
('suppliers', 'create', 'Create Suppliers', 'Create new suppliers'),
('suppliers', 'edit', 'Edit Suppliers', 'Edit existing suppliers'),
('suppliers', 'delete', 'Delete Suppliers', 'Delete suppliers'),

-- Reports permissions
('reports', 'view', 'View Reports', 'View reports'),
('reports', 'create', 'Create Reports', 'Create new reports'),
('reports', 'edit', 'Edit Reports', 'Edit existing reports'),
('reports', 'delete', 'Delete Reports', 'Delete reports'),

-- Staff permissions
('staff', 'view', 'View Staff', 'View staff listings'),
('staff', 'create', 'Create Staff', 'Create new staff members'),
('staff', 'edit', 'Edit Staff', 'Edit existing staff members'),
('staff', 'delete', 'Delete Staff', 'Delete staff members'),

-- Labour permissions
('labour', 'view', 'View Labour', 'View labour listings'),
('labour', 'create', 'Create Labour', 'Create new labour entries'),
('labour', 'edit', 'Edit Labour', 'Edit existing labour entries'),
('labour', 'delete', 'Delete Labour', 'Delete labour entries'),

-- Lead Labour permissions
('lead_labour', 'view', 'View Lead Labour', 'View lead labour listings'),
('lead_labour', 'create', 'Create Lead Labour', 'Create new lead labour entries'),
('lead_labour', 'edit', 'Edit Lead Labour', 'Edit existing lead labour entries'),
('lead_labour', 'delete', 'Delete Lead Labour', 'Delete lead labour entries'),

-- Notification permissions
('notification', 'view', 'View Notifications', 'View notifications'),
('notification', 'create', 'Create Notifications', 'Create new notifications'),
('notification', 'edit', 'Edit Notifications', 'Edit existing notifications'),
('notification', 'delete', 'Delete Notifications', 'Delete notifications'),

-- Inventory & Pricing permissions
('inventory_price', 'view', 'View Inventory & Pricing', 'View inventory and pricing'),
('inventory_price', 'create', 'Create Inventory & Pricing', 'Create new inventory/pricing entries'),
('inventory_price', 'edit', 'Edit Inventory & Pricing', 'Edit existing inventory/pricing entries'),
('inventory_price', 'delete', 'Delete Inventory & Pricing', 'Delete inventory/pricing entries'),

-- Blue Sheet permissions
('bluesheet', 'view', 'View Blue Sheet', 'View blue sheet data'),
('bluesheet', 'create', 'Create Blue Sheet', 'Create new blue sheet entries'),
('bluesheet', 'edit', 'Edit Blue Sheet', 'Edit existing blue sheet entries'),
('bluesheet', 'delete', 'Delete Blue Sheet', 'Delete blue sheet entries'),

-- Role & Permission permissions
('role_permission', 'view', 'View Roles & Permissions', 'View roles and permissions'),
('role_permission', 'create', 'Create Roles & Permissions', 'Create new roles and permissions'),
('role_permission', 'edit', 'Edit Roles & Permissions', 'Edit existing roles and permissions'),
('role_permission', 'delete', 'Delete Roles & Permissions', 'Delete roles and permissions')

ON CONFLICT (module, action) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_roles_role_name ON roles(role_name);
CREATE INDEX IF NOT EXISTS idx_roles_role_type ON roles(role_type);

-- Add comments for documentation
COMMENT ON TABLE modules IS 'System modules for permission management';
COMMENT ON TABLE roles IS 'User roles with type and description';
COMMENT ON TABLE permissions IS 'Permissions linked to modules and actions';
COMMENT ON TABLE role_permissions IS 'Role-permission mappings';
COMMENT ON TABLE user_permissions IS 'User-specific permission overrides';

-- Success message
SELECT 'Role permission system created successfully with all modules and permissions!' as status;

