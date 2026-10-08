import { supabase } from '@/lib/supabase/client'

export type SyncAction = {
  id: string
  type: 'create_log' | 'update_log' | 'delete_log' | 'create_vitamin' | 'update_vitamin' | 'delete_vitamin' | 'create_growth' | 'update_growth' | 'delete_growth' | 'update_profile'
  endpoint: string
  payload: any
  action: 'POST' | 'PUT' | 'DELETE'
  timestamp: number
}

const SYNC_QUEUE_KEY = 'baby-tracker:sync-queue'
const SYNC_STATUS_KEY = 'baby-tracker:sync-status'
const SYNCING_KEY = 'baby-tracker:is-syncing'

export function getSyncQueue(): SyncAction[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY)
    return raw ? (JSON.parse(raw) as SyncAction[]) : []
  } catch {
    return []
  }
}

export function addToSyncQueue(action: Omit<SyncAction, 'id' | 'timestamp'>) {
  const queue = getSyncQueue()
  const fullAction: SyncAction = {
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  }
  queue.push(fullAction)
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
  console.log('Added to sync queue:', fullAction)
}

export function clearSyncQueue() {
  localStorage.removeItem(SYNC_QUEUE_KEY)
}

export function isSyncing(): boolean {
  try {
    return localStorage.getItem(SYNCING_KEY) === 'true'
  } catch {
    return false
  }
}

export function setSyncing(value: boolean) {
  localStorage.setItem(SYNCING_KEY, value ? 'true' : 'false')
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
  if (isSyncing()) {
    console.log('Sync already in progress, skipping')
    return
  }

  const queue = getSyncQueue()
  if (queue.length === 0) {
    console.log('No offline actions to sync')
    onComplete?.()
    return
  }

  console.log(`Processing ${queue.length} offline actions...`)
  setSyncing(true)

  let failedCount = 0
  const initialQueueLength = queue.length

  // Process actions sequentially
  for (const action of queue) {
    try {
      await processAction(action)
      console.log('Successfully synced action:', action.type)
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

  setSyncing(false)

  // Call completion callback after sync attempt
  onComplete?.()
}

async function processAction(action: SyncAction) {
  const { type, endpoint, payload, action: method } = action

  // For vitamin and growth logs, use direct Supabase client
  if (type.includes('vitamin') || type.includes('growth')) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    switch (type) {
      case 'create_vitamin': {
        const { error } = await supabase
          .from('vitamin_logs')
          .insert({
            id: crypto.randomUUID(),
            given_date: payload.given_date,
            given_time: payload.given_time,
            notes: payload.notes ?? "",
            created_at: new Date().toISOString()
          })
        if (error) throw error
        break
      }
      case 'update_vitamin': {
        const id = endpoint.split('/').pop()
        const { error } = await supabase
          .from('vitamin_logs')
          .update(payload)
          .eq('id', id)
        if (error) throw error
        break
      }
      case 'delete_vitamin': {
        const id = endpoint.split('/').pop()
        const { error } = await supabase
          .from('vitamin_logs')
          .delete()
          .eq('id', id)
        if (error) throw error
        break
      }
      case 'create_growth': {
        const { error } = await supabase
          .from('growth_logs')
          .insert({
            id: crypto.randomUUID(),
            log_date: payload.log_date,
            weight_kg: payload.weight_kg,
            height_cm: payload.height_cm,
            head_circumference_cm: payload.head_circumference_cm,
            notes: payload.notes,
            created_at: new Date().toISOString()
          })
        if (error) throw error
        break
      }
      case 'update_growth': {
        const id = endpoint.split('/').pop()
        const { error } = await supabase
          .from('growth_logs')
          .update(payload)
          .eq('id', id)
        if (error) throw error
        break
      }
      case 'delete_growth': {
        const id = endpoint.split('/').pop()
        const { error } = await supabase
          .from('growth_logs')
          .delete()
          .eq('id', id)
        if (error) throw error
        break
      }
      default:
        throw new Error(`Unknown action type: ${type}`)
    }
  } else {
    // For logs and profile, use API endpoints
    let response: Response

    switch (method) {
      case 'POST':
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        break
      case 'PUT':
      case 'PATCH':
        response = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        break
      case 'DELETE':
        response = await fetch(endpoint, { method: 'DELETE' })
        break
      default:
        throw new Error(`Unknown method: ${method}`)
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Request failed: ${response.status} - ${errorText}`)
    }
  }

  // Remove processed action from queue only after successful request
  const queue = getSyncQueue()
  const newQueue = queue.filter((a) => a.id !== action.id)
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(newQueue))
}

export function setupSyncListener(onRefreshData?: () => void) {
  if (typeof window === 'undefined') return

  const handleOnline = () => {
    console.log('Network reconnected, processing sync queue...')
    // Process sync queue first (state is frozen during sync)
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
