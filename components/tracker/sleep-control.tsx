'use client'

import { useState } from 'react'
import { Moon, Sun, PencilLine, X } from 'lucide-react'
import { useNow } from '@/hooks/use-now'
import type { LogsApi } from '@/hooks/use-logs'
import { formatClock, formatStopwatch } from '@/lib/time'
import type { Log } from '@/lib/types'
import { cn } from '@/lib/utils'

export function SleepControl({ logs, api }: { logs: Log[]; api: LogsApi }) {
  const running = logs.find((l) => l.event_type === 'sleep' && !l.end_time)
  const [busy, setBusy] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [pastDate, setPastDate] = useState(() => new Date().toISOString().split('T')[0])
  const [pastStartTime, setPastStartTime] = useState('')
  const [pastEndTime, setPastEndTime] = useState('')

  async function toggle() {
    setBusy(true)
    try {
      if (running) {
        await api.updateLog(running.id, { end_time: new Date().toISOString() })
      } else {
        await api.createLog({
          event_type: 'sleep',
          start_time: new Date().toISOString(),
          end_time: null,
          breast_side: null,
          diaper_type: null,
          notes: null,
        })
      }
    } finally {
      setBusy(false)
    }
  }

  function savePastLog(e: React.FormEvent) {
    e.preventDefault()
    if (!pastDate || !pastStartTime) return

    const startDateTime = new Date(`${pastDate}T${pastStartTime}`)
    const endDateTime = pastEndTime ? new Date(`${pastDate}T${pastEndTime}`) : null

    if (isNaN(startDateTime.getTime()) || (endDateTime && isNaN(endDateTime.getTime()))) return
    if (endDateTime && endDateTime <= startDateTime) return

    setBusy(true)
    api.createLog({
      event_type: 'sleep',
      start_time: startDateTime.toISOString(),
      end_time: endDateTime ? endDateTime.toISOString() : null,
      breast_side: null,
      diaper_type: null,
      notes: null,
    }).then(() => {
      setManualOpen(false)
      setPastDate(new Date().toISOString().split('T')[0])
      setPastStartTime('')
      setPastEndTime('')
      setBusy(false)
    })
  }

  function openPastLogModal() {
    setPastDate(new Date().toISOString().split('T')[0])
    setPastStartTime('')
    setPastEndTime('')
    setManualOpen(true)
  }

  return (
    <section aria-labelledby="sleep-heading" className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 id="sleep-heading" className="flex items-center gap-2 text-sm font-semibold text-sleep">
          <Moon className="size-4" aria-hidden />
          Sleep
        </h2>
        {running && (
          <span className="text-xs text-muted-foreground">Since {formatClock(running.start_time)}</span>
        )}
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-label={running ? 'Baby woke up, stop sleep timer' : 'Baby fell asleep, start sleep timer'}
        className={cn(
          'flex h-20 items-center justify-center gap-3 rounded-2xl text-xl font-semibold transition-colors disabled:opacity-60',
          running ? 'bg-sleep text-background' : 'bg-sleep/15 text-sleep',
        )}
      >
        {running ? <Sun className="size-6" aria-hidden /> : <Moon className="size-6" aria-hidden />}
        {running ? <SleepStopwatch start={running.start_time} /> : 'Fell asleep'}
      </button>

      {!running && (
        <button
          type="button"
          onClick={openPastLogModal}
          className="flex items-center justify-center gap-2 py-1 text-sm text-muted-foreground"
        >
          <PencilLine className="size-4" aria-hidden />
          Log a past sleep manually
        </button>
      )}

      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl border bg-card p-5 sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Log Past Sleep</h3>
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="flex size-10 items-center justify-center rounded-xl bg-secondary"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <form onSubmit={savePastLog} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Date
                <input
                  type="date"
                  value={pastDate}
                  onChange={(e) => setPastDate(e.target.value)}
                  className="h-12 rounded-xl border bg-secondary px-3 text-base text-foreground"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Start Time
                <input
                  type="time"
                  value={pastStartTime}
                  onChange={(e) => setPastStartTime(e.target.value)}
                  className="h-12 rounded-xl border bg-secondary px-3 font-mono text-base text-foreground"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                End Time (optional)
                <input
                  type="time"
                  value={pastEndTime}
                  onChange={(e) => setPastEndTime(e.target.value)}
                  className="h-12 rounded-xl border bg-secondary px-3 font-mono text-base text-foreground"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="h-12 rounded-xl bg-sleep px-5 font-semibold text-background disabled:opacity-60"
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

function SleepStopwatch({ start }: { start: string }) {
  const now = useNow(1000)
  return (
    <span className="font-mono tabular-nums">
      {formatStopwatch(now - Date.parse(start))} <span className="text-base font-medium">Woke up</span>
    </span>
  )
}
