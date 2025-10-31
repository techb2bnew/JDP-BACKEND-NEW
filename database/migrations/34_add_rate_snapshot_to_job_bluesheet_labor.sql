-- Migration: Add rate_snapshot column to job_bluesheet_labor
-- Ensures each labor entry retains the configuration snapshot used for calculations

ALTER TABLE job_bluesheet_labor
ADD COLUMN IF NOT EXISTS rate_snapshot JSONB;

COMMENT ON COLUMN job_bluesheet_labor.rate_snapshot IS 'Snapshot of the hourly rate configuration applied to this labor entry';


