import { db, getDeviceId, type DbLog, type DbVitaminLog, type DbGrowthLog, type DbBabyProfile } from './db'
import type { Log, VitaminLog, GrowthLog, BabyProfile } from './types'

const MIGRATION_COMPLETED_KEY = 'baby-tracker:migration-completed'
const SYNC_QUEUE_KEY = 'baby-tracker:sync-queue'

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

function generateUUID(): string {
  return crypto.randomUUID()
}

function getLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function setLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Failed to set ${key}:`, error)
  }
}

function removeLocal(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Failed to remove ${key}:`, error)
  }
}

async function migrateLogs(): Promise<string[]> {
  const logs = getLocal<Log[]>('baby-tracker:logs')
  if (!logs || logs.length === 0) return []

  const now = new Date().toISOString()
  const deviceId = await getDeviceId()
  const imported: string[] = []

  for (const log of logs) {
    // Check if already exists by ID (for UUIDs)
    if (isValidUUID(log.id)) {
      const existing = await db.logs.where('id').equals(log.id).first()
      if (existing) {
        imported.push(log.id)
        continue
      }
    } else {
      // For non-UUID IDs, check for duplicates by event_type + start_time + created_at
      const existing = await db.logs
        .filter((l) => l.event_type === log.event_type && l.start_time === log.start_time && l.created_at === log.created_at)
        .first()
      if (existing) {
        console.log(`Skipping duplicate log: ${log.event_type} at ${log.start_time}`)
        continue
      }
    }

    let id = log.id
    if (!isValidUUID(id)) {
      id = generateUUID()
    }

    const dbLog: DbLog = {
      id,
      event_type: log.event_type,
      start_time: log.start_time,
      end_time: log.end_time,
      breast_side: log.breast_side,
      diaper_type: log.diaper_type,
      notes: log.notes,
      created_at: new Date(log.created_at).toISOString(),
      updated_at: now,
      deleted_at: null,
      device_id: deviceId,
      user_id: null,
      server_updated_at: null,
      sync_status: 'pending',
    }

    await db.logs.add(dbLog)
    imported.push(id)
  }

  console.log(`Migrated ${imported.length} logs`)
  return imported
}

async function migrateVitaminLogs(): Promise<string[]> {
  const logs = getLocal<VitaminLog[]>('baby-tracker:vitamin-logs')
  if (!logs || logs.length === 0) return []

  const now = new Date().toISOString()
  const deviceId = await getDeviceId()
  const imported: string[] = []

  for (const log of logs) {
    // Check if already exists by ID (for UUIDs)
    if (isValidUUID(log.id)) {
      const existing = await db.vitamin_logs.where('id').equals(log.id).first()
      if (existing) {
        imported.push(log.id)
        continue
      }
    } else {
      // For non-UUID IDs, check for duplicates by given_date + given_time + created_at
      const existing = await db.vitamin_logs
        .filter((l) => l.given_date === log.given_date && l.given_time === log.given_time && l.created_at === log.created_at)
        .first()
      if (existing) {
        console.log(`Skipping duplicate vitamin log: ${log.given_date} at ${log.given_time}`)
        continue
      }
    }

    let id = log.id
    if (!isValidUUID(id)) {
      id = generateUUID()
    }

    const dbLog: DbVitaminLog = {
      id,
      given_date: log.given_date,
      given_time: log.given_time,
      notes: log.notes,
      created_at: new Date(log.created_at).toISOString(),
      updated_at: now,
      deleted_at: null,
      device_id: deviceId,
      user_id: null,
      server_updated_at: null,
      sync_status: 'pending',
    }

    await db.vitamin_logs.add(dbLog)
    imported.push(id)
  }

  console.log(`Migrated ${imported.length} vitamin logs`)
  return imported
}

async function migrateGrowthLogs(): Promise<string[]> {
  const logs = getLocal<GrowthLog[]>('baby-tracker:growth-logs')
  if (!logs || logs.length === 0) return []

  const now = new Date().toISOString()
  const deviceId = await getDeviceId()
  const imported: string[] = []

  for (const log of logs) {
    // Check if already exists by ID (for UUIDs)
    if (isValidUUID(log.id)) {
      const existing = await db.growth_logs.where('id').equals(log.id).first()
      if (existing) {
        imported.push(log.id)
        continue
      }
    } else {
      // For non-UUID IDs, check for duplicates by log_date + created_at
      const existing = await db.growth_logs
        .filter((l) => l.log_date === log.log_date && l.created_at === log.created_at)
        .first()
      if (existing) {
        console.log(`Skipping duplicate growth log: ${log.log_date}`)
        continue
      }
    }

    let id = log.id
    if (!isValidUUID(id)) {
      id = generateUUID()
    }

    const dbLog: DbGrowthLog = {
      id,
      log_date: log.log_date,
      weight_kg: log.weight_kg,
      height_cm: log.height_cm,
      head_circumference_cm: log.head_circumference_cm,
      notes: log.notes,
      created_at: new Date(log.created_at).toISOString(),
      updated_at: now,
      deleted_at: null,
      device_id: deviceId,
      user_id: null,
      server_updated_at: null,
      sync_status: 'pending',
    }

    await db.growth_logs.add(dbLog)
    imported.push(id)
  }

  console.log(`Migrated ${imported.length} growth logs`)
  return imported
}

