-- Sync functions for baby tracker
-- These functions handle idempotent upserts with version checking based on updated_at
-- All parameters are prefixed with p_ to avoid column name conflicts
-- Functions return void; clients should pull to get server state

-- Drop all overloads of the sync functions (idempotent)
DO $$
DECLARE
  func RECORD;
BEGIN
  FOR func IN
    SELECT p.oid::regprocedure::text AS func_name
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('upsert_log', 'upsert_vitamin_log', 'upsert_growth_log', 'upsert_baby_profile')
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func.func_name;
  END LOOP;
END $$;

-- Drop duplicate triggers created by this file (do not recreate set_server_updated_at function)
DROP TRIGGER IF EXISTS set_server_updated_at_trigger ON logs;
DROP TRIGGER IF EXISTS set_server_updated_at_trigger ON vitamin_logs;
DROP TRIGGER IF EXISTS set_server_updated_at_trigger ON growth_logs;
DROP TRIGGER IF EXISTS set_server_updated_at_trigger ON baby_profile;

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
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
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
  WHERE EXCLUDED.updated_at > COALESCE(logs.updated_at, '-infinity'::timestamptz);
END;
$$;

REVOKE EXECUTE ON FUNCTION upsert_log FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_log TO service_role;

-- Function to upsert a single vitamin_log with version checking
CREATE OR REPLACE FUNCTION upsert_vitamin_log(
  p_id TEXT,
  p_given_date TEXT,
  p_given_time TEXT,
  p_notes TEXT,
  p_created_at TEXT,
  p_updated_at TIMESTAMPTZ,
  p_deleted_at TIMESTAMPTZ,
  p_device_id TEXT,
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
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
  WHERE EXCLUDED.updated_at > COALESCE(vitamin_logs.updated_at, '-infinity'::timestamptz);
END;
$$;

REVOKE EXECUTE ON FUNCTION upsert_vitamin_log FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_vitamin_log TO service_role;

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
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
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
  WHERE EXCLUDED.updated_at > COALESCE(growth_logs.updated_at, '-infinity'::timestamptz);
END;
$$;

REVOKE EXECUTE ON FUNCTION upsert_growth_log FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_growth_log TO service_role;

-- Function to upsert baby_profile (single row with id=1)
CREATE OR REPLACE FUNCTION upsert_baby_profile(
  p_id INTEGER,
  p_name TEXT,
  p_date_of_birth TEXT,
  p_gender TEXT,
  p_updated_at TIMESTAMPTZ,
  p_deleted_at TIMESTAMPTZ,
  p_device_id TEXT,
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
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
  WHERE EXCLUDED.updated_at > COALESCE(baby_profile.updated_at, '-infinity'::timestamptz);
END;
$$;

REVOKE EXECUTE ON FUNCTION upsert_baby_profile FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_baby_profile TO service_role;
