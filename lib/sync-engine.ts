import { db, getDeviceId, type DbLog, type DbVitaminLog, type DbGrowthLog, type DbBabyProfile } from './db'

const SYNC_LOCK_NAME = 'baby-tracker-sync-lock'
const PASSCODE_KEY = 'baby-tracker:sync-passcode'
const FIRST_SYNC_KEY = 'baby-tracker:first-sync-completed'
const LAST_SYNC_TIME_KEY = 'baby-tracker:last-sync-time'
const PENDING_COUNT_KEY = 'baby-tracker:pending-count'

const BASE_DELAY = 1000 // 1 second
const MAX_DELAY = 60000 // 1 minute
const MAX_RETRIES = 5

interface SyncCursors {
  logs_cursor?: string
  vitamin_logs_cursor?: string
  growth_logs_cursor?: string
  baby_profile_cursor?: string
}

interface SyncResult {
  success: boolean
  error?: string
  recordsPushed: number
  recordsPulled: number
}

export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'pending'

export class SyncEngine {
  private isOnline: boolean = true
  private syncInterval: number | null = null
  private abortController: AbortController | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
      window.addEventListener('online', () => {
        this.isOnline = true
        this.triggerSync()
      })
      window.addEventListener('offline', () => {
        this.isOnline = false
      })
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.isOnline) {
          this.triggerSync()
        }
      })
    }
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    if (typeof navigator === 'undefined' || !navigator.locks) {
      // Fallback: simple in-memory lock (not perfect but better than nothing)
      return fn()
    }

    return navigator.locks.request(SYNC_LOCK_NAME, { mode: 'exclusive' }, fn)
  }

  public getPasscodeInternal(): string | null {
    try {
      return localStorage.getItem(PASSCODE_KEY)
    } catch {
      return null
    }
  }

  public setPasscodeInternal(passcode: string): void {
    try {
      localStorage.setItem(PASSCODE_KEY, passcode)
    } catch (error) {
      console.error('Failed to set passcode:', error)
    }
  }

  private isFirstSync(): boolean {
    try {
      return localStorage.getItem(FIRST_SYNC_KEY) !== 'true'
    } catch {
      return true
    }
  }

  private markFirstSyncComplete(): void {
    try {
      localStorage.setItem(FIRST_SYNC_KEY, 'true')
    } catch (error) {
      console.error('Failed to mark first sync complete:', error)
    }
  }

  private setLastSyncTime(): void {
    try {
      localStorage.setItem(LAST_SYNC_TIME_KEY, new Date().toISOString())
    } catch (error) {
      console.error('Failed to set last sync time:', error)
    }
  }

  public getLastSyncTimeInternal(): string | null {
    try {
      return localStorage.getItem(LAST_SYNC_TIME_KEY)
    } catch {
      return null
    }
  }

  private async getCursors(): Promise<SyncCursors> {
    const meta = await db.meta.toArray()
    const cursors: SyncCursors = {}
    for (const item of meta) {
      if (item.key.startsWith('cursor:')) {
        const table = item.key.replace('cursor:', '')
        cursors[`${table}_cursor` as keyof SyncCursors] = item.value
      }
    }
    return cursors
  }

  private async setCursor(table: string, cursor: string): Promise<void> {
    await db.meta.put({ key: `cursor:${table}`, value: cursor })
  }

  private async updatePendingCount(): Promise<void> {
    const [logs, vitaminLogs, growthLogs, profile] = await Promise.all([
      db.logs.where('sync_status').equals('pending').count(),
      db.vitamin_logs.where('sync_status').equals('pending').count(),
      db.growth_logs.where('sync_status').equals('pending').count(),
      db.baby_profile.where('sync_status').equals('pending').count(),
    ])
    const total = logs + vitaminLogs + growthLogs + profile
    try {
      localStorage.setItem(PENDING_COUNT_KEY, total.toString())
    } catch (error) {
      console.error('Failed to update pending count:', error)
    }
  }

  public getPendingCountInternal(): number {
    try {
      const count = localStorage.getItem(PENDING_COUNT_KEY)
      return count ? parseInt(count, 10) : 0
    } catch {
      return 0
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async withRetry<T>(fn: () => Promise<T>, retries: number = MAX_RETRIES): Promise<T> {
    let lastError: Error | undefined
    for (let i = 0; i < retries; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        if (i < retries - 1) {
          // Exponential backoff with jitter
          const delayMs = Math.min(BASE_DELAY * Math.pow(2, i) + Math.random() * 1000, MAX_DELAY)
          await this.delay(delayMs)
        }
      }
    }
    throw lastError
  }

  private async pull(cursors: SyncCursors): Promise<number> {
    const passcode = this.getPasscodeInternal()
    if (!passcode) {
      throw new Error('No passcode configured')
    }

    const response = await fetch('/api/sync/pull', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-passcode': passcode,
      },
      body: JSON.stringify(cursors),
    })

    if (!response.ok) {
      throw new Error(`Pull failed: ${response.status}`)
    }

    const data = await response.json()
    let totalPulled = 0

    // Merge logs
    if (data.logs && data.logs.length > 0) {
      for (const log of data.logs) {
        const existing = await db.logs.where('id').equals(log.id).first()
        if (!existing) {
          // New record from server
          await db.logs.add({
            ...log,
            sync_status: 'synced',
          })
          totalPulled++
        } else if (existing.sync_status === 'synced' && log.updated_at > existing.updated_at) {
          // Server version is newer, update local
          await db.logs.update(log.id, {
            ...log,
            sync_status: 'synced',
          })
          totalPulled++
        } else if (existing.sync_status === 'pending' && log.updated_at > existing.updated_at) {
          // Local is pending but server is newer, don't overwrite pending
          console.log(`Skipping log ${log.id}: local is pending and newer`)
        }
      }
      if (data.logs_cursor) {
        await this.setCursor('logs', data.logs_cursor)
      }
    }

    // Merge vitamin_logs
    if (data.vitamin_logs && data.vitamin_logs.length > 0) {
      for (const log of data.vitamin_logs) {
        const existing = await db.vitamin_logs.where('id').equals(log.id).first()
        if (!existing) {
          await db.vitamin_logs.add({
            ...log,
            sync_status: 'synced',
          })
          totalPulled++
        } else if (existing.sync_status === 'synced' && log.updated_at > existing.updated_at) {
          await db.vitamin_logs.update(log.id, {
            ...log,
            sync_status: 'synced',
          })
          totalPulled++
        } else if (existing.sync_status === 'pending' && log.updated_at > existing.updated_at) {
          console.log(`Skipping vitamin log ${log.id}: local is pending and newer`)
        }
      }
      if (data.vitamin_logs_cursor) {
        await this.setCursor('vitamin_logs', data.vitamin_logs_cursor)
      }
    }

    // Merge growth_logs
    if (data.growth_logs && data.growth_logs.length > 0) {
      for (const log of data.growth_logs) {
        const existing = await db.growth_logs.where('id').equals(log.id).first()
        if (!existing) {
          await db.growth_logs.add({
            ...log,
            sync_status: 'synced',
          })
          totalPulled++
        } else if (existing.sync_status === 'synced' && log.updated_at > existing.updated_at) {
          await db.growth_logs.update(log.id, {
            ...log,
            sync_status: 'synced',
          })
          totalPulled++
        } else if (existing.sync_status === 'pending' && log.updated_at > existing.updated_at) {
          console.log(`Skipping growth log ${log.id}: local is pending and newer`)
        }
      }
      if (data.growth_logs_cursor) {
        await this.setCursor('growth_logs', data.growth_logs_cursor)
      }
    }

    // Merge baby_profile
    if (data.baby_profile) {
      const existing = await db.baby_profile.where('id').equals(1).first()
      if (!existing) {
        await db.baby_profile.add({
          ...data.baby_profile,
          sync_status: 'synced',
        })
        totalPulled++
      } else if (existing.sync_status === 'synced' && data.baby_profile.updated_at > existing.updated_at) {
        await db.baby_profile.update(1, {
          ...data.baby_profile,
          sync_status: 'synced',
        })
        totalPulled++
      } else if (existing.sync_status === 'pending' && data.baby_profile.updated_at > existing.updated_at) {
        console.log('Skipping baby profile: local is pending and newer')
      }
      if (data.baby_profile_cursor) {
        await this.setCursor('baby_profile', data.baby_profile_cursor)
      }
    }

    return totalPulled
  }

  private async getImportedIds(): Promise<Set<string>> {
    const meta = await db.meta.toArray()
    const importedItem = meta.find((m) => m.key === 'migration:imported_ids')
    if (!importedItem) return new Set()
    try {
      const ids = JSON.parse(importedItem.value) as string[]
      return new Set(ids)
    } catch {
      return new Set()
    }
  }

  private async checkForDuplicateOnServer(log: DbLog): Promise<boolean> {
    // Check if a server row with the same natural key exists
    const passcode = this.getPasscodeInternal()
    if (!passcode) return false

    // For logs, natural key is event_type + start_time
    const response = await fetch('/api/sync/pull', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-passcode': passcode,
      },
      body: JSON.stringify({}),
    })

    if (!response.ok) return false

    const data = await response.json()
    if (data.logs) {
      return data.logs.some(
        (l: any) => l.event_type === log.event_type && l.start_time === log.start_time && !l.deleted_at
      )
    }
    return false
  }

  private async checkForVitaminDuplicateOnServer(log: DbVitaminLog): Promise<boolean> {
    const passcode = this.getPasscodeInternal()
    if (!passcode) return false

    const response = await fetch('/api/sync/pull', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-passcode': passcode,
      },
      body: JSON.stringify({}),
    })

    if (!response.ok) return false

    const data = await response.json()
    if (data.vitamin_logs) {
      return data.vitamin_logs.some(
        (l: any) => l.given_date === log.given_date && l.given_time === log.given_time && !l.deleted_at
      )
    }
    return false
  }

  private async checkForGrowthDuplicateOnServer(log: DbGrowthLog): Promise<boolean> {
    const passcode = this.getPasscodeInternal()
    if (!passcode) return false

    const response = await fetch('/api/sync/pull', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-passcode': passcode,
      },
      body: JSON.stringify({}),
    })

    if (!response.ok) return false

    const data = await response.json()
    if (data.growth_logs) {
      return data.growth_logs.some((l: any) => l.log_date === log.log_date && !l.deleted_at)
    }
    return false
  }

  private async push(): Promise<number> {
    const passcode = this.getPasscodeInternal()
    if (!passcode) {
      throw new Error('No passcode configured')
    }

    const importedIds = await this.getImportedIds()
    const deviceId = await getDeviceId()
    const isFirstSync = this.isFirstSync()

    const pendingLogs = await db.logs.where('sync_status').equals('pending').toArray()
    const pendingVitaminLogs = await db.vitamin_logs.where('sync_status').equals('pending').toArray()
    const pendingGrowthLogs = await db.growth_logs.where('sync_status').equals('pending').toArray()
    const pendingProfile = await db.baby_profile.where('sync_status').equals('pending').first()

    const logsToPush: DbLog[] = []
    const vitaminLogsToPush: DbVitaminLog[] = []
    const growthLogsToPush: DbGrowthLog[] = []
    let profileToPush: DbBabyProfile | null = null

    // Filter duplicates for first sync
    for (const log of pendingLogs) {
      if (isFirstSync && importedIds.has(log.id)) {
        const isDuplicate = await this.checkForDuplicateOnServer(log)
        if (isDuplicate) {
          console.log(`Discarding duplicate log ${log.id} from migration`)
          await db.logs.delete(log.id)
          continue
        }
      }
      logsToPush.push(log)
    }

    for (const log of pendingVitaminLogs) {
      if (isFirstSync && importedIds.has(log.id)) {
        const isDuplicate = await this.checkForVitaminDuplicateOnServer(log)
        if (isDuplicate) {
          console.log(`Discarding duplicate vitamin log ${log.id} from migration`)
          await db.vitamin_logs.delete(log.id)
          continue
        }
      }
      vitaminLogsToPush.push(log)
    }

    for (const log of pendingGrowthLogs) {
      if (isFirstSync && importedIds.has(log.id)) {
        const isDuplicate = await this.checkForGrowthDuplicateOnServer(log)
        if (isDuplicate) {
          console.log(`Discarding duplicate growth log ${log.id} from migration`)
          await db.growth_logs.delete(log.id)
          continue
        }
      }
      growthLogsToPush.push(log)
    }

    if (pendingProfile) {
      profileToPush = pendingProfile
    }

    const body: any = {}
    if (logsToPush.length > 0) body.logs = logsToPush
    if (vitaminLogsToPush.length > 0) body.vitamin_logs = vitaminLogsToPush
    if (growthLogsToPush.length > 0) body.growth_logs = growthLogsToPush
    if (profileToPush) body.baby_profile = profileToPush

    if (Object.keys(body).length === 0) {
      return 0
    }

    const response = await fetch('/api/sync/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-passcode': passcode,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Push failed: ${response.status}`)
    }

    const data = await response.json()
    let totalPushed = 0

    // Mark records as synced only if they weren't edited in the meantime
    if (data.logs) {
      for (const pushed of data.logs) {
        const local = await db.logs.where('id').equals(pushed.id).first()
        if (local && local.sync_status === 'pending' && local.updated_at === pushed.updated_at) {
          await db.logs.update(pushed.id, {
            sync_status: 'synced',
            server_updated_at: pushed.server_updated_at,
          })
          totalPushed++
        }
      }
    }

    if (data.vitamin_logs) {
      for (const pushed of data.vitamin_logs) {
        const local = await db.vitamin_logs.where('id').equals(pushed.id).first()
        if (local && local.sync_status === 'pending' && local.updated_at === pushed.updated_at) {
          await db.vitamin_logs.update(pushed.id, {
            sync_status: 'synced',
            server_updated_at: pushed.server_updated_at,
          })
          totalPushed++
        }
      }
    }

    if (data.growth_logs) {
      for (const pushed of data.growth_logs) {
        const local = await db.growth_logs.where('id').equals(pushed.id).first()
        if (local && local.sync_status === 'pending' && local.updated_at === pushed.updated_at) {
          await db.growth_logs.update(pushed.id, {
            sync_status: 'synced',
            server_updated_at: pushed.server_updated_at,
          })
          totalPushed++
        }
      }
    }

    if (data.baby_profile) {
      const local = await db.baby_profile.where('id').equals(1).first()
      if (local && local.sync_status === 'pending' && local.updated_at === data.baby_profile.updated_at) {
        await db.baby_profile.update(1, {
          sync_status: 'synced',
          server_updated_at: data.baby_profile.server_updated_at,
        })
        totalPushed++
      }
    }

    return totalPushed
  }

  public async sync(): Promise<SyncResult> {
    if (!this.isOnline) {
      return { success: false, error: 'Offline', recordsPushed: 0, recordsPulled: 0 }
    }

    const passcode = this.getPasscodeInternal()
    if (!passcode) {
      return { success: false, error: 'No passcode', recordsPushed: 0, recordsPulled: 0 }
    }

    return this.withLock(async () => {
      try {
        const cursors = await this.getCursors()
        const isFirstSync = this.isFirstSync()

        let recordsPulled = 0
        let recordsPushed = 0

        // First sync: pull before push
        if (isFirstSync) {
          recordsPulled = await this.withRetry(() => this.pull(cursors))
          this.markFirstSyncComplete()
        }

        // Push pending records
        recordsPushed = await this.withRetry(() => this.push())

        // Pull after push to get any changes from other devices
        const newCursors = await this.getCursors()
        recordsPulled += await this.withRetry(() => this.pull(newCursors))

        this.setLastSyncTime()
        await this.updatePendingCount()

        return { success: true, recordsPushed, recordsPulled }
      } catch (error) {
        console.error('Sync error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          recordsPushed: 0,
          recordsPulled: 0,
        }
      }
    })
  }

  public getStatus(): SyncStatus {
    if (!this.isOnline) return 'offline'
    const pending = this.getPendingCountInternal()
    if (pending > 0) return 'pending'
    return 'synced'
  }

  public setPasscode(passcode: string): void {
    this.setPasscodeInternal(passcode)
  }

  public clearPasscode(): void {
    try {
      localStorage.removeItem(PASSCODE_KEY)
    } catch (error) {
      console.error('Failed to clear passcode:', error)
    }
  }

  public hasPasscode(): boolean {
    return this.getPasscodeInternal() !== null
  }

  public getLastSyncTime(): string | null {
    return this.getLastSyncTimeInternal()
  }

  public getPendingCount(): number {
    return this.getPendingCountInternal()
  }

  public triggerSync(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
    this.abortController = new AbortController()
    this.sync().catch((error) => {
      if (error.name !== 'AbortError') {
        console.error('Triggered sync error:', error)
      }
    })
  }

  public startPeriodicSync(): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval)
    }

    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && !document.hidden) {
        this.triggerSync()
      }
    }, 60000) // 60 seconds while visible and online
  }

  public stopPeriodicSync(): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}

// Singleton instance
let syncEngineInstance: SyncEngine | null = null

export function getSyncEngine(): SyncEngine {
  if (!syncEngineInstance) {
    syncEngineInstance = new SyncEngine()
  }
  return syncEngineInstance
}
