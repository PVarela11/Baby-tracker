-- Sync functions for baby tracker
-- These functions handle idempotent upserts with version checking based on updated_at
-- All parameters are prefixed with p_ to avoid column name conflicts

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trigger function to set server_updated_at on all tables
CREATE OR REPLACE FUNCTION set_server_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.server_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all four tables (idempotent)
DROP TRIGGER IF EXISTS set_server_updated_at_trigger ON logs;
CREATE TRIGGER set_server_updated_at_trigger
  BEFORE INSERT OR UPDATE ON logs
  FOR EACH ROW EXECUTE FUNCTION set_server_updated_at();

DROP TRIGGER IF EXISTS set_server_updated_at_trigger ON vitamin_logs;
CREATE TRIGGER set_server_updated_at_trigger
  BEFORE INSERT OR UPDATE ON vitamin_logs
  FOR EACH ROW EXECUTE FUNCTION set_server_updated_at();

DROP TRIGGER IF EXISTS set_server_updated_at_trigger ON growth_logs;
CREATE TRIGGER set_server_updated_at_trigger
  BEFORE INSERT OR UPDATE ON growth_logs
  FOR EACH ROW EXECUTE FUNCTION set_server_updated_at();

DROP TRIGGER IF EXISTS set_server_updated_at_trigger ON baby_profile;
CREATE TRIGGER set_server_updated_at_trigger
  BEFORE INSERT OR UPDATE ON baby_profile
  FOR EACH ROW EXECUTE FUNCTION set_server_updated_at();

