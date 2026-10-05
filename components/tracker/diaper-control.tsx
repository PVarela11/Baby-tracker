'use client'

import { useEffect, useState } from 'react'
import { Check, Droplets, PencilLine, X } from 'lucide-react'
import type { LogsApi } from '@/hooks/use-logs'
import type { DiaperType } from '@/lib/types'
import { cn } from '@/lib/utils'

const OPTIONS: { value: DiaperType; label: string }[] = [
  { value: 'wet', label: 'Wet' },
  { value: 'dirty', label: 'Dirty' },
  { value: 'both', label: 'Both' },
]

export function DiaperControl({ api }: { api: LogsApi }) {
  const [saved, setSaved] = useState<DiaperType | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [pastDate, setPastDate] = useState(() => new Date().toISOString().split('T')[0])
  const [pastTime, setPastTime] = useState('')
  const [selectedType, setSelectedType] = useState<DiaperType | null>(null)

  useEffect(() => {
    if (!saved) return
    const id = setTimeout(() => setSaved(null), 1800)
    return () => clearTimeout(id)
  }, [saved])

  async function log(type: DiaperType) {
    await api.createLog({
      event_type: 'diaper',
      start_time: new Date().toISOString(),
      end_time: null,
      breast_side: null,
      diaper_type: type,
      notes: null,
    })
    setSaved(type)
  }

  function savePastLog(e: React.FormEvent) {
    e.preventDefault()
    if (!pastDate || !pastTime || !selectedType) return

    const dateTime = new Date(`${pastDate}T${pastTime}`)
    if (isNaN(dateTime.getTime())) return

    api.createLog({
      event_type: 'diaper',
      start_time: dateTime.toISOString(),
      end_time: null,
      breast_side: null,
      diaper_type: selectedType,
      notes: null,
    }).then(() => {
      setManualOpen(false)
      setPastDate(new Date().toISOString().split('T')[0])
      setPastTime('')
      setSelectedType(null)
    })
  }

  function openPastLogModal() {
    setPastDate(new Date().toISOString().split('T')[0])
    setPastTime('')
    setSelectedType(null)
    setManualOpen(true)
  }

  return (
    <section aria-labelledby="diaper-heading" className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
      <h2 id="diaper-heading" className="flex items-center gap-2 text-sm font-semibold text-diaper">
        <Droplets className="size-4" aria-hidden />
        Diaper
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => log(o.value)}
            aria-label={`Log ${o.label.toLowerCase()} diaper`}
            className={cn(
              'flex h-20 items-center justify-center gap-2 rounded-2xl text-lg font-semibold transition-colors',
              saved === o.value ? 'bg-diaper text-background' : 'bg-diaper/15 text-diaper',
            )}
          >
            {saved === o.value && <Check className="size-5" aria-hidden />}
            {o.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={openPastLogModal}
        className="flex items-center justify-center gap-2 py-1 text-sm text-muted-foreground"
      >
        <PencilLine className="size-4" aria-hidden />
        Log a past diaper manually
      </button>
      <p aria-live="polite" className="sr-only">
        {saved ? `${saved} diaper logged` : ''}
      </p>

      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl border bg-card p-5 sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Log Past Diaper</h3>
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="flex size-10 items-center justify-center rounded-xl bg-secondary"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <form onSubmit={savePastLog} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Date
                <input
                  type="date"
                  value={pastDate}
                  onChange={(e) => setPastDate(e.target.value)}
                  className="h-12 rounded-xl border bg-secondary px-3 text-base text-foreground"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Time
                <input
                  type="time"
                  value={pastTime}
                  onChange={(e) => setPastTime(e.target.value)}
                  className="h-12 rounded-xl border bg-secondary px-3 font-mono text-base text-foreground"
                  required
                />
              </label>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Type</span>
                <div className="grid grid-cols-3 gap-2">
                  {OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setSelectedType(o.value)}
                      className={cn(
                        'h-12 rounded-xl border text-base font-medium transition-colors',
                        selectedType === o.value
                          ? 'border-diaper bg-diaper/20 text-diaper'
                          : 'bg-secondary text-secondary-foreground',
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={!selectedType}
                className="h-12 rounded-xl bg-diaper px-5 font-semibold text-background disabled:opacity-60"
              >
                Save
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
