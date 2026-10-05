'use client'

import { useState } from 'react'
import { CalendarDays, ChartGantt, Settings, Cloud, HardDrive, CheckCircle, AlertCircle, Baby } from 'lucide-react'
import { useLogs } from '@/hooks/use-logs'
import { useVitaminLogs } from '@/hooks/use-vitamin-logs'
import { useGrowthLogs } from '@/hooks/use-growth-logs'
import { useBabyProfile } from '@/hooks/use-baby-profile'
import { cn } from '@/lib/utils'
import { calculateAge } from '@/lib/time'
import { DateNav } from './date-nav'
import { DayLog } from './day-log'
import { DiaperControl } from './diaper-control'
import { FeedControl } from './feed-control'
import { SettingsDialog } from './settings-dialog'
import { SleepControl } from './sleep-control'
import { StatusCounters } from './status-counters'
import { TimelineView } from './timeline-view'
import { VitaminControl } from './vitamin-control'
import { GrowthTracker } from './growth-tracker'

const APP_VERSION = 'v1.2.0 - Vitamin & Growth Tracking'

type Tab = 'today' | 'timeline' | 'growth'

export function TrackerApp() {
  const api = useLogs()
  const vitaminApi = useVitaminLogs()
  const growthApi = useGrowthLogs()
  const babyProfile = useBabyProfile()
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(() => new Date())
  const [settingsOpen, setSettingsOpen] = useState(false)

  const ageDisplay = babyProfile.profile?.date_of_birth
    ? `Baby ${babyProfile.profile.name || '—'} • ${calculateAge(babyProfile.profile.date_of_birth)}`
    : 'Baby Tracker'

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Baby className="size-5 text-sleep" aria-hidden />
            <h1 className="text-lg font-semibold">{ageDisplay}</h1>
          </div>
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              api.backend === 'cloud' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600',
            )}
            title={api.backend === 'cloud' ? 'Synced to cloud' : 'Saving locally'}
          >
            {api.backend === 'cloud' ? (
              <>
                <CheckCircle className="size-3" aria-hidden />
                Synced
              </>
            ) : (
              <>
                <AlertCircle className="size-3" aria-hidden />
                Offline
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"
        >
          <Settings className="size-5" aria-hidden />
        </button>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 pb-32">
        {api.error ? (
          <p role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            {api.backend === 'local'
              ? 'Could not sync to cloud. Changes are saved locally and will sync when connection is restored.'
              : 'Could not reach the server. Check your connection and try again.'}
          </p>
        ) : null}

        {tab === 'today' && (
          <>
            <VitaminControl api={vitaminApi} />
            <StatusCounters logs={api.logs} />
            <FeedControl logs={api.logs} api={api} />
            <SleepControl logs={api.logs} api={api} />
            <DiaperControl api={api} />
            <div className="mt-2 flex flex-col gap-4">
              <DateNav date={date} onChange={setDate} />
              <DayLog logs={api.logs} date={date} api={api} />
            </div>
          </>
        )}

        {tab === 'timeline' && <TimelineView logs={api.logs} />}

        {tab === 'growth' && <GrowthTracker api={growthApi} />}
      </main>

      <nav
        aria-label="Views"
        className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid max-w-md grid-cols-3">
          <TabButton active={tab === 'today'} onClick={() => setTab('today')} icon={<CalendarDays className="size-5" aria-hidden />}>
            Daily
          </TabButton>
          <TabButton active={tab === 'growth'} onClick={() => setTab('growth')} icon={<Baby className="size-5" aria-hidden />}>
            Growth
          </TabButton>
          <TabButton active={tab === 'timeline'} onClick={() => setTab('timeline')} icon={<ChartGantt className="size-5" aria-hidden />}>
            Timeline
          </TabButton>
        </div>
      </nav>

      <div className="px-4 pb-2 text-center text-xs text-muted-foreground">
        {APP_VERSION}
      </div>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        api={api}
        version={APP_VERSION}
        babyProfile={babyProfile}
      />
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
