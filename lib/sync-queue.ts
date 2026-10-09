// Sync queue stub - sync engine to be implemented later
// All sync state is now tracked in IndexedDB via sync_status field

let isSyncing = false

export function setIsSyncing(value: boolean) {
  isSyncing = value
}

export function getIsSyncing(): boolean {
  return isSyncing
}

// Stub functions for compatibility - will be replaced by sync engine
export function isLogPendingSync(_logId: string): boolean {
  return false // TODO: read from db.sync_status when sync engine is built
}

export function isVitaminLogPendingSync(_logId: string): boolean {
  return false // TODO: read from db.sync_status when sync engine is built
}

export function isGrowthLogPendingSync(_logId: string): boolean {
  return false // TODO: read from db.sync_status when sync engine is built
}

export function setupSyncListener(_onRefreshData?: () => void) {
  // TODO: implement sync listener when sync engine is built
  return () => {}
}

