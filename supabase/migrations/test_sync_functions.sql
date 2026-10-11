-- Test script for sync functions
-- Single DO block that tests all functions and rolls back automatically
-- Does NOT touch real baby_profile data

DO $$
DECLARE
  test_log_id UUID;
  test_vitamin_id TEXT;
  test_growth_id TEXT;
  initial_updated_at TIMESTAMPTZ;
  older_updated_at TIMESTAMPTZ;
  newer_updated_at TIMESTAMPTZ;
  profile_before RECORD;
  profile_after RECORD;
  results TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Test upsert_log: older timestamp should NOT overwrite
  test_log_id := gen_random_uuid();
  initial_updated_at := NOW();
  older_updated_at := NOW() - INTERVAL '1 day';
  
  PERFORM upsert_log(
    test_log_id,
    'feed',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '50 minutes',
    'left',
    NULL,
    'TEST',
    NOW() - INTERVAL '1 hour',
    initial_updated_at,
    NULL,
    'test-device',
    NULL
  );
  
  PERFORM upsert_log(
    test_log_id,
    'feed',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '50 minutes',
    'right',
    NULL,
    'TEST',
    NOW() - INTERVAL '1 hour',
    older_updated_at,
    NULL,
    'test-device',
    NULL
  );
  
  IF (SELECT updated_at FROM logs WHERE id = test_log_id) = initial_updated_at THEN
    results := array_append(results, '✓ upsert_log: older timestamp did NOT overwrite');
  ELSE
    results := array_append(results, '✗ upsert_log: older timestamp DID overwrite (BUG!)');
  END IF;
  
  IF (SELECT breast_side FROM logs WHERE id = test_log_id) = 'left' THEN
    results := array_append(results, '✓ upsert_log: field not overwritten');
  ELSE
    results := array_append(results, '✗ upsert_log: field was overwritten (BUG!)');
  END IF;
  
  -- Test upsert_log: newer timestamp SHOULD overwrite
  test_log_id := gen_random_uuid();
  initial_updated_at := NOW() - INTERVAL '1 day';
  newer_updated_at := NOW();
  
  PERFORM upsert_log(
    test_log_id,
    'feed',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1.5 hours',
    'left',
    NULL,
    'TEST',
    NOW() - INTERVAL '2 hours',
    initial_updated_at,
    NULL,
    'test-device',
    NULL
  );
  
  PERFORM upsert_log(
    test_log_id,
    'feed',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1.5 hours',
    'right',
    NULL,
    'TEST',
    NOW() - INTERVAL '2 hours',
    newer_updated_at,
    NULL,
    'test-device',
    NULL
  );
  
  IF (SELECT updated_at FROM logs WHERE id = test_log_id) = newer_updated_at THEN
    results := array_append(results, '✓ upsert_log: newer timestamp DID overwrite');
  ELSE
    results := array_append(results, '✗ upsert_log: newer timestamp did NOT overwrite (BUG!)');
  END IF;
  
  IF (SELECT breast_side FROM logs WHERE id = test_log_id) = 'right' THEN
    results := array_append(results, '✓ upsert_log: field was overwritten by newer data');
  ELSE
    results := array_append(results, '✗ upsert_log: field not overwritten by newer data (BUG!)');
  END IF;
  
  -- Test upsert_log: soft delete with newer timestamp SHOULD apply
  test_log_id := gen_random_uuid();
  initial_updated_at := NOW() - INTERVAL '1 day';
  newer_updated_at := NOW();
  
  PERFORM upsert_log(
    test_log_id,
    'feed',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1.5 hours',
    'left',
    NULL,
    'TEST',
    NOW() - INTERVAL '2 hours',
    initial_updated_at,
    NULL,
    'test-device',
    NULL
  );
  
  PERFORM upsert_log(
    test_log_id,
    'feed',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1.5 hours',
    'left',
    NULL,
    'TEST',
    NOW() - INTERVAL '2 hours',
    newer_updated_at,
    NOW(),  -- Soft delete
    'test-device',
    NULL
  );
  
  IF (SELECT deleted_at FROM logs WHERE id = test_log_id) IS NOT NULL THEN
    results := array_append(results, '✓ upsert_log: soft delete applied with newer timestamp');
  ELSE
    results := array_append(results, '✗ upsert_log: soft delete not applied (BUG!)');
  END IF;
  
  -- Test upsert_vitamin_log: older timestamp should NOT overwrite
  test_vitamin_id := gen_random_uuid()::text;
  initial_updated_at := NOW();
  older_updated_at := NOW() - INTERVAL '1 day';
  
  PERFORM upsert_vitamin_log(
    test_vitamin_id,
    '2024-01-15',
    '14:30',
    'TEST',
    (NOW() - INTERVAL '1 hour')::text,
    initial_updated_at,
    NULL,
    'test-device',
    NULL
  );
  
  PERFORM upsert_vitamin_log(
    test_vitamin_id,
    '2024-01-15',
    '14:30',
    'TEST MODIFIED',
    (NOW() - INTERVAL '1 hour')::text,
    older_updated_at,
    NULL,
    'test-device',
    NULL
  );
  
  IF (SELECT updated_at FROM vitamin_logs WHERE id = test_vitamin_id) = initial_updated_at THEN
    results := array_append(results, '✓ upsert_vitamin_log: older timestamp did NOT overwrite');
  ELSE
    results := array_append(results, '✗ upsert_vitamin_log: older timestamp DID overwrite (BUG!)');
  END IF;
  
  IF (SELECT notes FROM vitamin_logs WHERE id = test_vitamin_id) = 'TEST' THEN
    results := array_append(results, '✓ upsert_vitamin_log: field not overwritten');
  ELSE
    results := array_append(results, '✗ upsert_vitamin_log: field was overwritten (BUG!)');
  END IF;
  
  -- Test upsert_vitamin_log: newer timestamp SHOULD overwrite
  test_vitamin_id := gen_random_uuid()::text;
  initial_updated_at := NOW() - INTERVAL '1 day';
  newer_updated_at := NOW();
  
  PERFORM upsert_vitamin_log(
    test_vitamin_id,
    '2024-01-15',
    '14:30',
    'TEST',
    (NOW() - INTERVAL '1 hour')::text,
    initial_updated_at,
    NULL,
    'test-device',
    NULL
  );
  
  PERFORM upsert_vitamin_log(
    test_vitamin_id,
    '2024-01-15',
    '14:30',
    'TEST MODIFIED',
    (NOW() - INTERVAL '1 hour')::text,
    newer_updated_at,
    NULL,
    'test-device',
    NULL
  );
  
  IF (SELECT updated_at FROM vitamin_logs WHERE id = test_vitamin_id) = newer_updated_at THEN
    results := array_append(results, '✓ upsert_vitamin_log: newer timestamp DID overwrite');
  ELSE
    results := array_append(results, '✗ upsert_vitamin_log: newer timestamp did NOT overwrite (BUG!)');
  END IF;
  
  IF (SELECT notes FROM vitamin_logs WHERE id = test_vitamin_id) = 'TEST MODIFIED' THEN
    results := array_append(results, '✓ upsert_vitamin_log: field was overwritten by newer data');
  ELSE
    results := array_append(results, '✗ upsert_vitamin_log: field not overwritten by newer data (BUG!)');
  END IF;
  
  -- Test upsert_vitamin_log: soft delete with newer timestamp SHOULD apply
  test_vitamin_id := gen_random_uuid()::text;
  initial_updated_at := NOW() - INTERVAL '1 day';
  newer_updated_at := NOW();
  
  PERFORM upsert_vitamin_log(
    test_vitamin_id,
    '2024-01-15',
    '14:30',
    'TEST',
    (NOW() - INTERVAL '1 hour')::text,
    initial_updated_at,
    NULL,
    'test-device',
    NULL
  );
  
  PERFORM upsert_vitamin_log(
    test_vitamin_id,
    '2024-01-15',
    '14:30',
    'TEST',
    (NOW() - INTERVAL '1 hour')::text,
    newer_updated_at,
    NOW(),  -- Soft delete
    'test-device',
    NULL
  );
  
  IF (SELECT deleted_at FROM vitamin_logs WHERE id = test_vitamin_id) IS NOT NULL THEN
    results := array_append(results, '✓ upsert_vitamin_log: soft delete applied with newer timestamp');
  ELSE
    results := array_append(results, '✗ upsert_vitamin_log: soft delete not applied (BUG!)');
  END IF;
  
  -- Test upsert_growth_log: older timestamp should NOT overwrite
  test_growth_id := gen_random_uuid()::text;
  initial_updated_at := NOW();
  older_updated_at := NOW() - INTERVAL '1 day';
  
  PERFORM upsert_growth_log(
    test_growth_id,
    '2024-01-15',
    3.5,
    50.0,
    35.0,
    'TEST',
    (NOW() - INTERVAL '1 hour')::text,
    initial_updated_at,
    NULL,
    'test-device',
    NULL
  );
  
  PERFORM upsert_growth_log(
    test_growth_id,
    '2024-01-15',
    4.0,
    51.0,
    36.0,
    'TEST MODIFIED',
    (NOW() - INTERVAL '1 hour')::text,
    older_updated_at,
    NULL,
    'test-device',
    NULL
  );
  
  IF (SELECT updated_at FROM growth_logs WHERE id = test_growth_id) = initial_updated_at THEN
    results := array_append(results, '✓ upsert_growth_log: older timestamp did NOT overwrite');
  ELSE
    results := array_append(results, '✗ upsert_growth_log: older timestamp DID overwrite (BUG!)');
  END IF;
  
  IF (SELECT weight_kg FROM growth_logs WHERE id = test_growth_id) = 3.5 THEN
    results := array_append(results, '✓ upsert_growth_log: field not overwritten');
  ELSE
    results := array_append(results, '✗ upsert_growth_log: field was overwritten (BUG!)');
  END IF;
  
  -- Test upsert_growth_log: newer timestamp SHOULD overwrite
  test_growth_id := gen_random_uuid()::text;
  initial_updated_at := NOW() - INTERVAL '1 day';
  newer_updated_at := NOW();
  
  PERFORM upsert_growth_log(
    test_growth_id,
    '2024-01-15',
    3.5,
    50.0,
    35.0,
    'TEST',
    (NOW() - INTERVAL '1 hour')::text,
    initial_updated_at,
    NULL,
    'test-device',
    NULL
  );
  
  PERFORM upsert_growth_log(
    test_growth_id,
    '2024-01-15',
    4.0,
    51.0,
    36.0,
    'TEST MODIFIED',
    (NOW() - INTERVAL '1 hour')::text,
    newer_updated_at,
    NULL,
    'test-device',
    NULL
  );
  
  IF (SELECT updated_at FROM growth_logs WHERE id = test_growth_id) = newer_updated_at THEN
    results := array_append(results, '✓ upsert_growth_log: newer timestamp DID overwrite');
  ELSE
    results := array_append(results, '✗ upsert_growth_log: newer timestamp did NOT overwrite (BUG!)');
  END IF;
  
  IF (SELECT weight_kg FROM growth_logs WHERE id = test_growth_id) = 4.0 THEN
    results := array_append(results, '✓ upsert_growth_log: field was overwritten by newer data');
  ELSE
    results := array_append(results, '✗ upsert_growth_log: field not overwritten by newer data (BUG!)');
  END IF;
  
  -- Test upsert_growth_log: soft delete with newer timestamp SHOULD apply
  test_growth_id := gen_random_uuid()::text;
  initial_updated_at := NOW() - INTERVAL '1 day';
  newer_updated_at := NOW();
  
  PERFORM upsert_growth_log(
    test_growth_id,
    '2024-01-15',
    3.5,
    50.0,
    35.0,
    'TEST',
    (NOW() - INTERVAL '1 hour')::text,
    initial_updated_at,
    NULL,
    'test-device',
    NULL
  );
  
  PERFORM upsert_growth_log(
    test_growth_id,
    '2024-01-15',
    3.5,
    50.0,
    35.0,
    'TEST',
    (NOW() - INTERVAL '1 hour')::text,
    newer_updated_at,
    NOW(),  -- Soft delete
    'test-device',
    NULL
  );
  
  IF (SELECT deleted_at FROM growth_logs WHERE id = test_growth_id) IS NOT NULL THEN
    results := array_append(results, '✓ upsert_growth_log: soft delete applied with newer timestamp');
  ELSE
    results := array_append(results, '✗ upsert_growth_log: soft delete not applied (BUG!)');
  END IF;
  
  -- Test upsert_baby_profile: older timestamp should NOT overwrite existing row
  -- Only test if row exists, and don't modify it
  SELECT * INTO profile_before FROM baby_profile WHERE id = 1;
  
  IF FOUND THEN
    initial_updated_at := profile_before.updated_at;
    older_updated_at := NOW() - INTERVAL '10 years';
    
    -- Try to update with older timestamp (should NOT change anything)
    -- Use existing date_of_birth value (TEXT column)
    PERFORM upsert_baby_profile(
      1,
      'SHOULD NOT CHANGE',
      profile_before.date_of_birth,
      'female',
      older_updated_at,
      NULL,
      'test-device',
      NULL
    );
    
    SELECT * INTO profile_after FROM baby_profile WHERE id = 1;
    
    IF profile_after.updated_at = profile_before.updated_at THEN
      results := array_append(results, '✓ upsert_baby_profile: older timestamp did NOT overwrite existing row');
    ELSE
      results := array_append(results, '✗ upsert_baby_profile: older timestamp DID overwrite existing row (BUG!)');
    END IF;
    
    IF profile_after.name = profile_before.name THEN
      results := array_append(results, '✓ upsert_baby_profile: existing row unchanged');
    ELSE
      results := array_append(results, '✗ upsert_baby_profile: existing row was modified (BUG!)');
    END IF;
    
    -- Test upsert_baby_profile: soft delete with newer timestamp SHOULD apply
    initial_updated_at := profile_before.updated_at;
    newer_updated_at := NOW();
    
    PERFORM upsert_baby_profile(
      1,
      profile_before.name,
      profile_before.date_of_birth,
      profile_before.gender,
      newer_updated_at,
      NOW(),  -- Soft delete
      'test-device',
      NULL
    );
    
    SELECT * INTO profile_after FROM baby_profile WHERE id = 1;
    
    IF profile_after.deleted_at IS NOT NULL THEN
      results := array_append(results, '✓ upsert_baby_profile: soft delete applied with newer timestamp');
      -- Restore the row (don't leave it deleted)
      PERFORM upsert_baby_profile(
        1,
        profile_before.name,
        profile_before.date_of_birth,
        profile_before.gender,
        NOW(),
        NULL,
        profile_before.device_id,
        profile_before.user_id
      );
    ELSE
      results := array_append(results, '✗ upsert_baby_profile: soft delete not applied (BUG!)');
    END IF;
  ELSE
    results := array_append(results, '⊘ upsert_baby_profile: skipped (no existing row to test)');
  END IF;
  
  -- Raise exception with all results (rolls back automatically)
  RAISE EXCEPTION E'--- TEST RESULTS ---\n%', array_to_string(results, E'\n');
END $$;
