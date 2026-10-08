'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { VitaminLog, VitaminLogPatch, NewVitaminLog } from '@/lib/types'
import { addToSyncQueue } from '@/lib/sync-queue'

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
  return { ...log, id: crypto.randomUUID(), created_at: new Date().toISOString() }
}

async function fetchVitaminLogs(): Promise<VitaminLog[]> {
  // Initialize from localStorage first
  const localLogs = sortLogs(readLocal())

  try {
    const res = await fetch('/api/vitamin-logs', { cache: 'no-store' })
    if (!res.ok) {
      console.error('Failed to fetch vitamin logs from cloud, using local storage')
      return localLogs
    }
    const cloudLogs = (await res.json()) as VitaminLog[]
    // If cloud returns empty or fails, use local data
    if (!cloudLogs || cloudLogs.length === 0) {
      return localLogs
    }
    return cloudLogs
  } catch (error) {
    console.error('Failed to fetch vitamin logs from cloud, using local storage:', error)
    return localLogs
  }
}

async function request(url: string, init: RequestInit) {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Request failed: ${res.status} - ${errorText}`)
    }
    return res
  } catch (error) {
    console.error('Request failed:', error)
    throw error
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
    const optimistic = toLocalLog(log)
    await mutate(
      async (current) => {
        try {
          const res = await request('/api/vitamin-logs', { method: 'POST', body: JSON.stringify(log) })
          const saved = (await res.json()) as VitaminLog
          setSyncError(null)
          return sortLogs([...(current ?? []), saved])
        } catch (error) {
          console.error('Failed to create vitamin log on cloud, falling back to local:', error)
          setSyncError('Saved locally - will sync when online')
          // Add to sync queue
          addToSyncQueue({ type: 'create_vitamin', data: log })
          // Save locally
          const local = readLocal()
          const newLog = toLocalLog(log)
          writeLocal([...local, newLog])
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
    await mutate(
      async (current) => {
        try {
          const res = await request(`/api/vitamin-logs/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
          const saved = (await res.json()) as VitaminLog
          setSyncError(null)
          return (current ?? []).map((l) => (l.id === id ? saved : l))
        } catch (error) {
          console.error('Failed to update vitamin log on cloud, falling back to local:', error)
          setSyncError('Saved locally - will sync when online')
          // Add to sync queue
          addToSyncQueue({ type: 'update_vitamin', id, data: patch })
          // Update locally
          const local = readLocal()
          const updated = local.map((l) => (l.id === id ? { ...l, ...patch } : l))
          writeLocal(updated)
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

  async function deleteVitaminLog(id: string) {
    await mutate(
      async (current) => {
        try {
          await request(`/api/vitamin-logs/${id}`, { method: 'DELETE' })
          setSyncError(null)
          return (current ?? []).filter((l) => l.id !== id)
        } catch (error) {
          console.error('Failed to delete vitamin log on cloud, falling back to local:', error)
          setSyncError('Saved locally - will sync when online')
          // Add to sync queue
          addToSyncQueue({ type: 'delete_vitamin', id })
          // Delete locally
          const local = readLocal()
          const filtered = local.filter((l) => l.id !== id)
          writeLocal(filtered)
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

export type VitaminLogsApi = ReturnType<typeof useVitaminLogs>
