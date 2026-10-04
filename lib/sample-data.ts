import type { BreastSide, DiaperType, NewLog } from './types'

const MINUTE = 60_000

function jitter(minutes: number) {
  return Math.round((Math.random() * 2 - 1) * minutes) * MINUTE
}

function at(day: Date, hours: number, minutes = 0) {
  const d = new Date(day)
  d.setHours(0, 0, 0, 0)
  return d.getTime() + (hours * 60 + minutes) * MINUTE
}

const SLEEP_PLAN: Array<[number, number, number]> = [
  [0, 0, 150],
  [3, 0, 200],
  [9, 0, 90],
  [12, 45, 75],
  [16, 15, 45],
  [19, 30, 210],
]

const FEED_PLAN: Array<[number, number]> = [
  [2, 40],
  [6, 30],
  [8, 30],
  [11, 30],
  [14, 30],
  [17, 30],
  [19, 0],
  [22, 45],
]

const DIAPER_PLAN: Array<[number, number, DiaperType]> = [
  [6, 45, 'wet'],
  [8, 50, 'dirty'],
  [11, 50, 'wet'],
  [14, 50, 'both'],
  [17, 50, 'wet'],
  [19, 15, 'wet'],
  [23, 5, 'dirty'],
]

export function generateSampleLogs(days = 7, now = new Date()): NewLog[] {
  const logs: NewLog[] = []
  const nowMs = now.getTime()
  const sides: BreastSide[] = ['left', 'right']
  let sideIndex = 0

  for (let offset = days - 1; offset >= 0; offset--) {
    const day = new Date(now)
    day.setDate(day.getDate() - offset)

    for (const [h, m, duration] of SLEEP_PLAN) {
      const start = at(day, h, m) + jitter(15)
      const end = start + duration * MINUTE + jitter(20)
      if (end > nowMs) continue
      logs.push({
        event_type: 'sleep',
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        breast_side: null,
        diaper_type: null,
        notes: null,
      })
    }

    for (const [h, m] of FEED_PLAN) {
      const start = at(day, h, m) + jitter(15)
      const end = start + (10 + Math.round(Math.random() * 15)) * MINUTE
      if (end > nowMs) continue
      const side = sides[sideIndex++ % 2]
      logs.push({
        event_type: 'feed',
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        breast_side: side,
        diaper_type: null,
        notes: null,
      })
    }

    for (const [h, m, type] of DIAPER_PLAN) {
      const time = at(day, h, m) + jitter(10)
      if (time > nowMs) continue
      logs.push({
        event_type: 'diaper',
        start_time: new Date(time).toISOString(),
        end_time: null,
        breast_side: null,
        diaper_type: type,
        notes: null,
      })
    }
  }

  return logs
}
