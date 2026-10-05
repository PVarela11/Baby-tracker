export type EventType = 'feed' | 'sleep' | 'diaper'
export type BreastSide = 'left' | 'right'
export type DiaperType = 'wet' | 'dirty' | 'both'

export interface Log {
  id: string
  event_type: EventType
  start_time: string
  end_time: string | null
  breast_side: BreastSide | null
  diaper_type: DiaperType | null
  notes: string | null
  created_at: string
}

export type NewLog = Omit<Log, 'id' | 'created_at'>
export type LogPatch = Partial<Pick<Log, 'start_time' | 'end_time' | 'breast_side' | 'diaper_type' | 'notes'>>

const EVENT_TYPES: EventType[] = ['feed', 'sleep', 'diaper']
const SIDES: BreastSide[] = ['left', 'right']
const DIAPERS: DiaperType[] = ['wet', 'dirty', 'both']

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function optionalEnum<T extends string>(value: unknown, allowed: T[]): T | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value === 'string' && (allowed as string[]).includes(value)) return value as T
  throw new Error('Invalid enum value')
}

function optionalDate(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (isIsoDate(value)) return new Date(value).toISOString()
  throw new Error('Invalid date')
}

function optionalNotes(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value === 'string') return value.slice(0, 1000)
  throw new Error('Invalid notes')
}

export function parseNewLog(input: unknown): NewLog {
  if (!input || typeof input !== 'object') throw new Error('Invalid body')
  const body = input as Record<string, unknown>
  if (!EVENT_TYPES.includes(body.event_type as EventType)) throw new Error('Invalid event_type')
  if (!isIsoDate(body.start_time)) throw new Error('Invalid start_time')
  const log: NewLog = {
    event_type: body.event_type as EventType,
    start_time: new Date(body.start_time).toISOString(),
    end_time: optionalDate(body.end_time) ?? null,
    breast_side: optionalEnum(body.breast_side, SIDES) ?? null,
    diaper_type: optionalEnum(body.diaper_type, DIAPERS) ?? null,
    notes: optionalNotes(body.notes) ?? null,
  }
  if (log.end_time && Date.parse(log.end_time) < Date.parse(log.start_time)) {
    throw new Error('end_time before start_time')
  }
  return log
}

export function parseLogPatch(input: unknown): LogPatch {
  if (!input || typeof input !== 'object') throw new Error('Invalid body')
  const body = input as Record<string, unknown>
  const patch: LogPatch = {}
  const start = optionalDate(body.start_time)
  if (start) patch.start_time = start
  const end = optionalDate(body.end_time)
  if (end !== undefined) patch.end_time = end
  const side = optionalEnum(body.breast_side, SIDES)
  if (side !== undefined) patch.breast_side = side
  const diaper = optionalEnum(body.diaper_type, DIAPERS)
  if (diaper !== undefined) patch.diaper_type = diaper
  const notes = optionalNotes(body.notes)
  if (notes !== undefined) patch.notes = notes
  return patch
}
