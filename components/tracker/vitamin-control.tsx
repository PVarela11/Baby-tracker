'use client'

import { useState, useEffect } from 'react'
import { Check, X, Pencil, AlertCircle, WifiOff } from 'lucide-react'
import { useNow } from '@/hooks/use-now'
import type { VitaminLogsApi } from '@/hooks/use-vitamin-logs'
import { formatClock, startOfDay } from '@/lib/time'
import type { VitaminLog } from '@/lib/types'
import { cn } from '@/lib/utils'
import { isVitaminLogPendingSync } from '@/lib/sync-queue'

export function VitaminControl({ api }: { api: VitaminLogsApi }) {
  const now = useNow(60_000)
  const today = startOfDay(new Date(now)).toISOString().split('T')[0]
  const todayLog = api.logs.find((log) => log.given_date === today)
  const [editOpen, setEditOpen] = useState(false)
  const [editTime, setEditTime] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (todayLog) {
      setEditTime(new Date(todayLog.given_time).toTimeString().slice(0, 5))
    }
  }, [todayLog])

  async function markGiven() {
    setBusy(true)
    try {
      await api.createVitaminLog({
        given_date: today,
        given_time: new Date().toISOString(),
        notes: null,
      })
    } finally {
      setBusy(false)
    }
  }

  async function undoMark() {
    if (!todayLog) return
    setBusy(true)
    try {
      // Delete from localStorage immediately
      const local = api.logs.filter((l) => l.id !== todayLog.id)
      localStorage.setItem('baby-tracker:vitamin-logs', JSON.stringify(local))

      // Try to delete from Supabase directly
      await api.deleteVitaminLog(todayLog.id, todayLog.given_date)
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!todayLog || !editTime) return

    const newTime = new Date(`${today}T${editTime}`)
    if (isNaN(newTime.getTime())) return

    setBusy(true)
    try {
      await api.updateVitaminLog(todayLog.id, {
        given_time: newTime.toISOString(),
      })
      setEditOpen(false)
    } finally {
      setBusy(false)
    }
  }

  if (todayLog) {
    const pendingSync = isVitaminLogPendingSync(todayLog.id)
    return (
      <section aria-labelledby="vitamin-heading" className="flex flex-col gap-3 rounded-3xl border border-green-500/40 bg-green-500/10 p-4">
        <div className="flex items-center justify-between">
          <h2 id="vitamin-heading" className="flex items-center gap-2 text-sm font-semibold text-green-600">
            <Check className="size-4" aria-hidden />
            Vitamin Drops: Given Today
          </h2>
          <div className="flex items-center gap-2">
            {pendingSync && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
                <WifiOff className="size-3" aria-hidden />
                <span>Offline</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              disabled={busy}
              className="flex size-8 items-center justify-center rounded-lg bg-green-500/20 text-green-600 hover:bg-green-500/30 disabled:opacity-60"
              aria-label="Edit vitamin time"
            >
              <Pencil className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={undoMark}
              disabled={busy}
              className="flex size-8 items-center justify-center rounded-lg bg-green-500/20 text-green-600 hover:bg-green-500/30 disabled:opacity-60"
              aria-label="Undo vitamin mark"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
        <p className="text-sm text-green-700">
          Given at <span className="font-mono font-semibold">{formatClock(todayLog.given_time)}</span>
        </p>

        {editOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
            <div className="w-full max-w-md rounded-t-3xl border bg-card p-5 sm:rounded-3xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Edit Vitamin Time</h3>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex size-10 items-center justify-center rounded-xl bg-secondary"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <form onSubmit={saveEdit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Time Given
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="h-12 rounded-xl border bg-secondary px-3 font-mono text-base text-foreground"
                    required
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="h-12 rounded-xl bg-green-600 px-5 font-semibold text-background disabled:opacity-60"
                >
                  {busy ? 'Saving...' : 'Save'}
                </button>
              </form>
            </div>
          </div>
        )}
      </section>
    )
  }

  return (
    <section aria-labelledby="vitamin-heading" className="flex flex-col gap-3 rounded-3xl border border-amber-500/40 bg-amber-500/10 p-4">
      <h2 id="vitamin-heading" className="flex items-center gap-2 text-sm font-semibold text-amber-600">
        <AlertCircle className="size-4" aria-hidden />
        Vitamin Drops: Not Given Today
      </h2>
      <button
        type="button"
        onClick={markGiven}
        disabled={busy}
        className="h-12 rounded-xl bg-amber-500 px-5 font-semibold text-background transition-colors hover:bg-amber-600 disabled:opacity-60"
      >
        {busy ? 'Marking...' : 'Mark as Given'}
      </button>
    </section>
  )
}
