-- Create job_bluesheet table
CREATE TABLE job_bluesheet (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_by INTEGER REFERENCES users(id),
    notes TEXT,
    additional_charges DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create job_bluesheet_labor table for labor entries
CREATE TABLE job_bluesheet_labor (
    id SERIAL PRIMARY KEY,
    job_bluesheet_id INTEGER REFERENCES job_bluesheet(id) ON DELETE CASCADE,
    labor_id INTEGER REFERENCES labor(id),
    lead_labor_id INTEGER REFERENCES lead_labor(id),
    employee_name VARCHAR(255) NOT NULL,
    role VARCHAR(100) DEFAULT 'Labor',
    regular_hours VARCHAR(50) DEFAULT '0h',
    overtime_hours VARCHAR(50) DEFAULT '0h',
    total_hours VARCHAR(50) DEFAULT '0h',
    hourly_rate DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create job_bluesheet_material table for material entries
CREATE TABLE job_bluesheet_material (
    id SERIAL PRIMARY KEY,
    job_bluesheet_id INTEGER REFERENCES job_bluesheet(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    material_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'pieces',
    total_ordered INTEGER DEFAULT 0,
    material_used INTEGER DEFAULT 0,
    supplier_order_id VARCHAR(255),
    return_to_warehouse BOOLEAN DEFAULT false,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_job_bluesheet_job_id ON job_bluesheet(job_id);
CREATE INDEX idx_job_bluesheet_date ON job_bluesheet(date);
CREATE INDEX idx_job_bluesheet_labor_bluesheet_id ON job_bluesheet_labor(job_bluesheet_id);
CREATE INDEX idx_job_bluesheet_labor_labor_id ON job_bluesheet_labor(labor_id);
CREATE INDEX idx_job_bluesheet_labor_lead_labor_id ON job_bluesheet_labor(lead_labor_id);
CREATE INDEX idx_job_bluesheet_material_bluesheet_id ON job_bluesheet_material(job_bluesheet_id);
CREATE INDEX idx_job_bluesheet_material_product_id ON job_bluesheet_material(product_id);

-- Add comments for documentation
COMMENT ON TABLE job_bluesheet IS 'Main table for job bluesheet entries';
COMMENT ON TABLE job_bluesheet_labor IS 'Labor entries for job bluesheet';
COMMENT ON TABLE job_bluesheet_material IS 'Material entries for job bluesheet';

COMMENT ON COLUMN job_bluesheet.job_id IS 'Reference to the job this bluesheet belongs to';
COMMENT ON COLUMN job_bluesheet.date IS 'Date of the bluesheet entry';

COMMENT ON COLUMN job_bluesheet_labor.labor_id IS 'Reference to labor table (for regular labor)';
COMMENT ON COLUMN job_bluesheet_labor.lead_labor_id IS 'Reference to lead_labor table (for lead labor)';
COMMENT ON COLUMN job_bluesheet_labor.employee_name IS 'Name of the employee';
COMMENT ON COLUMN job_bluesheet_labor.role IS 'Role of the employee (Labor, Supervisor, etc.)';
COMMENT ON COLUMN job_bluesheet_labor.regular_hours IS 'Regular hours worked (e.g., "8h", "4h")';
COMMENT ON COLUMN job_bluesheet_labor.overtime_hours IS 'Overtime hours worked';
COMMENT ON COLUMN job_bluesheet_labor.total_hours IS 'Total hours (regular + overtime)';
COMMENT ON COLUMN job_bluesheet_labor.description IS 'Description or notes for the labor entry';

COMMENT ON COLUMN job_bluesheet_material.product_id IS 'Reference to products table';
COMMENT ON COLUMN job_bluesheet_material.material_name IS 'Name of the material/product';
COMMENT ON COLUMN job_bluesheet_material.unit IS 'Unit of measurement (pieces, kg, liters, etc.)';
COMMENT ON COLUMN job_bluesheet_material.total_ordered IS 'Total quantity ordered';
COMMENT ON COLUMN job_bluesheet_material.material_used IS 'Quantity actually used';
COMMENT ON COLUMN job_bluesheet_material.supplier_order_id IS 'Order ID from supplier';
COMMENT ON COLUMN job_bluesheet_material.return_to_warehouse IS 'Whether material should be returned to warehouse';
COMMENT ON COLUMN job_bluesheet_material.date IS 'Date of the material entry';

-- If table already exists, add quantity column
ALTER TABLE job_bluesheet_material ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2) DEFAULT 0;
