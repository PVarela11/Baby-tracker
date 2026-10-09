'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import type { VitaminLog, VitaminLogPatch, NewVitaminLog } from '@/lib/types'
import { db, getDeviceIdSync, type DbVitaminLog } from '@/lib/db'

function sortLogs(logs: VitaminLog[]) {
  return [...logs].sort((a, b) => b.given_date.localeCompare(a.given_date))
}

function dbToVitaminLog(dbLog: DbVitaminLog): VitaminLog {
  return {
    id: dbLog.id,
    given_date: dbLog.given_date,
    given_time: dbLog.given_time,
    notes: dbLog.notes,
    created_at: dbLog.created_at,
  }
}

export function useVitaminLogs() {
  const logs = useLiveQuery(
    () => db.vitamin_logs
      .where('deleted_at')
      .equals(null)
      .toArray()
      .then((dbLogs) => sortLogs(dbLogs.map(dbToVitaminLog))),
    [],
    []
  )

  async function createVitaminLog(log: NewVitaminLog) {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    await db.vitamin_logs.add({
      id,
      given_date: log.given_date,
      given_time: log.given_time,
      notes: log.notes ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      device_id: getDeviceIdSync(),
      user_id: null,
      server_updated_at: null,
      sync_status: 'pending',
    })
  }

  async function updateVitaminLog(id: string, patch: VitaminLogPatch) {
    const now = new Date().toISOString()

    await db.vitamin_logs
      .where('id')
      .equals(id)
      .modify({
        ...patch,
        updated_at: now,
        sync_status: 'pending',
      })
  }

  async function deleteVitaminLog(id: string) {
    const now = new Date().toISOString()

    await db.vitamin_logs
      .where('id')
      .equals(id)
      .modify({
        deleted_at: now,
        updated_at: now,
        sync_status: 'pending',
      })
  }

  return { logs: logs ?? [], error: null, isLoading: false, createVitaminLog, updateVitaminLog, deleteVitaminLog, syncError: null, mutate: () => {} }
}

export type VitaminLogsApi = ReturnType<typeof useVitaminLogs>
