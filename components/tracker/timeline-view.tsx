'use client'

import { useNow } from '@/hooks/use-now'
import { DAY, addDays, formatClock, formatDuration, logEnd, logsForDay, startOfDay } from '@/lib/time'
import type { Log } from '@/lib/types'

const HOURS = [0, 6, 12, 18, 24]

export function TimelineView({ logs }: { logs: Log[] }) {
  const now = useNow(60_000)
  const today = startOfDay(new Date(now))
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -i))

  return (
    <section aria-labelledby="timeline-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="timeline-heading" className="text-lg font-semibold">
          Multi-day timeline
        </h2>
        <p className="text-sm text-muted-foreground">Last 7 days, midnight to midnight.</p>
      </div>

      <ul aria-label="Legend" className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <Legend className="bg-feed" label="Feed" />
        <Legend className="bg-sleep" label="Sleep" />
        <Legend className="bg-diaper" label="Diaper" />
      </ul>

      <div className="flex flex-col gap-2 rounded-2xl border bg-card p-3">
        <div className="ml-12 flex justify-between font-mono text-[10px] text-muted-foreground" aria-hidden>
          {HOURS.map((h) => (
            <span key={h}>{h === 24 ? '24' : h.toString().padStart(2, '0')}</span>
          ))}
        </div>
        {days.map((day) => (
          <DayRow key={day.toISOString()} day={day} logs={logs} now={now} />
        ))}
      </div>
    </section>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`size-3 rounded-sm ${className}`} aria-hidden />
      {label}
    </li>
  )
}

function DayRow({ day, logs, now }: { day: Date; logs: Log[]; now: number }) {
  const dayStart = day.getTime()
  const dayEnd = dayStart + DAY
  const dayLogs = logsForDay(logs, day, now)
  const pct = (t: number) => ((Math.min(Math.max(t, dayStart), dayEnd) - dayStart) / DAY) * 100
  const label = day.toLocaleDateString([], { weekday: 'short' })
  const nowPct = now >= dayStart && now < dayEnd ? pct(now) : null

  const blocks = dayLogs.filter((l) => l.event_type !== 'diaper')
  const diapers = dayLogs.filter((l) => l.event_type === 'diaper')

  return (
    <div className="flex items-center gap-2">
      <div className="flex w-10 shrink-0 flex-col text-right leading-tight">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-[10px] text-muted-foreground">{day.getDate()}</span>
      </div>
      <div
        className="relative h-10 flex-1 overflow-hidden rounded-md bg-secondary"
        role="img"
        aria-label={`${day.toDateString()}: ${blocks.filter((b) => b.event_type === 'sleep').length} sleeps, ${
          blocks.filter((b) => b.event_type === 'feed').length
        } feeds, ${diapers.length} diapers`}
      >
        {[25, 50, 75].map((p) => (
          <span key={p} className="absolute inset-y-0 w-px bg-border" style={{ left: `${p}%` }} aria-hidden />
        ))}
        {blocks.map((log) => {
          const start = pct(Date.parse(log.start_time))
          const end = pct(logEnd(log, now))
          const isSleep = log.event_type === 'sleep'
          return (
            <span
              key={log.id}
              title={`${isSleep ? 'Sleep' : 'Feed'} ${formatClock(log.start_time)} · ${formatDuration(
                logEnd(log, now) - Date.parse(log.start_time),
              )}`}
              className={
                isSleep
                  ? 'absolute top-1 bottom-1 rounded-sm bg-sleep/80'
                  : 'absolute top-2.5 bottom-2.5 rounded-sm bg-feed'
              }
              style={{ left: `${start}%`, width: `max(${end - start}%, 3px)` }}
            />
          )
        })}
        {diapers.map((log) => (
          <span
            key={log.id}
            title={`Diaper (${log.diaper_type}) ${formatClock(log.start_time)}`}
            className="absolute bottom-0 h-2 w-1 -translate-x-1/2 rounded-full bg-diaper"
            style={{ left: `${pct(Date.parse(log.start_time))}%` }}
          />
        ))}
        {nowPct !== null && (
          <span className="absolute inset-y-0 w-0.5 bg-foreground/70" style={{ left: `${nowPct}%` }} aria-hidden />
        )}
      </div>
    </div>
  )
}
