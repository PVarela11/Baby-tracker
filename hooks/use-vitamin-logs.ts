'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { VitaminLog, VitaminLogPatch, NewVitaminLog } from '@/lib/types'
import { addToSyncQueue } from '@/lib/sync-queue'
import { supabase } from '@/lib/supabase/client'

const LOCAL_KEY = 'baby-tracker:vitamin-logs'

function readLocal(): VitaminLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as VitaminLog[]) : []
  } catch {
    return []
  }
}

function writeLocal(logs: VitaminLog[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(logs))
}

function sortLogs(logs: VitaminLog[]) {
  return [...logs].sort((a, b) => b.given_date.localeCompare(a.given_date))
}

function toLocalLog(log: NewVitaminLog): VitaminLog {
  return {
    id: crypto.randomUUID(),
    given_date: log.given_date,
    given_time: log.given_time,
    notes: log.notes ?? "",
    created_at: new Date().toISOString()
  }
}

async function fetchVitaminLogs(): Promise<VitaminLog[]> {
  // Initialize from localStorage first
  const localLogs = sortLogs(readLocal())

  if (!supabase) {
    console.log('Supabase not configured, using local storage')
    return localLogs
  }

  try {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('vitamin_logs')
      .select('id,given_date,given_time,notes,created_at')
      .gte('given_date', since.split('T')[0])
      .order('given_date', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('Failed to fetch vitamin logs from cloud, using local storage:', error)
      return localLogs
    }
    // If cloud returns empty or fails, use local data
    if (!data || data.length === 0) {
      return localLogs
    }
    return data as VitaminLog[]
  } catch (error) {
    console.error('Failed to fetch vitamin logs from cloud, using local storage:', error)
    return localLogs
  }
}

export function useVitaminLogs() {
  const { data, error, isLoading, mutate } = useSWR<VitaminLog[]>('vitamin-logs', fetchVitaminLogs, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })

  const logs = data ?? []
  const [syncError, setSyncError] = useState<string | null>(null)

  function applyLocal(update: (logs: VitaminLog[]) => VitaminLog[]) {
    const next = sortLogs(update(readLocal()))
    writeLocal(next)
    return mutate(next, { revalidate: false })
  }

  async function createVitaminLog(log: NewVitaminLog) {
    // Save to localStorage immediately (local-first)
    const local = readLocal()
    const newLog = toLocalLog(log)
    writeLocal([...local, newLog])

    const optimistic = toLocalLog(log)
    await mutate(
      async (current) => {
        if (!supabase) {
          console.log('Supabase not configured, saving locally only')
          setSyncError('Saved locally - cloud not configured')
          return sortLogs([...local, newLog])
        }

        try {
          const { data, error } = await supabase
            .from('vitamin_logs')
            .insert({
              id: crypto.randomUUID(),
              given_date: log.given_date,
              given_time: log.given_time,
              notes: log.notes ?? "",
              created_at: new Date().toISOString()
            })
            .select('id,given_date,given_time,notes,created_at')
            .single()

          if (error) {
            throw error
          }

          const saved = data as VitaminLog
          setSyncError(null)
          // Update localStorage with server response
          const updatedLocal = readLocal().map((l) => (l.id === saved.id ? saved : l))
          writeLocal(updatedLocal)
          return sortLogs([...(current ?? []), saved])
        } catch (error) {
          console.error('Failed to create vitamin log on cloud, using local storage:', error)
          setSyncError('Saved locally - will sync when online')
          // Add to sync queue with new format, including local ID for tracking
          addToSyncQueue({
            type: 'create_vitamin',
            endpoint: '/api/vitamin-logs',
            payload: { ...log, localId: newLog.id },
            action: 'POST',
          })
          // Data already saved locally above
          return sortLogs([...local, newLog])
        }
      },
      {
        optimisticData: (current) => sortLogs([...(current ?? []), optimistic]),
        rollbackOnError: true,
        revalidate: false,
      },
    )
  }

  async function updateVitaminLog(id: string, patch: VitaminLogPatch) {
    // Update localStorage immediately (local-first)
    const local = readLocal()
    const updated = local.map((l) => (l.id === id ? { ...l, ...patch } : l))
    writeLocal(updated)

    await mutate(
      async (current) => {
        if (!supabase) {
          console.log('Supabase not configured, saving locally only')
          setSyncError('Saved locally - cloud not configured')
          return updated
        }

        try {
          const { data, error } = await supabase
            .from('vitamin_logs')
            .update(patch)
            .eq('id', id)
            .select('id,given_date,given_time,notes,created_at')
            .single()

          if (error) {
            throw error
          }

          const saved = data as VitaminLog
          setSyncError(null)
          // Update localStorage with server response
          const updatedLocal = readLocal().map((l) => (l.id === saved.id ? saved : l))
          writeLocal(updatedLocal)
          return (current ?? []).map((l) => (l.id === id ? saved : l))
        } catch (error) {
          console.error('Failed to update vitamin log on cloud, using local storage:', error)
          setSyncError('Saved locally - will sync when online')
          // Add to sync queue with new format
          addToSyncQueue({
            type: 'update_vitamin',
            endpoint: `/api/vitamin-logs/${id}`,
            payload: patch,
            action: 'PUT',
          })
          // Data already saved locally above
          return updated
        }
      },
      {
        optimisticData: (current) => (current ?? []).map((l) => (l.id === id ? { ...l, ...patch } : l)),
        rollbackOnError: true,
        revalidate: false,
      },
    )
  }

  async function deleteVitaminLog(id: string, givenDate?: string) {
    // Delete from localStorage immediately (local-first)
    const local = readLocal()
    const filtered = local.filter((l) => l.id !== id)
    writeLocal(filtered)

    await mutate(
      async (current) => {
        if (!supabase) {
          console.log('Supabase not configured, deleting locally only')
          setSyncError('Deleted locally - cloud not configured')
          return filtered
        }

        try {
          // Delete by ID and optionally by date to ensure clean state
          const { error } = await supabase
            .from('vitamin_logs')
            .delete()
            .eq('id', id)

          if (error) {
            throw error
          }

          // Also delete by date if provided to ensure clean state
          if (givenDate) {
            await supabase
              .from('vitamin_logs')
              .delete()
              .eq('given_date', givenDate)
          }

          setSyncError(null)
          return (current ?? []).filter((l) => l.id !== id)
        } catch (error) {
          console.error('Failed to delete vitamin log on cloud, using local storage:', error)
          setSyncError('Deleted locally - will sync when online')
          // Add to sync queue with new format
          addToSyncQueue({
            type: 'delete_vitamin',
            endpoint: `/api/vitamin-logs/${id}`,
            payload: null,
            action: 'DELETE',
          })
          // Data already deleted locally above
          return filtered
        }
      },
      {
        optimisticData: (current) => (current ?? []).filter((l) => l.id !== id),
        rollbackOnError: true,
        revalidate: false,
      },
    )
  }

  return { logs, error, isLoading, createVitaminLog, updateVitaminLog, deleteVitaminLog, syncError, mutate }
}

export type VitaminLogsApi = {
  logs: VitaminLog[]
  error: any
  isLoading: boolean
  createVitaminLog: (log: NewVitaminLog) => Promise<void>
  updateVitaminLog: (id: string, patch: VitaminLogPatch) => Promise<void>
  deleteVitaminLog: (id: string, givenDate?: string) => Promise<void>
  syncError: string | null
  mutate: () => void
}
