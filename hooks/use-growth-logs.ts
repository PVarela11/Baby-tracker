'use client'

import useSWR from 'swr'
import type { GrowthLog, GrowthLogPatch, NewGrowthLog } from '@/lib/types'

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
  return { ...log, id: crypto.randomUUID(), created_at: new Date().toISOString() }
}

async function fetchGrowthLogs(): Promise<GrowthLog[]> {
  const res = await fetch('/api/growth-logs', { cache: 'no-store' })
  if (!res.ok) {
    console.error('Failed to fetch growth logs from cloud, using local storage')
    return sortLogs(readLocal())
  }
  return (await res.json()) as GrowthLog[]
}

async function request(url: string, init: RequestInit) {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })
    if (!res.ok) throw new Error('Request failed')
    return res
  } catch (error) {
    console.error('Request failed:', error)
    throw error
  }
}

export function useGrowthLogs() {
  const { data, error, isLoading, mutate } = useSWR<GrowthLog[]>('growth-logs', fetchGrowthLogs, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })

  const logs = data ?? []

  function applyLocal(update: (logs: GrowthLog[]) => GrowthLog[]) {
    const next = sortLogs(update(readLocal()))
    writeLocal(next)
    return mutate(next, { revalidate: false })
  }

  async function createGrowthLog(log: NewGrowthLog) {
    const optimistic = toLocalLog(log)
    await mutate(
      async (current) => {
        try {
          const res = await request('/api/growth-logs', { method: 'POST', body: JSON.stringify(log) })
          const saved = (await res.json()) as GrowthLog
          return sortLogs([...(current ?? []), saved])
        } catch (error) {
          console.error('Failed to create growth log on cloud, falling back to local:', error)
          return sortLogs([...readLocal(), toLocalLog(log)])
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
    await mutate(
      async (current) => {
        try {
          const res = await request(`/api/growth-logs/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
          const saved = (await res.json()) as GrowthLog
          return (current ?? []).map((l) => (l.id === id ? saved : l))
        } catch (error) {
          console.error('Failed to update growth log on cloud, falling back to local:', error)
          return readLocal().map((l) => (l.id === id ? { ...l, ...patch } : l))
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
    await mutate(
      async (current) => {
        try {
          await request(`/api/growth-logs/${id}`, { method: 'DELETE' })
          return (current ?? []).filter((l) => l.id !== id)
        } catch (error) {
          console.error('Failed to delete growth log on cloud, falling back to local:', error)
          return readLocal().filter((l) => l.id !== id)
        }
      },
      {
        optimisticData: (current) => (current ?? []).filter((l) => l.id !== id),
        rollbackOnError: true,
        revalidate: false,
      },
    )
  }

  return { logs, error, isLoading, createGrowthLog, updateGrowthLog, deleteGrowthLog }
}

export type GrowthLogsApi = ReturnType<typeof useGrowthLogs>
