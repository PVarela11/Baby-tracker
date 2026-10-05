'use client'

import { Baby, Droplets, Milk, Moon, Sun } from 'lucide-react'
import { useNow } from '@/hooks/use-now'
import { formatDuration } from '@/lib/time'
import type { Log } from '@/lib/types'
import { cn } from '@/lib/utils'

function latest(logs: Log[], type: Log['event_type']) {
  return logs.find((l) => l.event_type === type)
}

export function StatusCounters({ logs }: { logs: Log[] }) {
  const now = useNow(15_000)
  const runningSleep = logs.find((l) => l.event_type === 'sleep' && !l.end_time)
  const runningFeed = logs.find((l) => l.event_type === 'feed' && !l.end_time)
  const lastFeed = latest(logs, 'feed')
  const lastDiaper = latest(logs, 'diaper')
  const lastWake = logs.find((l) => l.event_type === 'sleep' && l.end_time)

  const feedReferenceTime = runningFeed ? runningFeed.start_time : lastFeed?.end_time || lastFeed?.start_time

  return (
    <section aria-label="Time since last events" className="flex flex-col gap-3">
      {runningSleep && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-sleep/40 bg-sleep/15 px-4 py-3"
        >
          <span className="relative flex size-3 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-sleep opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-sleep" />
          </span>
          <p className="text-sm font-medium text-foreground">
            Baby is currently sleeping{' '}
            <span className="font-mono tabular-nums text-sleep">
              ({formatDuration(now - Date.parse(runningSleep.start_time))})
            </span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Chip
          icon={<Milk className="size-4" aria-hidden />}
          label={runningFeed ? 'Feeding now' : 'Last fed'}
          value={
            runningFeed
              ? formatDuration(now - Date.parse(runningFeed.start_time))
              : feedReferenceTime
                ? `${formatDuration(now - Date.parse(feedReferenceTime))} ago`
                : '—'
          }
          tone="feed"
          active={!!runningFeed}
        />
        <Chip
          icon={runningSleep ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
          label={runningSleep ? 'Sleeping' : 'Awake for'}
          value={
            runningSleep
              ? formatDuration(now - Date.parse(runningSleep.start_time))
              : lastWake?.end_time
                ? formatDuration(now - Date.parse(lastWake.end_time))
                : '—'
          }
          tone="sleep"
          active={!!runningSleep}
        />
        <Chip
          icon={<Droplets className="size-4" aria-hidden />}
          label="Last diaper"
          value={lastDiaper ? `${formatDuration(now - Date.parse(lastDiaper.start_time))} ago` : '—'}
          tone="diaper"
        />
      </div>
      {logs.length === 0 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Baby className="size-4" aria-hidden />
          No logs yet. Start below, or load sample data from Settings.
        </p>
      )}
    </section>
  )
}

const toneStyles = {
  feed: 'text-feed',
  sleep: 'text-sleep',
  diaper: 'text-diaper',
} as const

function Chip({
  icon,
  label,
  value,
  tone,
  active,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: keyof typeof toneStyles
  active?: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-2xl border bg-card p-3',
        active && 'border-current/40',
        active && toneStyles[tone],
      )}
    >
      <span className={cn('flex items-center gap-1.5 text-xs font-medium', toneStyles[tone])}>
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="font-mono text-base font-semibold tabular-nums leading-tight text-foreground text-balance">
        {value}
      </span>
    </div>
  )
}
