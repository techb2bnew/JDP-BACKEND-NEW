-- Migration: Create orders and order_items tables
-- Description: Orders management system with relationships to customers, contractors, jobs, suppliers, and lead labor

CREATE TABLE IF NOT EXISTS orders (
  id                  SERIAL PRIMARY KEY,
  order_number        VARCHAR(50) UNIQUE NOT NULL,
  
  -- Relationships
  customer_id         INT REFERENCES customers(id) ON DELETE SET NULL,
  contractor_id       INT REFERENCES contractors(id) ON DELETE SET NULL,
  job_id              INT REFERENCES jobs(id) ON DELETE SET NULL,
  supplier_id         INT REFERENCES suppliers(id) ON DELETE SET NULL,
  lead_labour_id      INT REFERENCES lead_labor(id) ON DELETE SET NULL,
  
  -- Order details
  order_date          DATE DEFAULT CURRENT_DATE,
  delivery_date       DATE,
  total_items         INT DEFAULT 0,
  subtotal            DECIMAL(12,2) DEFAULT 0,
  tax_amount          DECIMAL(12,2) DEFAULT 0,
  discount_amount     DECIMAL(12,2) DEFAULT 0,
  total_amount        DECIMAL(12,2) DEFAULT 0,
  
  -- Delivery/shipping information
  delivery_address    TEXT,
  delivery_city_zip   VARCHAR(100),
  delivery_phone      VARCHAR(20),
  delivery_notes      TEXT,
  
  -- Order status and tracking
  status              VARCHAR(20) DEFAULT 'pending' CHECK (
                        status IN ('pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'completed')
                      ),
  payment_status      VARCHAR(20) DEFAULT 'unpaid' CHECK (
                        payment_status IN ('unpaid', 'partial', 'paid', 'refunded')
                      ),
  payment_method      VARCHAR(50),
  
  -- Notes and metadata
  notes               TEXT,
  internal_notes      TEXT,
  
  -- Audit fields
  created_by          INT REFERENCES users(id) ON DELETE SET NULL,
  created_from        VARCHAR(20) DEFAULT 'admin' CHECK (created_from IN ('admin', 'app', 'web')),
  system_ip           VARCHAR(45),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id                  SERIAL PRIMARY KEY,
  order_id            INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id          INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  
  -- Quantity and price
  quantity            INT NOT NULL DEFAULT 1,
  total_price         DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- Indexes for orders table
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_contractor_id ON orders(contractor_id);
CREATE INDEX IF NOT EXISTS idx_orders_job_id ON orders(job_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_lead_labour_id ON orders(lead_labour_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Indexes for order_items table
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Comments for documentation
COMMENT ON TABLE orders IS 'Main orders table with relationships to customers, contractors, jobs, suppliers, and lead labor';
COMMENT ON TABLE order_items IS 'Order line items - product details fetched from products table';
COMMENT ON COLUMN orders.order_number IS 'Unique order number (e.g., ORD-2025-001)';
COMMENT ON COLUMN orders.total_items IS 'Total number of items in the order';
COMMENT ON COLUMN orders.status IS 'Order processing status';
COMMENT ON COLUMN orders.payment_status IS 'Payment status of the order';
COMMENT ON COLUMN order_items.quantity IS 'Quantity ordered - will be deducted from product stock_quantity';
