
CREATE TABLE IF NOT EXISTS staff (
  id              SERIAL PRIMARY KEY,
  user_id         INT REFERENCES users(id) ON DELETE CASCADE,
  position        VARCHAR(100),
  department      VARCHAR(100),
  date_of_joining DATE,
  address         TEXT,
  management_type VARCHAR(50),
  system_ip       VARCHAR(45)
);


CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department);
CREATE INDEX IF NOT EXISTS idx_staff_system_ip ON staff(system_ip);


COMMENT ON TABLE staff IS 'Staff members table with department and position tracking';
