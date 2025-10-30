-- Migration: Update configuration for bluesheet labor rates
-- This updates the hourly_rates configuration for proper bluesheet labor calculation

-- Update existing configuration to use correct rates for bluesheet labor
UPDATE configuration 
SET settings = jsonb_set(
  settings, 
  '{hourly_rates}', 
  '[
    {
      "id": 1,
      "description": "Up to 3 hours",
      "max_hours": 3,
      "rate": 50.00
    },
    {
      "id": 2,
      "description": "More than 3 hours up to 5 hours",
      "max_hours": 5,
      "rate": 60.00
    }
  ]'::jsonb
)
WHERE is_active = true;

-- Add comment for documentation
COMMENT ON COLUMN configuration.settings IS 'JSONB settings including hourly_rates for bluesheet labor calculation';