async function migrateBabyProfile(): Promise<void> {
  const profile = getLocal<BabyProfile>('baby-tracker:baby-profile')
  if (!profile) return

  const now = new Date().toISOString()
  const deviceId = await getDeviceId()

  const existing = await db.baby_profile.where('id').equals(1).first()
  if (existing) {
    await db.baby_profile.update(1, {
      name: profile.name,
      date_of_birth: profile.date_of_birth,
      gender: profile.gender,
      updated_at: now,
      sync_status: 'pending',
    })
    console.log('Updated baby profile')
  } else {
    const dbProfile: DbBabyProfile = {
      id: 1,
      name: profile.name,
      date_of_birth: profile.date_of_birth,
      gender: profile.gender,
      updated_at: now,
      deleted_at: null,
      device_id: deviceId,
      user_id: null,
      server_updated_at: null,
      sync_status: 'pending',
    }
    await db.baby_profile.add(dbProfile)
    console.log('Migrated baby profile')
  }
}

async function migrateSyncQueue(): Promise<void> {
  const queue = getLocal<any[]>(SYNC_QUEUE_KEY)
  if (!queue || queue.length === 0) return

  console.log(`Found ${queue.length} pending sync operations in queue`)
  // The sync queue operations are already represented as sync_status='pending' in the migrated data
  // No additional action needed - the queue info is captured in the migrated records
}

export async function runMigration(): Promise<void> {
  const alreadyMigrated = getLocal<boolean>(MIGRATION_COMPLETED_KEY)
  if (alreadyMigrated) {
    console.log('Migration already completed, skipping')
    return
  }

  console.log('Starting migration from localStorage to localStorage to IndexedDB...')

  try {
    const logsIds = await migrateLogs()
    const vitaminIds = await migrateVitaminLogs()
    const growthIds = await migrateGrowthLogs()
    await migrateBabyProfile()
    await migrateSyncQueue()

    // Verify migration by checking that all imported IDs exist in Dexie
    const logsVerified = await db.logs.bulkGet(logsIds)
    const vitaminVerified = await db.vitamin_logs.bulkGet(vitaminIds)
    const growthVerified = await db.growth_logs.bulkGet(growthIds)

    const logsSuccess = logsVerified.every((r) => r !== undefined)
    const vitaminSuccess = vitaminVerified.every((r) => r !== undefined)
    const growthSuccess = growthVerified.every((r) => r !== undefined)

    if (!logsSuccess || !vitaminSuccess || !growthSuccess) {
      throw new Error('Migration verification failed: some records not found in IndexedDB')
    }

    console.log(`Migration verification: ${logsIds.length} logs, ${vitaminIds.length} vitamin logs, ${growthIds.length} growth logs`)

    // Backup old keys before clearing (in case rollback is needed)
    const backup = {
      logs: getLocal<any[]>('baby-tracker:logs'),
      vitaminLogs: getLocal<any[]>('baby-tracker:vitamin-logs'),
      growthLogs: getLocal<any[]>('baby-tracker:growth-logs'),
      babyProfile: getLocal<any>('baby-tracker:baby-profile'),
      syncQueue: getLocal<any[]>(SYNC_QUEUE_KEY),
    }
    setLocal('baby-tracker:migration-backup', backup)
    console.log('Migration backup saved to localStorage')

    setLocal(MIGRATION_COMPLETED_KEY, true)
    console.log('Migration completed successfully')

    // Clear old localStorage keys after successful migration
    removeLocal('baby-tracker:logs')
    removeLocal('baby-tracker:vitamin-logs')
    removeLocal('baby-tracker:growth-logs')
    removeLocal('baby-tracker:baby-profile')
    removeLocal(SYNC_QUEUE_KEY)
    removeLocal('baby-tracker:sync-status')
    removeLocal('baby-tracker:is-syncing')

    console.log('Cleared old localStorage keys')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}
