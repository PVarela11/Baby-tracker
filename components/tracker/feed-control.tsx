'use client'

import { useState } from 'react'
import { Milk, Pause, Play, PencilLine, X } from 'lucide-react'
import { useNow } from '@/hooks/use-now'
import type { LogsApi } from '@/hooks/use-logs'
import { MINUTE, formatStopwatch } from '@/lib/time'
import type { BreastSide, Log } from '@/lib/types'
import { cn } from '@/lib/utils'

const SIDES: { value: BreastSide; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
]

export function FeedControl({ logs, api }: { logs: Log[]; api: LogsApi }) {
  const running = logs.find((l) => l.event_type === 'feed' && !l.end_time)
  const lastSide = logs.find((l) => l.event_type === 'feed' && l.end_time)?.breast_side
  const suggested: BreastSide = lastSide === 'left' ? 'right' : 'left'
  const [side, setSide] = useState<BreastSide>(suggested)
  const [manualOpen, setManualOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pastDate, setPastDate] = useState(() => new Date().toISOString().split('T')[0])
  const [pastStartTime, setPastStartTime] = useState('')
  const [pastEndTime, setPastEndTime] = useState('')

  const selectedSide = running?.breast_side ?? side ?? suggested

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  function chooseSide(value: BreastSide) {
    if (running) {
      run(() => api.updateLog(running.id, { breast_side: value }))
    } else {
      setSide(value)
    }
  }

  function toggleTimer() {
    if (running) {
      run(() => api.updateLog(running.id, { end_time: new Date().toISOString() }))
    } else {
      run(() =>
        api.createLog({
          event_type: 'feed',
          start_time: new Date().toISOString(),
          end_time: null,
          breast_side: selectedSide,
          diaper_type: null,
          notes: null,
        }),
      )
      setSide(suggested)
    }
  }

  function savePastLog(e: React.FormEvent) {
    e.preventDefault()
    if (!pastDate || !pastStartTime) return

    const startDateTime = new Date(`${pastDate}T${pastStartTime}`)
    const endDateTime = pastEndTime ? new Date(`${pastDate}T${pastEndTime}`) : null

    if (isNaN(startDateTime.getTime()) || (endDateTime && isNaN(endDateTime.getTime()))) return
    if (endDateTime && endDateTime <= startDateTime) return

    run(async () => {
      await api.createLog({
        event_type: 'feed',
        start_time: startDateTime.toISOString(),
        end_time: endDateTime ? endDateTime.toISOString() : null,
        breast_side: selectedSide,
        diaper_type: null,
        notes: null,
      })
      setManualOpen(false)
      setPastDate(new Date().toISOString().split('T')[0])
      setPastStartTime('')
      setPastEndTime('')
    })
  }

  function openPastLogModal() {
    setPastDate(new Date().toISOString().split('T')[0])
    setPastStartTime('')
    setPastEndTime('')
    setManualOpen(true)
  }

  return (
    <section aria-labelledby="feed-heading" className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 id="feed-heading" className="flex items-center gap-2 text-sm font-semibold text-feed">
          <Milk className="size-4" aria-hidden />
          Breastfeeding
        </h2>
        {!running && lastSide && (
          <span className="text-xs text-muted-foreground">
            Last: <span className="capitalize">{lastSide}</span>
          </span>
        )}
      </div>

      <div role="radiogroup" aria-label="Breast side" className="grid grid-cols-2 gap-2">
        {SIDES.map((s) => {
          const checked = selectedSide === s.value
          return (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={busy}
              onClick={() => chooseSide(s.value)}
              className={cn(
                'h-12 rounded-xl border text-base font-medium transition-colors',
                checked ? 'border-feed bg-feed/20 text-feed' : 'bg-secondary text-secondary-foreground',
              )}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={toggleTimer}
        disabled={busy}
        aria-label={running ? 'Stop feeding timer' : 'Start feeding timer'}
        className={cn(
          'flex h-20 items-center justify-center gap-3 rounded-2xl text-xl font-semibold transition-colors disabled:opacity-60',
          running ? 'bg-feed text-background' : 'bg-feed/15 text-feed',
        )}
      >
        {running ? <Pause className="size-6" aria-hidden /> : <Play className="size-6" aria-hidden />}
        {running ? <FeedStopwatch start={running.start_time} /> : 'Start feeding'}
      </button>

      {!running && (
        <>
          <button
            type="button"
            onClick={openPastLogModal}
            className="flex items-center justify-center gap-2 py-1 text-sm text-muted-foreground"
          >
            <PencilLine className="size-4" aria-hidden />
            Log a past feed manually
          </button>
        </>
      )}

      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl border bg-card p-5 sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Log Past Feed</h3>
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
                className="h-12 rounded-xl bg-feed px-5 font-semibold text-background disabled:opacity-60"
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

function FeedStopwatch({ start }: { start: string }) {
  const now = useNow(1000)
  return (
    <span className="font-mono tabular-nums">
      {formatStopwatch(now - Date.parse(start))} <span className="text-base font-medium">Stop</span>
    </span>
  )
}
