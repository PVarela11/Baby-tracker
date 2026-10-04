'use client'

import { Droplets, Milk, Moon, Trash2 } from 'lucide-react'
import { useNow } from '@/hooks/use-now'
import type { LogsApi } from '@/hooks/use-logs'
import { DAY, formatClock, formatDuration, logEnd, logsForDay, overlapMs, startOfDay } from '@/lib/time'
import type { Log } from '@/lib/types'
import { cn } from '@/lib/utils'

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
            <LogRow key={log.id} log={log} now={now} onDelete={() => api.deleteLog(log.id)} />
          ))}
        </ul>
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

function LogRow({ log, now, onDelete }: { log: Log; now: number; onDelete: () => void }) {
  const meta = META[log.event_type]
  const Icon = meta.icon
  const running = log.event_type !== 'diaper' && !log.end_time
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
      <span className="font-mono text-sm tabular-nums text-muted-foreground">
        {formatClock(log.start_time)}
        {log.end_time && log.event_type !== 'diaper' && `–${formatClock(log.end_time)}`}
      </span>
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
