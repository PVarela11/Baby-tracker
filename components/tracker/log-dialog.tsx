'use client'

import { useEffect, useRef, useState } from 'react'
import { Droplets, Milk, Moon, Trash2, X } from 'lucide-react'
import type { LogsApi } from '@/hooks/use-logs'
import { DAY, MINUTE, formatDuration, fromInputs, toDateInput, toTimeInput } from '@/lib/time'
import type { BreastSide, DiaperType, EventType, Log } from '@/lib/types'
import { cn } from '@/lib/utils'

export type LogDialogTarget = { mode: 'create'; type: EventType } | { mode: 'edit'; log: Log }

const TYPES: { value: EventType; label: string; icon: typeof Milk; tone: string }[] = [
  { value: 'feed', label: 'Feed', icon: Milk, tone: 'border-feed bg-feed/20 text-feed' },
  { value: 'sleep', label: 'Sleep', icon: Moon, tone: 'border-sleep bg-sleep/20 text-sleep' },
  { value: 'diaper', label: 'Diaper', icon: Droplets, tone: 'border-diaper bg-diaper/20 text-diaper' },
]

const SIDES: { value: BreastSide; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
]

const DIAPERS: { value: DiaperType; label: string }[] = [
  { value: 'wet', label: 'Wet' },
  { value: 'dirty', label: 'Dirty' },
  { value: 'both', label: 'Both' },
]

const DEFAULT_MINUTES: Record<EventType, number> = { feed: 15, sleep: 60, diaper: 0 }

const fieldClass =
  'h-12 w-full rounded-xl border bg-secondary px-3 font-mono text-base text-foreground [color-scheme:dark]'

function initialState(target: LogDialogTarget) {
  const now = Date.now()
  if (target.mode === 'edit') {
    const { log } = target
    const start = Date.parse(log.start_time)
    const end = log.end_time ? Date.parse(log.end_time) : now
    return {
      type: log.event_type,
      side: (log.breast_side === 'right' ? 'right' : 'left') as BreastSide,
      diaper: (log.diaper_type ?? 'wet') as DiaperType,
      date: toDateInput(start),
      startTime: toTimeInput(start),
      endTime: toTimeInput(end),
      ongoing: log.event_type !== 'diaper' && !log.end_time,
      notes: log.notes ?? '',
    }
  }
  const start = now - DEFAULT_MINUTES[target.type] * MINUTE
  return {
    type: target.type,
    side: 'left' as BreastSide,
    diaper: 'wet' as DiaperType,
    date: toDateInput(start),
    startTime: toTimeInput(start),
    endTime: toTimeInput(now),
    ongoing: false,
    notes: '',
  }
}

