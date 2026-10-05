import type { Log } from './types'

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

export function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

export function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / MINUTE))
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

export function formatStopwatch(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export function formatClock(iso: string | number | Date) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatDayLabel(date: Date, today: Date) {
  if (isSameDay(date, today)) return 'Today'
  if (isSameDay(date, addDays(today, -1))) return 'Yesterday'
  if (isSameDay(date, addDays(today, 1))) return 'Tomorrow'
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function logEnd(log: Log, now: number) {
  return log.end_time ? Date.parse(log.end_time) : now
}

export function overlapMs(log: Log, rangeStart: number, rangeEnd: number, now: number) {
  const start = Math.max(Date.parse(log.start_time), rangeStart)
  const end = Math.min(logEnd(log, now), rangeEnd)
  return Math.max(0, end - start)
}

export function logsForDay(logs: Log[], day: Date, now: number) {
  const dayStart = startOfDay(day).getTime()
  const dayEnd = dayStart + DAY
  return logs.filter((log) => {
    const start = Date.parse(log.start_time)
    const end = log.event_type === 'diaper' ? start : logEnd(log, now)
    return start < dayEnd && end >= dayStart
  })
}

export function calculateAge(dateOfBirth: string | null): string {
  if (!dateOfBirth) return '—'
  const birth = new Date(dateOfBirth)
  const now = new Date()
  const diffTime = now.getTime() - birth.getTime()
  const diffDays = Math.floor(diffTime / DAY)

  if (diffDays < 0) return '—'
  if (diffDays === 0) return 'Newborn today'
  if (diffDays === 1) return '1 day old'

  const weeks = Math.floor(diffDays / 7)
  const days = diffDays % 7

  if (weeks === 0) return `${diffDays} days old`
  if (weeks === 1) return `1 week, ${days} day${days === 1 ? '' : 's'} old`
  if (weeks < 4) return `${weeks} weeks, ${days} day${days === 1 ? '' : 's'} old`

  const months = Math.floor(diffDays / 30.44)
  const remainingDays = Math.floor(diffDays % 30.44)

  if (months === 1) return `1 month, ${remainingDays} day${remainingDays === 1 ? '' : 's'} old`
  if (months < 12) return `${months} months, ${remainingDays} day${remainingDays === 1 ? '' : 's'} old`

  const years = Math.floor(diffDays / 365.25)
  const remainingMonths = Math.floor((diffDays % 365.25) / 30.44)

  if (years === 1) return `1 year, ${remainingMonths} month${remainingMonths === 1 ? '' : 's'} old`
  return `${years} years, ${remainingMonths} month${remainingMonths === 1 ? '' : 's'} old`
}

