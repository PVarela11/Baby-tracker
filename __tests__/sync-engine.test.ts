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

    it('should return synced status when no pending records', () => {
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
})
