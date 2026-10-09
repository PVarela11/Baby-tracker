'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { generateSampleLogs } from '@/lib/sample-data'
import type { Log, LogPatch, NewLog } from '@/lib/types'
import { db, deviceId, type DbLog } from '@/lib/db'

export type Backend = 'cloud' | 'local'

function sortLogs(logs: Log[]) {
  return [...logs].sort((a, b) => {
    const aTime = Date.parse(a.created_at || a.start_time)
    const bTime = Date.parse(b.created_at || b.start_time)
    return bTime - aTime
  })
}

function dbToLog(dbLog: DbLog): Log {
  return {
    id: dbLog.id,
    event_type: dbLog.event_type,
    start_time: dbLog.start_time,
    end_time: dbLog.end_time,
    breast_side: dbLog.breast_side,
    diaper_type: dbLog.diaper_type,
    notes: dbLog.notes,
    created_at: dbLog.created_at,
  }
}

export function useLogs() {
  const logs = useLiveQuery(
    () => db.logs
      .where('deleted_at')
      .equals(null)
      .toArray()
      .then((dbLogs) => sortLogs(dbLogs.map(dbToLog))),
    [],
    []
  )

  async function createLog(log: NewLog) {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    await db.logs.add({
      id,
      event_type: log.event_type,
      start_time: log.start_time,
      end_time: log.end_time,
      breast_side: log.breast_side,
      diaper_type: log.diaper_type,
      notes: log.notes,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      device_id: deviceId,
      user_id: null,
      server_updated_at: null,
      sync_status: 'pending',
    })
  }

  async function updateLog(id: string, patch: LogPatch) {
    const now = new Date().toISOString()

    await db.logs
      .where('id')
      .equals(id)
      .modify({
        ...patch,
        updated_at: now,
        sync_status: 'pending',
      })
  }

  async function deleteLog(id: string) {
    const now = new Date().toISOString()

    await db.logs
      .where('id')
      .equals(id)
      .modify({
        deleted_at: now,
        updated_at: now,
        sync_status: 'pending',
      })
  }

  async function clearAll() {
    const now = new Date().toISOString()

    await db.logs
      .where('deleted_at')
      .equals(null)
      .modify({
        deleted_at: now,
        updated_at: now,
        sync_status: 'pending',
      })
  }

  async function loadSample() {
    const now = new Date().toISOString()
    const samples = generateSampleLogs(7)

    await db.logs.bulkAdd(
      samples.map((log) => ({
        id: crypto.randomUUID(),
        event_type: log.event_type,
        start_time: log.start_time,
        end_time: log.end_time,
        breast_side: log.breast_side,
        diaper_type: log.diaper_type,
        notes: log.notes,
        created_at: log.created_at,
        updated_at: now,
        deleted_at: null,
        device_id: deviceId,
        user_id: null,
        server_updated_at: null,
        sync_status: 'pending',
      }))
    )
  }

  return { logs: logs ?? [], backend: 'local' as const, error: null, isLoading: false, createLog, updateLog, deleteLog, clearAll, loadSample, mutate: () => {} }
}

export type LogsApi = ReturnType<typeof useLogs>
