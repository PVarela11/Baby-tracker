'use client'

import { useState } from 'react'
import { Milk, Pause, Play } from 'lucide-react'
import { useNow } from '@/hooks/use-now'
import type { LogsApi } from '@/hooks/use-logs'
import { formatStopwatch } from '@/lib/time'
import type { BreastSide, Log } from '@/lib/types'
import { cn } from '@/lib/utils'
import { PastLogButton } from './past-log-button'

const SIDES: { value: BreastSide; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
]

export function FeedControl({ logs, api, onLogPast }: { logs: Log[]; api: LogsApi; onLogPast: () => void }) {
  const running = logs.find((l) => l.event_type === 'feed' && !l.end_time)
  const lastSide = logs.find((l) => l.event_type === 'feed' && l.end_time)?.breast_side
  const suggested: BreastSide = lastSide === 'left' ? 'right' : 'left'
  const [side, setSide] = useState<BreastSide | null>(null)
  const [busy, setBusy] = useState(false)

  const runningSide = running?.breast_side === 'right' ? 'right' : running ? 'left' : null
  const selectedSide = runningSide ?? side ?? suggested

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
      setSide(null)
    }
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

      <PastLogButton label="Log past feed" onClick={onLogPast} />
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
