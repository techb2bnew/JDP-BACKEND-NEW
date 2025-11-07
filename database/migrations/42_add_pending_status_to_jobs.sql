-- Allow 'pending' status value for jobs
ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS jobs_status_check;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_status_check CHECK (
    status IN ('draft', 'active', 'in_progress', 'completed', 'cancelled', 'on_hold', 'pending')
  );