-- Function to upsert a single log with version checking
CREATE OR REPLACE FUNCTION upsert_log(
  p_id UUID,
  p_event_type TEXT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_breast_side TEXT,
  p_diaper_type TEXT,
  p_notes TEXT,
  p_created_at TIMESTAMPTZ,
  p_updated_at TIMESTAMPTZ,
  p_deleted_at TIMESTAMPTZ,
  p_device_id TEXT,
  p_user_id TEXT
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  breast_side TEXT,
  diaper_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  device_id TEXT,
  user_id TEXT,
  server_updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO logs (
    id, event_type, start_time, end_time, breast_side, diaper_type,
    notes, created_at, updated_at, deleted_at, device_id, user_id
  ) VALUES (
    p_id, p_event_type, p_start_time, p_end_time, p_breast_side, p_diaper_type,
    p_notes, p_created_at, p_updated_at, p_deleted_at, p_device_id, p_user_id
  )
  ON CONFLICT (id) DO UPDATE SET
    event_type = EXCLUDED.event_type,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    breast_side = EXCLUDED.breast_side,
    diaper_type = EXCLUDED.diaper_type,
    notes = EXCLUDED.notes,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at,
    deleted_at = EXCLUDED.deleted_at,
    device_id = EXCLUDED.device_id,
    user_id = EXCLUDED.user_id
  WHERE EXCLUDED.updated_at > logs.updated_at
  RETURNING
    id, event_type, start_time, end_time, breast_side, diaper_type,
    notes, created_at, updated_at, deleted_at, device_id, user_id, server_updated_at;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert a single vitamin_log with version checking
CREATE OR REPLACE FUNCTION upsert_vitamin_log(
  p_id TEXT,
  p_given_date TEXT,
  p_given_time TIMESTAMPTZ,
  p_notes TEXT,
  p_created_at TEXT,
  p_updated_at TIMESTAMPTZ,
  p_deleted_at TIMESTAMPTZ,
  p_device_id TEXT,
  p_user_id TEXT
)
RETURNS TABLE (
  id TEXT,
  given_date TEXT,
  given_time TIMESTAMPTZ,
  notes TEXT,
  created_at TEXT,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  device_id TEXT,
  user_id TEXT,
  server_updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO vitamin_logs (
    id, given_date, given_time, notes, created_at, updated_at,
    deleted_at, device_id, user_id
  ) VALUES (
    p_id, p_given_date, p_given_time, p_notes, p_created_at, p_updated_at,
    p_deleted_at, p_device_id, p_user_id
  )
  ON CONFLICT (id) DO UPDATE SET
    given_date = EXCLUDED.given_date,
    given_time = EXCLUDED.given_time,
    notes = EXCLUDED.notes,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at,
    deleted_at = EXCLUDED.deleted_at,
    device_id = EXCLUDED.device_id,
    user_id = EXCLUDED.user_id
  WHERE EXCLUDED.updated_at > vitamin_logs.updated_at
  RETURNING
    id, given_date, given_time, notes, created_at, updated_at,
    deleted_at, device_id, user_id, server_updated_at;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert a single growth_log with version checking
CREATE OR REPLACE FUNCTION upsert_growth_log(
  p_id TEXT,
  p_log_date TEXT,
  p_weight_kg NUMERIC,
  p_height_cm NUMERIC,
  p_head_circumference_cm NUMERIC,
  p_notes TEXT,
  p_created_at TEXT,
  p_updated_at TIMESTAMPTZ,
  p_deleted_at TIMESTAMPTZ,
  p_device_id TEXT,
  p_user_id TEXT
)
RETURNS TABLE (
  id TEXT,
  log_date TEXT,
  weight_kg NUMERIC,
  height_cm NUMERIC,
  head_circumference_cm NUMERIC,
  notes TEXT,
  created_at TEXT,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  device_id TEXT,
  user_id TEXT,
  server_updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO growth_logs (
    id, log_date, weight_kg, height_cm, head_circumference_cm,
    notes, created_at, updated_at, deleted_at, device_id, user_id
  ) VALUES (
    p_id, p_log_date, p_weight_kg, p_height_cm, p_head_circumference_cm,
    p_notes, p_created_at, p_updated_at, p_deleted_at, p_device_id, p_user_id
  )
  ON CONFLICT (id) DO UPDATE SET
    log_date = EXCLUDED.log_date,
    weight_kg = EXCLUDED.weight_kg,
    height_cm = EXCLUDED.height_cm,
    head_circumference_cm = EXCLUDED.head_circumference_cm,
    notes = EXCLUDED.notes,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at,
    deleted_at = EXCLUDED.deleted_at,
    device_id = EXCLUDED.device_id,
    user_id = EXCLUDED.user_id
  WHERE EXCLUDED.updated_at > growth_logs.updated_at
  RETURNING
    id, log_date, weight_kg, height_cm, head_circumference_cm,
    notes, created_at, updated_at, deleted_at, device_id, user_id, server_updated_at;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert baby_profile (single row with id=1)
CREATE OR REPLACE FUNCTION upsert_baby_profile(
  p_id INTEGER,
  p_name TEXT,
  p_date_of_birth TIMESTAMPTZ,
  p_gender TEXT,
  p_updated_at TIMESTAMPTZ,
  p_deleted_at TIMESTAMPTZ,
  p_device_id TEXT,
  p_user_id TEXT
)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  date_of_birth TIMESTAMPTZ,
  gender TEXT,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  device_id TEXT,
  user_id TEXT,
  server_updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO baby_profile (
    id, name, date_of_birth, gender, updated_at, deleted_at, device_id, user_id
  ) VALUES (
    p_id, p_name, p_date_of_birth, p_gender, p_updated_at, p_deleted_at, p_device_id, p_user_id
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    date_of_birth = EXCLUDED.date_of_birth,
    gender = EXCLUDED.gender,
    updated_at = EXCLUDED.updated_at,
    deleted_at = EXCLUDED.deleted_at,
    device_id = EXCLUDED.device_id,
    user_id = EXCLUDED.user_id
  WHERE EXCLUDED.updated_at > baby_profile.updated_at
  RETURNING
    id, name, date_of_birth, gender, updated_at, deleted_at, device_id, user_id, server_updated_at;
END;
$$ LANGUAGE plpgsql;
