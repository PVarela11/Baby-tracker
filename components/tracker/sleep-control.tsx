'use client'

import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useNow } from '@/hooks/use-now'
import type { LogsApi } from '@/hooks/use-logs'
import { formatClock, formatStopwatch } from '@/lib/time'
import type { Log } from '@/lib/types'
import { cn } from '@/lib/utils'

export function SleepControl({ logs, api }: { logs: Log[]; api: LogsApi }) {
  const running = logs.find((l) => l.event_type === 'sleep' && !l.end_time)
  const [busy, setBusy] = useState(false)

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
