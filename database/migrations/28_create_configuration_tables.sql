-- Migration: Create configuration table for all settings
-- Created: 2025-01-20

-- Create configuration table for all settings (hourly rates + markup percentage)
CREATE TABLE IF NOT EXISTS configuration (
    id SERIAL PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}',
    markup_percentage DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    last_updated_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_configuration_is_active ON configuration(is_active);
CREATE INDEX IF NOT EXISTS idx_configuration_last_updated_by ON configuration(last_updated_by);
CREATE INDEX IF NOT EXISTS idx_configuration_settings ON configuration USING GIN(settings);

-- Insert default configuration
INSERT INTO configuration (settings, markup_percentage, last_updated_by) VALUES
('{
  "hourly_rates": [
    {
      "id": 1,
      "description": "Up to 3 hours",
      "max_hours": 3,
      "rate": 50.00
    },
    {
      "id": 2,
      "description": "More than 3 hours up to 6 hours",
      "max_hours": 6,
      "rate": 60.00
    }
  ]
}', 0, 1)
ON CONFLICT DO NOTHING;

