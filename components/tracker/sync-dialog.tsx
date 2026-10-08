'use client'

import { Wifi, Cloud, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SyncDialogProps {
  open: boolean
  pendingCount: number
  onSync: () => void
  onKeepLocal: () => void
}

export function SyncDialog({ open, pendingCount, onSync, onKeepLocal }: SyncDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl border bg-card p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-green-500/20 text-green-600">
              <Wifi className="size-5" aria-hidden />
            </div>
            <h3 className="text-lg font-semibold">Internet Restored</h3>
          </div>
          <button
            type="button"
            onClick={onKeepLocal}
            className="flex size-10 items-center justify-center rounded-xl bg-secondary"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          You have <span className="font-semibold text-foreground">{pendingCount}</span> offline log{pendingCount !== 1 ? 's' : ''} recorded{' '}
          while offline. Would you like to sync them to the cloud now?
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSync}
            className="flex flex-1 items-center justify-center gap-2 h-12 rounded-xl bg-green-600 px-5 font-semibold text-background transition-colors hover:bg-green-700"
          >
            <Cloud className="size-4" aria-hidden />
            Sync to Cloud
          </button>
          <button
            type="button"
            onClick={onKeepLocal}
            className="flex-1 h-12 rounded-xl bg-secondary px-5 font-semibold text-foreground transition-colors hover:bg-secondary/80"
          >
            Keep Local Only
          </button>
        </div>
      </div>
    </div>
  )
}