export function LogDialog({
  target,
  api,
  onClose,
}: {
  target: LogDialogTarget
  api: LogsApi
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [form, setForm] = useState(() => initialState(target))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isEdit = target.mode === 'edit'

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const timed = form.type !== 'diaper'
  const start = fromInputs(form.date, form.startTime)
  let end = fromInputs(form.date, form.endTime)
  if (end < start) end += DAY
  const durationMinutes = Number.isFinite(end - start) ? Math.round((end - start) / MINUTE) : 0

  function setDuration(value: string) {
    const minutes = Math.round(Number(value))
    if (!Number.isFinite(minutes) || minutes < 0 || !Number.isFinite(start)) return
    set('endTime', toTimeInput(start + Math.min(minutes, 24 * 60 - 1) * MINUTE))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const now = Date.now() + MINUTE
    if (!Number.isFinite(start)) return setError('Enter a valid date and start time.')
    if (start > now) return setError("Start time can't be in the future.")
    const hasEnd = timed && !form.ongoing
    if (hasEnd && end > now) return setError("End time can't be in the future.")
    if (hasEnd && durationMinutes < 1) return setError('End time must be after the start time.')

    const payload = {
      event_type: form.type,
      start_time: new Date(start).toISOString(),
      end_time: hasEnd ? new Date(end).toISOString() : null,
      breast_side: form.type === 'feed' ? form.side : null,
      diaper_type: form.type === 'diaper' ? form.diaper : null,
      notes: form.notes.trim() || null,
    }

    setBusy(true)
    try {
      if (target.mode === 'edit') await api.updateLog(target.log.id, payload)
      else await api.createLog(payload)
      onClose()
    } catch {
      setError('Could not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (target.mode !== 'edit') return
    if (!confirmDelete) return setConfirmDelete(true)
    setBusy(true)
    try {
      await api.deleteLog(target.log.id)
      onClose()
    } catch {
      setError('Could not delete. Please try again.')
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="log-dialog-title"
      className="fixed inset-0 m-auto h-fit max-h-[92dvh] w-[min(100%-1.5rem,28rem)] overflow-y-auto rounded-3xl border bg-card p-0 text-foreground backdrop:bg-black/70"
    >
      <form onSubmit={submit} className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h2 id="log-dialog-title" className="text-lg font-semibold">
            {isEdit ? 'Edit entry' : 'Log past event'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-medium text-muted-foreground">Event type</legend>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => {
              const Icon = t.icon
              const checked = form.type === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={checked}
                  onClick={() => set('type', t.value)}
                  className={cn(
                    'flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-medium',
                    checked ? t.tone : 'bg-secondary text-secondary-foreground',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {t.label}
                </button>
              )
            })}
          </div>
        </fieldset>

        {form.type === 'feed' && (
          <Segmented
            legend="Side"
            options={SIDES}
            value={form.side}
            onChange={(v) => set('side', v)}
            tone="border-feed bg-feed/20 text-feed"
          />
        )}
        {form.type === 'diaper' && (
          <Segmented
            legend="Diaper type"
            options={DIAPERS}
            value={form.diaper}
            onChange={(v) => set('diaper', v)}
            tone="border-diaper bg-diaper/20 text-diaper"
          />
        )}

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Date
            <input
              type="date"
              required
              value={form.date}
              max={toDateInput(Date.now())}
              onChange={(e) => set('date', e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {timed ? 'Start time' : 'Time'}
            <input
              type="time"
              required
              value={form.startTime}
              onChange={(e) => set('startTime', e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>

        {timed && (
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.ongoing}
                onChange={(e) => set('ongoing', e.target.checked)}
                className="size-5 accent-primary"
              />
              Still in progress (keep timer running)
            </label>
            {!form.ongoing && (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  End time
                  <input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) => set('endTime', e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Duration (min)
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1439}
                    value={durationMinutes}
                    onChange={(e) => setDuration(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                {Number.isFinite(end) && fromInputs(form.date, form.endTime) < start && (
                  <p className="col-span-2 text-xs text-muted-foreground">
                    Ends the next day · {formatDuration(end - start)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Notes
          <textarea
            rows={2}
            maxLength={1000}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Optional"
            className="w-full rounded-xl border bg-secondary px-3 py-2 text-base text-foreground"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={busy}
            className="h-14 rounded-2xl bg-primary text-lg font-semibold text-primary-foreground disabled:opacity-60"
          >
            {isEdit ? 'Save changes' : 'Save entry'}
          </button>
          {isEdit && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className={cn(
                  'flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border text-sm font-semibold disabled:opacity-60',
                  confirmDelete
                    ? 'border-destructive bg-destructive text-white'
                    : 'border-destructive/40 text-destructive',
                )}
              >
                <Trash2 className="size-4" aria-hidden />
                {confirmDelete ? 'Confirm delete' : 'Delete entry'}
              </button>
              {confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="h-12 rounded-2xl bg-secondary px-4 text-sm font-medium text-secondary-foreground"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
          <p aria-live="polite" className="sr-only">
            {confirmDelete ? 'Press confirm delete to permanently remove this entry.' : ''}
          </p>
        </div>
      </form>
    </dialog>
  )
}

function Segmented<T extends string>({
  legend,
  options,
  value,
  onChange,
  tone,
}: {
  legend: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  tone: string
}) {
  return (
    <fieldset className="flex flex-col">
      <legend className="mb-2 text-xs font-medium text-muted-foreground">{legend}</legend>
      <div className={cn('grid gap-2', options.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-12 rounded-xl border text-base font-medium',
              value === o.value ? tone : 'bg-secondary text-secondary-foreground',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
