'use client'

import { useState } from 'react'
import { CalendarDays, ChartGantt, Settings } from 'lucide-react'
import { useLogs } from '@/hooks/use-logs'
import { cn } from '@/lib/utils'
import { DateNav } from './date-nav'
import { DayLog } from './day-log'
import { DiaperControl } from './diaper-control'
import { FeedControl } from './feed-control'
import { LogDialog, type LogDialogTarget } from './log-dialog'
import { SettingsDialog } from './settings-dialog'
import { SleepControl } from './sleep-control'
import { StatusCounters } from './status-counters'
import { TimelineView } from './timeline-view'

type Tab = 'today' | 'timeline'

export function TrackerApp() {
  const api = useLogs()
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(() => new Date())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [logDialog, setLogDialog] = useState<LogDialogTarget | null>(null)

  const editLog = (log: LogDialogTarget & { mode: 'edit' }) => setLogDialog(log)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <h1 className="text-lg font-semibold">Baby Tracker</h1>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"
        >
          <Settings className="size-5" aria-hidden />
        </button>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 pb-28">
        {api.error && !api.logs.length ? (
          <p role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            Could not reach the server. Check your connection and try again.
          </p>
        ) : null}

        <StatusCounters logs={api.logs} />

        {tab === 'today' ? (
          <>
            <FeedControl
              logs={api.logs}
              api={api}
              onLogPast={() => setLogDialog({ mode: 'create', type: 'feed' })}
            />
            <SleepControl
              logs={api.logs}
              api={api}
              onLogPast={() => setLogDialog({ mode: 'create', type: 'sleep' })}
            />
            <DiaperControl api={api} onLogPast={() => setLogDialog({ mode: 'create', type: 'diaper' })} />
            <div className="mt-2 flex flex-col gap-4">
              <DateNav date={date} onChange={setDate} />
              <DayLog logs={api.logs} date={date} onEdit={(log) => editLog({ mode: 'edit', log })} />
            </div>
          </>
        ) : (
          <TimelineView logs={api.logs} onEdit={(log) => editLog({ mode: 'edit', log })} />
        )}
      </main>

      <nav
        aria-label="Views"
        className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid max-w-md grid-cols-2">
          <TabButton active={tab === 'today'} onClick={() => setTab('today')} icon={<CalendarDays className="size-5" aria-hidden />}>
            Daily log
          </TabButton>
          <TabButton active={tab === 'timeline'} onClick={() => setTab('timeline')} icon={<ChartGantt className="size-5" aria-hidden />}>
            Multi-Day Timeline
          </TabButton>
        </div>
      </nav>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} api={api} />
      {logDialog && <LogDialog target={logDialog} api={api} onClose={() => setLogDialog(null)} />}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium',
        active ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {icon}
      {children}
    </button>
  )
}
