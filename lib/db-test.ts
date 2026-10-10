import { db } from './db'

// Dev-only test to verify deleted_at filtering works correctly
export async function testDeletedAtFiltering() {
  if (process.env.NODE_ENV !== 'development') {
    console.log('Skipping db-test: not in development mode')
    return
  }

  console.log('Running deleted_at filtering test...')

  try {
    // Create test records
    const activeId = crypto.randomUUID()
    const deletedId = crypto.randomUUID()

    await db.logs.bulkAdd([
      {
        id: activeId,
        event_type: 'feed',
        start_time: new Date().toISOString(),
        end_time: null,
        breast_side: null,
        diaper_type: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        device_id: 'test-device',
        user_id: null,
        server_updated_at: null,
        sync_status: 'pending',
      },
      {
        id: deletedId,
        event_type: 'sleep',
        start_time: new Date().toISOString(),
        end_time: null,
        breast_side: null,
        diaper_type: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: new Date().toISOString(),
        device_id: 'test-device',
        user_id: null,
        server_updated_at: null,
        sync_status: 'pending',
      },
    ])

    // Test the filter (same pattern used in hooks)
    const allLogs = await db.logs.toArray()
    const activeLogs = allLogs.filter((log) => !log.deleted_at)

    const hasActive = activeLogs.some((log) => log.id === activeId)
    const hasDeleted = activeLogs.some((log) => log.id === deletedId)

    // Cleanup
    await db.logs.bulkDelete([activeId, deletedId])

    if (hasActive && !hasDeleted) {
      console.log('✓ deleted_at filtering test passed')
    } else {
      console.error('✗ deleted_at filtering test failed', { hasActive, hasDeleted })
      throw new Error('deleted_at filtering test failed')
    }
  } catch (error) {
    console.error('db-test error:', error)
    throw error
  }
}
