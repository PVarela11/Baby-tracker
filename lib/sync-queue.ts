export type SyncAction =
  | { type: 'create_log'; data: any }
  | { type: 'update_log'; id: string; data: any }
  | { type: 'delete_log'; id: string }
  | { type: 'create_vitamin'; data: any }
  | { type: 'update_vitamin'; id: string; data: any }
  | { type: 'delete_vitamin'; id: string }
  | { type: 'create_growth'; data: any }
  | { type: 'update_growth'; id: string; data: any }
  | { type: 'delete_growth'; id: string }
  | { type: 'update_profile'; data: any }

const SYNC_QUEUE_KEY = 'baby-tracker:sync-queue'
const SYNC_STATUS_KEY = 'baby-tracker:sync-status'

export function getSyncQueue(): SyncAction[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY)
    return raw ? (JSON.parse(raw) as SyncAction[]) : []
  } catch {
    return []
  }
}

export function addToSyncQueue(action: SyncAction) {
  const queue = getSyncQueue()
  queue.push(action)
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
}

export function clearSyncQueue() {
  localStorage.removeItem(SYNC_QUEUE_KEY)
}

export function getSyncStatus(): { success: boolean; message: string } | null {
  try {
    const raw = localStorage.getItem(SYNC_STATUS_KEY)
    return raw ? (JSON.parse(raw) as { success: boolean; message: string }) : null
  } catch {
    return null
  }
}

export function setSyncStatus(status: { success: boolean; message: string }) {
  localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status))
}

export function clearSyncStatus() {
  localStorage.removeItem(SYNC_STATUS_KEY)
}

export async function processSyncQueue(onComplete?: () => void) {
  const queue = getSyncQueue()
  if (queue.length === 0) {
    console.log('No offline actions to sync')
    onComplete?.()
    return
  }

  console.log(`Processing ${queue.length} offline actions...`)

  let failedCount = 0
  const initialQueueLength = queue.length

  for (const action of queue) {
    try {
      await processAction(action)
    } catch (error) {
      console.error('Failed to process sync action:', action, error)
      failedCount++
      // Stop processing on first error to avoid partial sync
      break
    }
  }

  const remainingQueue = getSyncQueue()
  const successCount = initialQueueLength - remainingQueue.length - failedCount

  if (remainingQueue.length === 0) {
    clearSyncQueue()
    setSyncStatus({ success: true, message: `Successfully synced ${successCount} offline actions` })
    console.log('All offline actions synced successfully')
  } else {
    setSyncStatus({
      success: false,
      message: `Failed to sync some offline logs. ${remainingQueue.length} items saved locally.`,
    })
    console.error(`Failed to sync ${remainingQueue.length} offline actions`)
  }

  // Call completion callback after sync attempt
  onComplete?.()
}

async function processAction(action: SyncAction) {
  let response: Response

  switch (action.type) {
    case 'create_log':
      response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      })
      break
    case 'update_log':
      response = await fetch(`/api/logs/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      })
      break
    case 'delete_log':
      response = await fetch(`/api/logs/${action.id}`, { method: 'DELETE' })
      break
    case 'create_vitamin':
      response = await fetch('/api/vitamin-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      })
      break
    case 'update_vitamin':
      response = await fetch(`/api/vitamin-logs/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      })
      break
    case 'delete_vitamin':
      response = await fetch(`/api/vitamin-logs/${action.id}`, { method: 'DELETE' })
      break
    case 'create_growth':
      response = await fetch('/api/growth-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      })
      break
    case 'update_growth':
      response = await fetch(`/api/growth-logs/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      })
      break
    case 'delete_growth':
      response = await fetch(`/api/growth-logs/${action.id}`, { method: 'DELETE' })
      break
    case 'update_profile':
      response = await fetch('/api/baby-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      })
      break
    default:
      throw new Error('Unknown action type')
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Request failed: ${response.status} - ${errorText}`)
  }

  // Remove processed action from queue only after successful request
  const queue = getSyncQueue()
  const newQueue = queue.filter((a) => a !== action)
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(newQueue))
}

export function setupSyncListener(onRefreshData?: () => void) {
  if (typeof window === 'undefined') return

  const handleOnline = () => {
    console.log('Network reconnected, processing sync queue...')
    // Process sync queue first
    processSyncQueue(() => {
      // Only after sync completes, refresh data from server
      console.log('Sync complete, refreshing data from server...')
      onRefreshData?.()
    })
  }

  window.addEventListener('online', handleOnline)

  return () => {
    window.removeEventListener('online', handleOnline)
  }
}
