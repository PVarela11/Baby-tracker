'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { GrowthLog, GrowthLogPatch, NewGrowthLog } from '@/lib/types'
import { addToSyncQueue } from '@/lib/sync-queue'
import { supabase } from '@/lib/supabase/client'

const LOCAL_KEY = 'baby-tracker:growth-logs'

function readLocal(): GrowthLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as GrowthLog[]) : []
  } catch {
    return []
  }
}

function writeLocal(logs: GrowthLog[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(logs))
}

function sortLogs(logs: GrowthLog[]) {
  return [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date))
}

function toLocalLog(log: NewGrowthLog): GrowthLog {
  return {
    id: crypto.randomUUID(),
    log_date: log.log_date,
    weight_kg: log.weight_kg,
    height_cm: log.height_cm,
    head_circumference_cm: log.head_circumference_cm,
    notes: log.notes,
    created_at: new Date().toISOString()
  }
}

async function fetchGrowthLogs(): Promise<GrowthLog[]> {
  // Initialize from localStorage first
  const localLogs = sortLogs(readLocal())

  if (!supabase) {
    console.log('Supabase not configured, using local storage')
    return localLogs
  }

  try {
    const { data, error } = await supabase
      .from('growth_logs')
      .select('id,log_date,weight_kg,height_cm,head_circumference_cm,notes,created_at')
      .order('log_date', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('Failed to fetch growth logs from cloud, using local storage:', error)
      return localLogs
    }
    // If cloud returns empty or fails, use local data
    if (!data || data.length === 0) {
      return localLogs
    }
    return data as GrowthLog[]
  } catch (error) {
    console.error('Failed to fetch growth logs from cloud, using local storage:', error)
    return localLogs
  }
}

export function useGrowthLogs() {
  const { data, error, isLoading, mutate } = useSWR<GrowthLog[]>('growth-logs', fetchGrowthLogs, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })

  const logs = data ?? []
  const [syncError, setSyncError] = useState<string | null>(null)

  function applyLocal(update: (logs: GrowthLog[]) => GrowthLog[]) {
    const next = sortLogs(update(readLocal()))
    writeLocal(next)
    return mutate(next, { revalidate: false })
  }

  async function createGrowthLog(log: NewGrowthLog) {
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
            .from('growth_logs')
            .insert({
              id: crypto.randomUUID(),
              log_date: log.log_date,
              weight_kg: log.weight_kg,
              height_cm: log.height_cm,
              head_circumference_cm: log.head_circumference_cm,
              notes: log.notes,
              created_at: new Date().toISOString()
            })
            .select('id,log_date,weight_kg,height_cm,head_circumference_cm,notes,created_at')
            .single()

          if (error) {
            throw error
          }

          const saved = data as GrowthLog
          setSyncError(null)
          // Update localStorage with server response
          const updatedLocal = readLocal().map((l) => (l.id === saved.id ? saved : l))
          writeLocal(updatedLocal)
          return sortLogs([...(current ?? []), saved])
        } catch (error) {
          console.error('Failed to create growth log on cloud, using local storage:', error)
          setSyncError('Saved locally - will sync when online')
          // Add to sync queue with new format, including local ID for tracking
          addToSyncQueue({
            type: 'create_growth',
            endpoint: '/api/growth-logs',
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

  async function updateGrowthLog(id: string, patch: GrowthLogPatch) {
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
            .from('growth_logs')
            .update(patch)
            .eq('id', id)
            .select('id,log_date,weight_kg,height_cm,head_circumference_cm,notes,created_at')
            .single()

          if (error) {
            throw error
          }

          const saved = data as GrowthLog
          setSyncError(null)
          // Update localStorage with server response
          const updatedLocal = readLocal().map((l) => (l.id === saved.id ? saved : l))
          writeLocal(updatedLocal)
          return (current ?? []).map((l) => (l.id === id ? saved : l))
        } catch (error) {
          console.error('Failed to update growth log on cloud, using local storage:', error)
          setSyncError('Saved locally - will sync when online')
          // Add to sync queue with new format
          addToSyncQueue({
            type: 'update_growth',
            endpoint: `/api/growth-logs/${id}`,
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

  async function deleteGrowthLog(id: string) {
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
          const { error } = await supabase
            .from('growth_logs')
            .delete()
            .eq('id', id)

          if (error) {
            throw error
          }

          setSyncError(null)
          return (current ?? []).filter((l) => l.id !== id)
        } catch (error) {
          console.error('Failed to delete growth log on cloud, using local storage:', error)
          setSyncError('Deleted locally - will sync when online')
          // Add to sync queue with new format
          addToSyncQueue({
            type: 'delete_growth',
            endpoint: `/api/growth-logs/${id}`,
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

  return { logs, error, isLoading, createGrowthLog, updateGrowthLog, deleteGrowthLog, syncError, mutate }
}

export type GrowthLogsApi = ReturnType<typeof useGrowthLogs>
