'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import type { GrowthLog, GrowthLogPatch, NewGrowthLog } from '@/lib/types'
import { db, getDeviceIdSync, type DbGrowthLog } from '@/lib/db'

function sortLogs(logs: GrowthLog[]) {
  return [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date))
}

function dbToGrowthLog(dbLog: DbGrowthLog): GrowthLog {
  return {
    id: dbLog.id,
    log_date: dbLog.log_date,
    weight_kg: dbLog.weight_kg,
    height_cm: dbLog.height_cm,
    head_circumference_cm: dbLog.head_circumference_cm,
    notes: dbLog.notes,
    created_at: dbLog.created_at,
  }
}

export function useGrowthLogs() {
  const logs = useLiveQuery(
    () => db.growth_logs
      .toArray()
      .then((dbLogs) => dbLogs.filter((log) => !log.deleted_at))
      .then((dbLogs) => sortLogs(dbLogs.map(dbToGrowthLog))),
    [],
    []
  )

  async function createGrowthLog(log: NewGrowthLog) {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    await db.growth_logs.add({
      id,
      log_date: log.log_date,
      weight_kg: log.weight_kg,
      height_cm: log.height_cm,
      head_circumference_cm: log.head_circumference_cm,
      notes: log.notes,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      device_id: getDeviceIdSync(),
      user_id: null,
      server_updated_at: null,
      sync_status: 'pending',
    })
  }

  async function updateGrowthLog(id: string, patch: GrowthLogPatch) {
    const now = new Date().toISOString()

    await db.growth_logs
      .where('id')
      .equals(id)
      .modify({
        ...patch,
        updated_at: now,
        sync_status: 'pending',
      })
  }

  async function deleteGrowthLog(id: string) {
    const now = new Date().toISOString()

    await db.growth_logs
      .where('id')
      .equals(id)
      .modify({
        deleted_at: now,
        updated_at: now,
        sync_status: 'pending',
      })
  }

  return { logs: logs ?? [], error: null, isLoading: false, createGrowthLog, updateGrowthLog, deleteGrowthLog, syncError: null, mutate: () => {} }
}

export type GrowthLogsApi = ReturnType<typeof useGrowthLogs>
