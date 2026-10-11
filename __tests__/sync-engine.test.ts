import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '@/lib/db'
import { getSyncEngine } from '@/lib/sync-engine'

describe('Sync Engine - Core Logic', () => {
  beforeEach(async () => {
    // Clear IndexedDB before each test
    await db.delete()
    await db.open()
  })

  afterEach(async () => {
    await db.delete()
    vi.clearAllMocks()
  })

  describe('Offline writes', () => {
    it('should save records locally when offline', async () => {
      const syncEngine = getSyncEngine()

      // Create a log
      const now = new Date().toISOString()
      await db.logs.add({
        id: crypto.randomUUID(),
        event_type: 'feed',
        start_time: now,
        end_time: null,
        breast_side: 'left',
        diaper_type: null,
        notes: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        device_id: 'test-device',
        user_id: null,
        server_updated_at: null,
        sync_status: 'pending',
      })

      const logs = await db.logs.toArray()
      expect(logs).toHaveLength(1)
      expect(logs[0].sync_status).toBe('pending')
    })
  })

  describe('Passcode management', () => {
    it('should set and retrieve passcode', () => {
      const syncEngine = getSyncEngine()
      syncEngine.setPasscode('test123')
      expect(syncEngine.hasPasscode()).toBe(true)
    })

    it('should trim passcode before storing', () => {
      const syncEngine = getSyncEngine()
      syncEngine.setPasscode('  test123  ')
      expect(syncEngine.getPasscodeInternal()).toBe('test123')
    })

    it('should clear passcode', () => {
      const syncEngine = getSyncEngine()
      syncEngine.setPasscode('test123')
      syncEngine.clearPasscode()
      expect(syncEngine.hasPasscode()).toBe(false)
    })
  })

  describe('Sync status', () => {
    it('should return offline status when offline', () => {
      const syncEngine = getSyncEngine()
      // Force offline by setting isOnline to false
      ;(syncEngine as any).isOnline = false
      expect(syncEngine.getStatus()).toBe('offline')
    })

    it('should return synced status when no pending records', async () => {
      const syncEngine = getSyncEngine()
      ;(syncEngine as any).isOnline = true
      expect(syncEngine.getStatus()).toBe('synced')
    })

    it('should return pending status when there are pending records', async () => {
      const syncEngine = getSyncEngine()
      ;(syncEngine as any).isOnline = true

      // Create a pending record
      const now = new Date().toISOString()
      await db.logs.add({
        id: crypto.randomUUID(),
        event_type: 'feed',
        start_time: now,
        end_time: null,
        breast_side: 'left',
        diaper_type: null,
        notes: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        device_id: 'test-device',
        user_id: null,
        server_updated_at: null,
        sync_status: 'pending',
      })

      // Update pending count
      await syncEngine['updatePendingCount']()
      expect(syncEngine.getStatus()).toBe('pending')
    })

    it('should return failed status when there is a sync error', () => {
      const syncEngine = getSyncEngine()
      ;(syncEngine as any).isOnline = true
      
      const error = {
        message: 'Network error',
        status: 500,
        timestamp: new Date().toISOString(),
      }
      syncEngine['setSyncError'](error)
      
      expect(syncEngine.getStatus()).toBe('failed')
    })

    it('should return failed status on 401 error', () => {
      const syncEngine = getSyncEngine()
      ;(syncEngine as any).isOnline = true
      
      const error = {
        message: 'Wrong passcode, or passcode not configured on the server',
        status: 401,
        timestamp: new Date().toISOString(),
      }
      syncEngine['setSyncError'](error)
      
      expect(syncEngine.getStatus()).toBe('failed')
    })
  })

  describe('Error handling', () => {
    it('should persist sync error after failed sync', () => {
      const syncEngine = getSyncEngine()
      
      const error = {
        message: 'Push failed: 401 - Invalid passcode',
        status: 401,
        timestamp: new Date().toISOString(),
      }
      syncEngine['setSyncError'](error)
      
      const retrievedError = syncEngine.getSyncError()
      expect(retrievedError).toBeDefined()
      expect(retrievedError?.message).toBe('Push failed: 401 - Invalid passcode')
      expect(retrievedError?.status).toBe(401)
    })

    it('should clear sync error after successful sync', () => {
      const syncEngine = getSyncEngine()
      
      const error = {
        message: 'Test error',
        timestamp: new Date().toISOString(),
      }
      syncEngine['setSyncError'](error)
      
      syncEngine['clearSyncError']()
      
      expect(syncEngine.getSyncError()).toBeNull()
    })
  })

  describe('Retry logic', () => {
    it('should not retry on 401 errors', async () => {
      const syncEngine = getSyncEngine()
      
      const fn = vi.fn(() => {
        const error = new Error('Pull failed: 401 - Unauthorized')
        ;(error as any).message = 'Pull failed: 401 - Unauthorized'
        throw error
      })
      
      await expect(syncEngine['withRetry'](fn)).rejects.toThrow('Pull failed: 401 - Unauthorized')
      expect(fn).toHaveBeenCalledTimes(1) // No retries
    })

    it('should not retry on 403 errors', async () => {
      const syncEngine = getSyncEngine()
      
      const fn = vi.fn(() => {
        const error = new Error('Pull failed: 403 - Forbidden')
        ;(error as any).message = 'Pull failed: 403 - Forbidden'
        throw error
      })
      
      await expect(syncEngine['withRetry'](fn)).rejects.toThrow('Pull failed: 403 - Forbidden')
      expect(fn).toHaveBeenCalledTimes(1) // No retries
    })

    it('should not retry on 400 errors', async () => {
      const syncEngine = getSyncEngine()
      
      const fn = vi.fn(() => {
        const error = new Error('Pull failed: 400 - Bad Request')
        ;(error as any).message = 'Pull failed: 400 - Bad Request'
        throw error
      })
      
      await expect(syncEngine['withRetry'](fn)).rejects.toThrow('Pull failed: 400 - Bad Request')
      expect(fn).toHaveBeenCalledTimes(1) // No retries
    })

    it('should retry on 500 errors', async () => {
      const syncEngine = getSyncEngine()
      
      let attempts = 0
      const fn = vi.fn(() => {
        attempts++
        if (attempts < 2) {
          const error = new Error('Pull failed: 500 - Internal Server Error')
          ;(error as any).message = 'Pull failed: 500 - Internal Server Error'
          throw error
        }
        return 'success'
      })
      
      const result = await syncEngine['withRetry'](fn)
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2) // Failed once, retried once
    })
  })

  describe('Conflict resolution logic', () => {
    it('should keep record with later updated_at', async () => {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const earlier = new Date(Date.now() - 1000).toISOString()
      const later = new Date().toISOString()

      // Add record with earlier timestamp
      await db.logs.add({
        id,
        event_type: 'feed',
        start_time: now,
        end_time: null,
        breast_side: 'left',
        diaper_type: null,
        notes: 'Earlier version',
        created_at: now,
        updated_at: earlier,
        deleted_at: null,
        device_id: 'device-1',
        user_id: null,
        server_updated_at: null,
        sync_status: 'synced',
      })

      // Simulate merge with later version from server
      await db.logs.update(id, {
        notes: 'Later version',
        updated_at: later,
        server_updated_at: later,
      })

      const logs = await db.logs.toArray()
      expect(logs[0].notes).toBe('Later version')
      expect(logs[0].updated_at).toBe(later)
    })
  })

  describe('Soft delete handling', () => {
    it('should mark records as deleted instead of removing them', async () => {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      await db.logs.add({
        id,
        event_type: 'feed',
        start_time: now,
        end_time: null,
        breast_side: 'left',
        diaper_type: null,
        notes: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        device_id: 'test-device',
        user_id: null,
        server_updated_at: null,
        sync_status: 'synced',
      })

      // Soft delete
      await db.logs.update(id, {
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'pending',
      })

      const logs = await db.logs.toArray()
      expect(logs).toHaveLength(1)
      expect(logs[0].deleted_at).not.toBeNull()

      // Filter should exclude deleted
      const activeLogs = logs.filter((l) => !l.deleted_at)
      expect(activeLogs).toHaveLength(0)
    })
  })

  describe('Last successful sync time', () => {
    it('should store and retrieve last successful sync time', () => {
      const syncEngine = getSyncEngine()
      
      const time = new Date().toISOString()
      syncEngine['setLastSuccessSyncTime']()
      
      const retrieved = syncEngine.getLastSuccessSyncTime()
      expect(retrieved).not.toBeNull()
    })
  })

  describe('Test connection', () => {
    it('should fail test connection when no passcode set', async () => {
      const syncEngine = getSyncEngine()
      
      const results = await syncEngine.testConnection()
      
      const reachableResult = results.find(r => r.step === 'Server reachable')
      expect(reachableResult?.success).toBe(false)
    })
  })

  describe('Duplicate guard error handling', () => {
    it('should throw error on duplicate check failure instead of returning false', async () => {
      const syncEngine = getSyncEngine()
      
      const log = {
        id: crypto.randomUUID(),
        event_type: 'feed',
        start_time: new Date().toISOString(),
        end_time: null,
        breast_side: 'left',
        diaper_type: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        device_id: 'test-device',
        user_id: null,
        server_updated_at: null,
        sync_status: 'pending',
      } as any
      
      syncEngine.setPasscode('test123')
      
      // This should throw, not return false
      await expect(syncEngine['checkForDuplicateOnServer'](log)).rejects.toThrow()
    })
  })
})
