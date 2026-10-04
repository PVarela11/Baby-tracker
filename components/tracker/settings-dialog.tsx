'use client'

import { useEffect, useRef, useState } from 'react'
import { Cloud, Database, HardDrive, Trash2, X } from 'lucide-react'
import type { LogsApi } from '@/hooks/use-logs'
import { cn } from '@/lib/utils'

const THEME_KEY = 'baby-tracker:theme'

export function SettingsDialog({ open, onClose, api }: { open: boolean; onClose: () => void; api: LogsApi }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [oled, setOled] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [busy, setBusy] = useState<'sample' | 'clear' | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setOled(document.documentElement.classList.contains('oled'))
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  function toggleOled() {
    const next = !oled
    setOled(next)
    document.documentElement.classList.toggle('oled', next)
    localStorage.setItem(THEME_KEY, next ? 'oled' : 'dark')
  }

  async function loadSample() {
    setBusy('sample')
    setMessage('')
    try {
      await api.loadSample()
      setMessage('Loaded 7 days of sample data.')
    } catch {
      setMessage('Could not load sample data.')
    } finally {
      setBusy(null)
    }
  }

  async function clearAll() {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    setBusy('clear')
    setMessage('')
    try {
      await api.clearAll()
      setMessage('All data cleared.')
    } catch {
      setMessage('Could not clear data.')
    } finally {
      setBusy(null)
      setConfirmClear(false)
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={() => {
        setConfirmClear(false)
        setMessage('')
        onClose()
      }}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="settings-title"
      className="m-0 mt-auto w-full max-w-none rounded-t-3xl border bg-popover p-0 text-popover-foreground backdrop:bg-black/70 sm:m-auto sm:max-w-md sm:rounded-3xl"
    >
      <div className="flex flex-col gap-5 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <h2 id="settings-title" className="text-lg font-semibold">
            Settings
          </h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close settings"
            className="flex size-10 items-center justify-center rounded-xl bg-secondary"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3 text-sm">
          {api.backend === 'cloud' ? (
            <Cloud className="size-5 text-diaper" aria-hidden />
          ) : (
            <HardDrive className="size-5 text-feed" aria-hidden />
          )}
          <div className="flex flex-col">
            <span className="font-medium">
              {api.backend === 'cloud' ? 'Synced to cloud' : 'Saved on this device'}
            </span>
            <span className="text-xs text-muted-foreground">
              {api.backend === 'cloud'
                ? 'Logs are stored in Supabase.'
                : 'Supabase is not configured, so logs are stored in this browser.'}
            </span>
          </div>
        </div>

        <label className="flex items-center justify-between gap-3">
          <span className="flex flex-col">
            <span className="font-medium">Ultra-dim OLED mode</span>
            <span className="text-xs text-muted-foreground">Pure black background for night feeds.</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={oled}
            onClick={toggleOled}
            className={cn(
              'relative h-8 w-14 shrink-0 rounded-full transition-colors',
              oled ? 'bg-sleep' : 'bg-secondary',
            )}
          >
            <span
              className={cn(
                'absolute top-1 size-6 rounded-full bg-foreground transition-all',
                oled ? 'left-7' : 'left-1',
              )}
            />
          </button>
        </label>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={loadSample}
            disabled={busy !== null}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-secondary font-medium disabled:opacity-60"
          >
            <Database className="size-5" aria-hidden />
            {busy === 'sample' ? 'Loading…' : 'Load sample data'}
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={busy !== null}
            className={cn(
              'flex h-14 items-center justify-center gap-2 rounded-2xl font-medium disabled:opacity-60',
              confirmClear ? 'bg-destructive text-background' : 'bg-destructive/15 text-destructive',
            )}
          >
            <Trash2 className="size-5" aria-hidden />
            {busy === 'clear' ? 'Clearing…' : confirmClear ? 'Tap again to delete everything' : 'Clear all data'}
          </button>
          <p aria-live="polite" className="min-h-5 text-center text-sm text-muted-foreground">
            {message}
          </p>
        </div>
      </div>
    </dialog>
  )
}
