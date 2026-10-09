import Dexie, { Table } from 'dexie'

export type SyncStatus = 'pending' | 'synced'

export interface DbLog {
  id: string
  event_type: 'feed' | 'sleep' | 'diaper'
  start_time: string
  end_time: string | null
  breast_side: 'left' | 'right' | null
  diaper_type: 'wet' | 'dirty' | 'both' | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  device_id: string
  user_id: string | null
  server_updated_at: string | null
  sync_status: SyncStatus
}

export interface DbVitaminLog {
  id: string
  given_date: string
  given_time: string
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  device_id: string
  user_id: string | null
  server_updated_at: string | null
  sync_status: SyncStatus
}

export interface DbGrowthLog {
  id: string
  log_date: string
  weight_kg: number | null
  height_cm: number | null
  head_circumference_cm: number | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  device_id: string
  user_id: string | null
  server_updated_at: string | null
  sync_status: SyncStatus
}

export interface DbBabyProfile {
  id: number
  name: string | null
  date_of_birth: string | null
  gender: 'male' | 'female' | 'other' | null
  updated_at: string
  deleted_at: string | null
  device_id: string
  user_id: string | null
  server_updated_at: string | null
  sync_status: SyncStatus
}

const DEVICE_ID_KEY = 'baby-tracker:device-id'

function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing) return existing
    const newId = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, newId)
    return newId
  } catch {
    return crypto.randomUUID()
  }
}

class BabyTrackerDatabase extends Dexie {
  logs!: Table<DbLog>
  vitamin_logs!: Table<DbVitaminLog>
  growth_logs!: Table<DbGrowthLog>
  baby_profile!: Table<DbBabyProfile>

  constructor() {
    super('BabyTrackerDB')
    this.version(1).stores({
      logs: 'id, event_type, start_time, created_at, updated_at, deleted_at, device_id, sync_status, server_updated_at',
      vitamin_logs: 'id, given_date, created_at, updated_at, deleted_at, device_id, sync_status, server_updated_at',
      growth_logs: 'id, log_date, created_at, updated_at, deleted_at, device_id, sync_status, server_updated_at',
      baby_profile: 'id, updated_at, deleted_at, device_id, sync_status, server_updated_at',
    })
  }
}

export const db = new BabyTrackerDatabase()
export const deviceId = getOrCreateDeviceId()
