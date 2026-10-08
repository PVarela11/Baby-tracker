'use client'

import { useState } from 'react'
import { Droplets, Milk, Moon, Trash2, Pencil, X, WifiOff } from 'lucide-react'
import { useNow } from '@/hooks/use-now'
import type { LogsApi } from '@/hooks/use-logs'
import { DAY, formatClock, formatDuration, logEnd, logsForDay, overlapMs, startOfDay } from '@/lib/time'
import type { BreastSide, DiaperType, Log } from '@/lib/types'
import { cn } from '@/lib/utils'
import { isLogPendingSync } from '@/lib/sync-queue'

export function DayLog({ logs, date, api }: { logs: Log[]; date: Date; api: LogsApi }) {
  const now = useNow(30_000)
  const dayStart = startOfDay(date).getTime()
  const dayEnd = dayStart + DAY
  const dayLogs = logsForDay(logs, date, now)

  const feeds = dayLogs.filter((l) => l.event_type === 'feed' && Date.parse(l.start_time) >= dayStart)
  const feedMs = feeds.reduce((sum, l) => sum + (logEnd(l, now) - Date.parse(l.start_time)), 0)
  const sleeps = dayLogs.filter((l) => l.event_type === 'sleep')
  const sleepMs = sleeps.reduce((sum, l) => sum + overlapMs(l, dayStart, dayEnd, now), 0)
  const diapers = dayLogs.filter((l) => l.event_type === 'diaper')
  const wet = diapers.filter((l) => l.diaper_type !== 'dirty').length
  const dirty = diapers.filter((l) => l.diaper_type !== 'wet').length

  const [editingLog, setEditingLog] = useState<Log | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editBreastSide, setEditBreastSide] = useState<BreastSide | null>(null)
  const [editDiaperType, setEditDiaperType] = useState<DiaperType | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [busy, setBusy] = useState(false)

  function openEdit(log: Log) {
    setEditingLog(log)
    const startDate = new Date(log.start_time)
    setEditDate(startDate.toISOString().split('T')[0])
    setEditStartTime(startDate.toTimeString().slice(0, 5))
    setEditEndTime(log.end_time ? new Date(log.end_time).toTimeString().slice(0, 5) : '')
    setEditBreastSide(log.breast_side)
    setEditDiaperType(log.diaper_type)
    setEditNotes(log.notes || '')
  }

  function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingLog) return

    const startDateTime = new Date(`${editDate}T${editStartTime}`)
    const endDateTime = editEndTime ? new Date(`${editDate}T${editEndTime}`) : null

    if (isNaN(startDateTime.getTime()) || (endDateTime && isNaN(endDateTime.getTime()))) return
    if (endDateTime && endDateTime <= startDateTime) return

    setBusy(true)
    api
      .updateLog(editingLog.id, {
        start_time: startDateTime.toISOString(),
        end_time: endDateTime ? endDateTime.toISOString() : null,
        breast_side: editBreastSide,
        diaper_type: editDiaperType,
        notes: editNotes || null,
      })
      .then(() => {
        setEditingLog(null)
        setBusy(false)
      })
  }

  return (
    <section aria-label="Daily summary and entries" className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-2">
        <Summary tone="text-feed" label="Feeds" value={`${feeds.length}`} sub={formatDuration(feedMs)} />
        <Summary tone="text-sleep" label="Sleep" value={formatDuration(sleepMs)} sub={`${sleeps.length} blocks`} />
        <Summary tone="text-diaper" label="Diapers" value={`${diapers.length}`} sub={`${wet} wet · ${dirty} dirty`} />
      </dl>

      {dayLogs.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nothing logged on this day.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-2xl border bg-card">
          {dayLogs.map((log) => (
            <LogRow key={log.id} log={log} now={now} onEdit={() => openEdit(log)} onDelete={() => api.deleteLog(log.id)} />
          ))}
        </ul>
      )}

      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl border bg-card p-5 sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit {META[editingLog.event_type].label}</h3>
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                className="flex size-10 items-center justify-center rounded-xl bg-secondary"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <form onSubmit={saveEdit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Date
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="h-12 rounded-xl border bg-secondary px-3 text-base text-foreground"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Start Time
                <input
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="h-12 rounded-xl border bg-secondary px-3 font-mono text-base text-foreground"
                  required
                />
              </label>
              {editingLog.event_type !== 'diaper' && (
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  End Time (optional)
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="h-12 rounded-xl border bg-secondary px-3 font-mono text-base text-foreground"
                  />
                </label>
              )}
              {editingLog.event_type === 'feed' && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Side</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['left', 'right'] as BreastSide[]).map((side) => (
                      <button
                        key={side}
                        type="button"
                        onClick={() => setEditBreastSide(side)}
                        className={cn(
                          'h-12 rounded-xl border text-base font-medium transition-colors',
                          editBreastSide === side
                            ? 'border-feed bg-feed/20 text-feed'
                            : 'bg-secondary text-secondary-foreground',
                        )}
                      >
                        {side.charAt(0).toUpperCase() + side.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {editingLog.event_type === 'diaper' && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Type</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['wet', 'dirty', 'both'] as DiaperType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEditDiaperType(type)}
                        className={cn(
                          'h-12 rounded-xl border text-base font-medium transition-colors',
                          editDiaperType === type
                            ? 'border-diaper bg-diaper/20 text-diaper'
                            : 'bg-secondary text-secondary-foreground',
                        )}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Notes (optional)
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="h-20 rounded-xl border bg-secondary px-3 text-sm text-foreground resize-none"
                  maxLength={1000}
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 h-12 rounded-xl bg-feed px-5 font-semibold text-background disabled:opacity-60"
                >
                  {busy ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => api.deleteLog(editingLog.id).then(() => setEditingLog(null))}
                  className="h-12 rounded-xl bg-destructive/15 px-5 font-semibold text-destructive"
                >
                  Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

function Summary({ tone, label, value, sub }: { tone: string; label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border bg-card p-3">
      <dt className={cn('text-xs font-medium', tone)}>{label}</dt>
      <dd className="font-mono text-lg font-semibold tabular-nums">{value}</dd>
      <dd className="text-xs text-muted-foreground">{sub}</dd>
    </div>
  )
}

const META = {
  feed: { icon: Milk, tone: 'text-feed bg-feed/15', label: 'Feed' },
  sleep: { icon: Moon, tone: 'text-sleep bg-sleep/15', label: 'Sleep' },
  diaper: { icon: Droplets, tone: 'text-diaper bg-diaper/15', label: 'Diaper' },
} as const

function LogRow({ log, now, onEdit, onDelete }: { log: Log; now: number; onEdit: () => void; onDelete: () => void }) {
  const meta = META[log.event_type]
  const Icon = meta.icon
  const running = log.event_type !== 'diaper' && !log.end_time
  const pendingSync = isLogPendingSync(log.id)
  const detail =
    log.event_type === 'diaper'
      ? log.diaper_type
      : `${formatDuration(logEnd(log, now) - Date.parse(log.start_time))}${
          log.breast_side ? ` · ${log.breast_side}` : ''
        }`

  return (
    <li className="flex items-center gap-3 px-3 py-3">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', meta.tone)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">
          {meta.label}
          {running && <span className="ml-2 text-xs text-muted-foreground">in progress</span>}
        </span>
        <span className="truncate text-xs capitalize text-muted-foreground">{detail}</span>
      </div>
      {pendingSync && (
        <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
          <WifiOff className="size-3" aria-hidden />
          <span>Offline</span>
        </span>
      )}
      <span className="font-mono text-sm tabular-nums text-muted-foreground">
        {formatClock(log.start_time)}
        {log.end_time && log.event_type !== 'diaper' && `–${formatClock(log.end_time)}`}
      </span>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${meta.label.toLowerCase()} at ${formatClock(log.start_time)}`}
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary"
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${meta.label.toLowerCase()} at ${formatClock(log.start_time)}`}
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-destructive"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </li>
  )
}
