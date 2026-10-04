'use client'

import { useEffect, useState } from 'react'
import { Check, Droplets } from 'lucide-react'
import type { LogsApi } from '@/hooks/use-logs'
import type { DiaperType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { PastLogButton } from './past-log-button'

const OPTIONS: { value: DiaperType; label: string }[] = [
  { value: 'wet', label: 'Wet' },
  { value: 'dirty', label: 'Dirty' },
  { value: 'both', label: 'Both' },
]

export function DiaperControl({ api, onLogPast }: { api: LogsApi; onLogPast: () => void }) {
  const [saved, setSaved] = useState<DiaperType | null>(null)

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
      <PastLogButton label="Log past change" onClick={onLogPast} />
      <p aria-live="polite" className="sr-only">
        {saved ? `${saved} diaper logged` : ''}
      </p>
    </section>
  )
}
