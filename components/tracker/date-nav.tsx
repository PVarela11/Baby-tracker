'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, formatDayLabel, isSameDay } from '@/lib/time'

export function DateNav({ date, onChange }: { date: Date; onChange: (date: Date) => void }) {
  const today = new Date()
  const isToday = isSameDay(date, today)

  return (
    <nav aria-label="Select date" className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(addDays(date, -1))}
        aria-label="Previous day"
        className="flex size-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <div className="flex flex-1 flex-col items-center">
        <span className="text-base font-semibold">{formatDayLabel(date, today)}</span>
        <span className="text-xs text-muted-foreground">
          {date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
        </span>
      </div>
      {!isToday && (
        <button
          type="button"
          onClick={() => onChange(new Date())}
          className="h-12 rounded-xl bg-secondary px-3 text-sm font-medium text-secondary-foreground"
        >
          Today
        </button>
      )}
      <button
        type="button"
        onClick={() => onChange(addDays(date, 1))}
        disabled={isToday}
        aria-label="Next day"
        className="flex size-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground disabled:opacity-30"
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </nav>
  )
}
