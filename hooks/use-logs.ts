'use client'

import useSWR from 'swr'
import { generateSampleLogs } from '@/lib/sample-data'
import type { Log, LogPatch, NewLog } from '@/lib/types'

export type Backend = 'cloud' | 'local'

interface LogsState {
  backend: Backend
  logs: Log[]
}

const LOCAL_KEY = 'baby-tracker:logs'

function readLocal(): Log[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as Log[]) : []
  } catch {
    return []
  }
}

function writeLocal(logs: Log[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(logs))
}

function sortLogs(logs: Log[]) {
  return [...logs].sort((a, b) => Date.parse(b.start_time) - Date.parse(a.start_time))
}

function toLocalLog(log: NewLog): Log {
  return { ...log, id: crypto.randomUUID(), created_at: new Date().toISOString() }
}

async function fetchLogs(): Promise<LogsState> {
  // Initialize from localStorage first
  const localLogs = sortLogs(readLocal())

  try {
    const res = await fetch('/api/logs', { cache: 'no-store' })
    if (res.status === 503) return { backend: 'local', logs: localLogs }
    if (!res.ok) {
      console.error('Failed to fetch logs from cloud, using local storage')
      return { backend: 'local', logs: localLogs }
    }
    const cloudLogs = (await res.json()) as Log[]
    // If cloud returns empty or fails, use local data
    if (!cloudLogs || cloudLogs.length === 0) {
      return { backend: 'local', logs: localLogs }
    }
    return { backend: 'cloud', logs: cloudLogs }
  } catch (error) {
    console.error('Failed to fetch logs from cloud, falling back to local storage:', error)
    return { backend: 'local', logs: localLogs }
  }
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

export function useLogs() {
  const { data, error, isLoading, mutate } = useSWR<LogsState>('logs', fetchLogs, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })

  const backend: Backend = data?.backend ?? 'cloud'
  const logs = data?.logs ?? []

  function applyLocal(update: (logs: Log[]) => Log[]) {
    const next = sortLogs(update(readLocal()))
    writeLocal(next)
    return mutate({ backend: 'local', logs: next }, { revalidate: false })
  }

  async function createLog(log: NewLog) {
    if (backend === 'local') return applyLocal((all) => [...all, toLocalLog(log)])
    const optimistic = toLocalLog(log)
    await mutate(
      async (current) => {
        try {
          const res = await request('/api/logs', { method: 'POST', body: JSON.stringify(log) })
          const saved = (await res.json()) as Log
          return { backend: 'cloud', logs: sortLogs([...(current?.logs ?? []), saved]) }
        } catch (error) {
          console.error('Failed to create log on cloud, falling back to local:', error)
          return { backend: 'local', logs: sortLogs([...readLocal(), toLocalLog(log)]) }
        }
      },
      {
        optimisticData: (current) => ({
          backend: 'cloud',
          logs: sortLogs([...(current?.logs ?? []), optimistic]),
        }),
        rollbackOnError: true,
        revalidate: false,
      },
    )
  }

  async function updateLog(id: string, patch: LogPatch) {
    if (backend === 'local') {
      return applyLocal((all) => all.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    }
    await mutate(
      async (current) => {
        try {
          const res = await request(`/api/logs/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
          const saved = (await res.json()) as Log
          return { backend: 'cloud', logs: (current?.logs ?? []).map((l) => (l.id === id ? saved : l)) }
        } catch (error) {
          console.error('Failed to update log on cloud, falling back to local:', error)
          return { backend: 'local', logs: readLocal().map((l) => (l.id === id ? { ...l, ...patch } : l)) }
        }
      },
      {
        optimisticData: (current) => ({
          backend: 'cloud',
          logs: (current?.logs ?? []).map((l) => (l.id === id ? { ...l, ...patch } : l)),
        }),
        rollbackOnError: true,
        revalidate: false,
      },
    )
  }

  async function deleteLog(id: string) {
    if (backend === 'local') return applyLocal((all) => all.filter((l) => l.id !== id))
    await mutate(
      async (current) => {
        try {
          await request(`/api/logs/${id}`, { method: 'DELETE' })
          return { backend: 'cloud', logs: (current?.logs ?? []).filter((l) => l.id !== id) }
        } catch (error) {
          console.error('Failed to delete log on cloud, falling back to local:', error)
          return { backend: 'local', logs: readLocal().filter((l) => l.id !== id) }
        }
      },
      {
        optimisticData: (current) => ({
          backend: 'cloud',
          logs: (current?.logs ?? []).filter((l) => l.id !== id),
        }),
        rollbackOnError: true,
        revalidate: false,
      },
    )
  }

  async function clearAll() {
    if (backend === 'local') return applyLocal(() => [])
    await request('/api/logs', { method: 'DELETE' })
    await mutate()
  }

  async function loadSample() {
    if (backend === 'local') {
      return applyLocal((all) => [...all, ...generateSampleLogs(7).map(toLocalLog)])
    }
    await request('/api/logs/sample', { method: 'POST' })
    await mutate()
  }

  return { logs, backend, error, isLoading, createLog, updateLog, deleteLog, clearAll, loadSample, mutate }
}

export type LogsApi = ReturnType<typeof useLogs>
