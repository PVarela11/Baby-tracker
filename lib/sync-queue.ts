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

export function isLogPendingSync(logId: string): boolean {
  const queue = getSyncQueue()
  return queue.some((action) => {
    // For logs, check if the log ID is in the payload or endpoint
    if (action.type.includes('log')) {
      // For create/update/delete logs, the log ID might be in the endpoint
      const endpointId = action.endpoint.split('/').pop()
      if (endpointId === logId) return true
      // For create logs, the ID might be in the payload (localId or id)
      if (action.payload && (action.payload.localId === logId || action.payload.id === logId)) return true
    }
    return false
  })
}

export function isVitaminLogPendingSync(logId: string): boolean {
  const queue = getSyncQueue()
  return queue.some((action) => {
    if (action.type.includes('vitamin')) {
      const endpointId = action.endpoint.split('/').pop()
      if (endpointId === logId) return true
      // Check for localId in payload
      if (action.payload && (action.payload.localId === logId || action.payload.id === logId)) return true
    }
    return false
  })
}

export function isGrowthLogPendingSync(logId: string): boolean {
  const queue = getSyncQueue()
  return queue.some((action) => {
    if (action.type.includes('growth')) {
      const endpointId = action.endpoint.split('/').pop()
      if (endpointId === logId) return true
      // Check for localId in payload
      if (action.payload && (action.payload.localId === logId || action.payload.id === logId)) return true
    }
    return false
  })
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

  try {
    // Process all actions in parallel using Promise.all
    const syncPromises = queue.map(action => processAction(action))
    await Promise.all(syncPromises)

    // Only clear queue if all actions succeeded
    clearSyncQueue()
    setSyncStatus({ success: true, message: `Successfully synced ${queue.length} items to Supabase` })
    console.log('All offline actions synced successfully')
  } catch (error) {
    console.error('Failed to sync offline actions:', error)
    setSyncStatus({
      success: false,
      message: `Failed to sync offline logs. ${queue.length} items saved locally.`,
    })
  } finally {
    setSyncing(false)
    // Call completion callback after sync attempt
    onComplete?.()
  }
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
        const serverId = crypto.randomUUID()
        const { localId, ...apiPayload } = payload
        const { error } = await supabase
          .from('vitamin_logs')
          .insert({
            id: serverId,
            given_date: apiPayload.given_date,
            given_time: apiPayload.given_time,
            notes: apiPayload.notes ?? "",
            created_at: new Date().toISOString()
          })
        if (error) throw error
        // Update localStorage with server ID for the local entry
        if (localId) {
          const localLogs = JSON.parse(localStorage.getItem('baby-tracker:vitamin-logs') || '[]')
          const updatedLogs = localLogs.map((l: any) =>
            l.id === localId ? { ...l, id: serverId } : l
          )
          localStorage.setItem('baby-tracker:vitamin-logs', JSON.stringify(updatedLogs))
        }
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
        const serverId = crypto.randomUUID()
        const { localId, ...apiPayload } = payload
        const { error } = await supabase
          .from('growth_logs')
          .insert({
            id: serverId,
            log_date: apiPayload.log_date,
            weight_kg: apiPayload.weight_kg,
            height_cm: apiPayload.height_cm,
            head_circumference_cm: apiPayload.head_circumference_cm,
            notes: apiPayload.notes,
            created_at: new Date().toISOString()
          })
        if (error) throw error
        // Update localStorage with server ID for the local entry
        if (localId) {
          const localLogs = JSON.parse(localStorage.getItem('baby-tracker:growth-logs') || '[]')
          const updatedLogs = localLogs.map((l: any) =>
            l.id === localId ? { ...l, id: serverId } : l
          )
          localStorage.setItem('baby-tracker:growth-logs', JSON.stringify(updatedLogs))
        }
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
        // Remove localId from payload before sending to API
        const { localId, ...apiPayload } = payload
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload),
        })
        if (response.ok) {
          const saved = await response.json()
          // Update localStorage with server ID for the local entry
          if (localId) {
            const localLogs = JSON.parse(localStorage.getItem('baby-tracker:logs') || '[]')
            const updatedLogs = localLogs.map((l: any) =>
              l.id === localId ? { ...l, id: saved.id } : l
            )
            localStorage.setItem('baby-tracker:logs', JSON.stringify(updatedLogs))
          }
        }
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
