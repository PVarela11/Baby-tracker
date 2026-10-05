'use client'

import useSWR from 'swr'
import type { VitaminLog, VitaminLogPatch, NewVitaminLog } from '@/lib/types'

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
  const res = await fetch('/api/vitamin-logs', { cache: 'no-store' })
  if (!res.ok) {
    console.error('Failed to fetch vitamin logs from cloud, using local storage')
    return sortLogs(readLocal())
  }
  return (await res.json()) as VitaminLog[]
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

export function useVitaminLogs() {
  const { data, error, isLoading, mutate } = useSWR<VitaminLog[]>('vitamin-logs', fetchVitaminLogs, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })

  const logs = data ?? []

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
          return sortLogs([...(current ?? []), saved])
        } catch (error) {
          console.error('Failed to create vitamin log on cloud, falling back to local:', error)
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

  async function updateVitaminLog(id: string, patch: VitaminLogPatch) {
    await mutate(
      async (current) => {
        try {
          const res = await request(`/api/vitamin-logs/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
          const saved = (await res.json()) as VitaminLog
          return (current ?? []).map((l) => (l.id === id ? saved : l))
        } catch (error) {
          console.error('Failed to update vitamin log on cloud, falling back to local:', error)
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

  async function deleteVitaminLog(id: string) {
    await mutate(
      async (current) => {
        try {
          await request(`/api/vitamin-logs/${id}`, { method: 'DELETE' })
          return (current ?? []).filter((l) => l.id !== id)
        } catch (error) {
          console.error('Failed to delete vitamin log on cloud, falling back to local:', error)
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

  return { logs, error, isLoading, createVitaminLog, updateVitaminLog, deleteVitaminLog }
}

export type VitaminLogsApi = ReturnType<typeof useVitaminLogs>
