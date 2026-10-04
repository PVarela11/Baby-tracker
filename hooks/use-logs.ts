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
  const res = await fetch('/api/logs', { cache: 'no-store' })
  if (res.status === 503) return { backend: 'local', logs: sortLogs(readLocal()) }
  if (!res.ok) throw new Error('Failed to load logs')
  return { backend: 'cloud', logs: (await res.json()) as Log[] }
}

async function request(url: string, init: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  if (!res.ok) throw new Error('Request failed')
  return res
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
        const res = await request('/api/logs', { method: 'POST', body: JSON.stringify(log) })
        const saved = (await res.json()) as Log
        return { backend: 'cloud', logs: sortLogs([...(current?.logs ?? []), saved]) }
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
        const res = await request(`/api/logs/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
        const saved = (await res.json()) as Log
        return { backend: 'cloud', logs: (current?.logs ?? []).map((l) => (l.id === id ? saved : l)) }
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
        await request(`/api/logs/${id}`, { method: 'DELETE' })
        return { backend: 'cloud', logs: (current?.logs ?? []).filter((l) => l.id !== id) }
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

  return { logs, backend, error, isLoading, createLog, updateLog, deleteLog, clearAll, loadSample }
}

export type LogsApi = ReturnType<typeof useLogs>
