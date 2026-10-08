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

export async function processSyncQueue() {
  const queue = getSyncQueue()
  if (queue.length === 0) return

  console.log(`Processing ${queue.length} offline actions...`)

  for (const action of queue) {
    try {
      await processAction(action)
    } catch (error) {
      console.error('Failed to process sync action:', action, error)
      // Stop processing on first error to avoid partial sync
      break
    }
  }

  // If all actions succeeded, clear the queue
  const remainingQueue = getSyncQueue()
  if (remainingQueue.length === 0) {
    clearSyncQueue()
  }
}

async function processAction(action: SyncAction) {
  switch (action.type) {
    case 'create_log':
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      })
      break
    case 'update_log':
      await fetch(`/api/logs/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      })
      break
    case 'delete_log':
      await fetch(`/api/logs/${action.id}`, { method: 'DELETE' })
      break
    case 'create_vitamin':
      await fetch('/api/vitamin-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      })
      break
    case 'update_vitamin':
      await fetch(`/api/vitamin-logs/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      })
      break
    case 'delete_vitamin':
      await fetch(`/api/vitamin-logs/${action.id}`, { method: 'DELETE' })
      break
    case 'create_growth':
      await fetch('/api/growth-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      })
      break
    case 'update_growth':
      await fetch(`/api/growth-logs/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      })
      break
    case 'delete_growth':
      await fetch(`/api/growth-logs/${action.id}`, { method: 'DELETE' })
      break
    case 'update_profile':
      await fetch('/api/baby-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      })
      break
  }

  // Remove processed action from queue
  const queue = getSyncQueue()
  const newQueue = queue.filter((a) => a !== action)
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(newQueue))
}

export function setupSyncListener() {
  if (typeof window === 'undefined') return

  const handleOnline = () => {
    console.log('Network reconnected, processing sync queue...')
    processSyncQueue()
  }

  window.addEventListener('online', handleOnline)

  return () => {
    window.removeEventListener('online', handleOnline)
  }
}
