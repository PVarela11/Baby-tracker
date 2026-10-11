'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, ChartGantt, Settings, HardDrive, Baby, Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { useLogs } from '@/hooks/use-logs'
import { useVitaminLogs } from '@/hooks/use-vitamin-logs'
import { useGrowthLogs } from '@/hooks/use-growth-logs'
import { useBabyProfile } from '@/hooks/use-baby-profile'
import { cn } from '@/lib/utils'
import { calculateAge } from '@/lib/time'
import { getSyncEngine, type SyncStatus } from '@/lib/sync-engine'
import { PasscodeScreen } from '@/components/passcode-screen'
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

const APP_VERSION = 'v1.7.0 - Sync Engine'

type Tab = 'today' | 'timeline' | 'growth'

export function TrackerApp() {
  const api = useLogs()
  const vitaminApi = useVitaminLogs()
  const growthApi = useGrowthLogs()
  const babyProfile = useBabyProfile()
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(() => new Date())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showPasscode, setShowPasscode] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const syncEngine = getSyncEngine()

  useEffect(() => {
    // Check if passcode is set
    if (!syncEngine.hasPasscode()) {
      setShowPasscode(true)
    }

    // Start periodic sync
    syncEngine.startPeriodicSync()

    // Update sync status periodically
    const updateStatus = () => {
      setSyncStatus(syncEngine.getStatus())
      setSyncError(null)
    }

    updateStatus()
    const statusInterval = setInterval(updateStatus, 5000)

    return () => {
      syncEngine.stopPeriodicSync()
      clearInterval(statusInterval)
    }
  }, [syncEngine])

  const handleSyncNow = async () => {
    setIsSyncing(true)
    setSyncError(null)
    const result = await syncEngine.sync()
    setIsSyncing(false)
    setSyncStatus(syncEngine.getStatus())
    if (!result.success) {
      setSyncError(result.error || 'Sync failed')
    }
  }

  const ageDisplay = babyProfile.profile?.date_of_birth
    ? `Baby ${babyProfile.profile.name || '—'} • ${calculateAge(babyProfile.profile.date_of_birth)}`
    : 'Baby Tracker'

  const getSyncBadge = () => {
    if (syncError) {
      return (
        <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive" title={syncError}>
          <CloudOff className="size-3" aria-hidden />
          Sync error
        </div>
      )
    }

    if (isSyncing) {
      return (
        <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-600">
          <RefreshCw className="size-3 animate-spin" aria-hidden />
          Syncing…
        </div>
      )
    }

    switch (syncStatus) {
      case 'offline':
        return (
          <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground" title="Offline, saved on this phone">
            <CloudOff className="size-3" aria-hidden />
            Offline
          </div>
        )
      case 'pending':
        const pendingCount = syncEngine.getPendingCount()
        return (
          <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-600" title={`${pendingCount} changes waiting to sync`}>
            <Cloud className="size-3" aria-hidden />
            {pendingCount} waiting
          </div>
        )
      case 'synced':
        const lastSync = syncEngine.getLastSyncTime()
        const timeAgo = lastSync ? `Synced ${new Date(lastSync).toLocaleTimeString()}` : 'All synced'
        return (
          <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-600" title={timeAgo}>
            <Cloud className="size-3" aria-hidden />
            Synced
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      {showPasscode && <PasscodeScreen onComplete={() => setShowPasscode(false)} />}

      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Baby className="size-5 text-sleep" aria-hidden />
            <h1 className="text-lg font-semibold">{ageDisplay}</h1>
          </div>
          {getSyncBadge()}
        </div>
        <div className="flex items-center gap-2">
          {syncEngine.hasPasscode() && (
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing}
              aria-label="Sync now"
              className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn('size-5', isSyncing && 'animate-spin')} aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"
          >
            <Settings className="size-5" aria-hidden />
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 pb-32">

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
