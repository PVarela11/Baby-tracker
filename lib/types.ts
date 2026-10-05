export type EventType = 'feed' | 'sleep' | 'diaper'
export type BreastSide = 'left' | 'right'
export type DiaperType = 'wet' | 'dirty' | 'both'
export type Gender = 'male' | 'female' | 'other'

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

export interface VitaminLog {
  id: string
  given_date: string
  given_time: string
  notes: string | null
  created_at: string
}

export type NewVitaminLog = Omit<VitaminLog, 'id' | 'created_at'>
export type VitaminLogPatch = Partial<Pick<VitaminLog, 'given_date' | 'given_time' | 'notes'>>

export interface GrowthLog {
  id: string
  log_date: string
  weight_kg: number | null
  height_cm: number | null
  head_circumference_cm: number | null
  notes: string | null
  created_at: string
}

export type NewGrowthLog = Omit<GrowthLog, 'id' | 'created_at'>
export type GrowthLogPatch = Partial<Pick<GrowthLog, 'log_date' | 'weight_kg' | 'height_cm' | 'head_circumference_cm' | 'notes'>>

export interface BabyProfile {
  name: string | null
  date_of_birth: string | null
  gender: Gender | null
}

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

function optionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const num = Number.parseFloat(value)
    if (Number.isFinite(num)) return num
  }
  throw new Error('Invalid number')
}

export function parseNewVitaminLog(input: unknown): NewVitaminLog {
  if (!input || typeof input !== 'object') throw new Error('Invalid body')
  const body = input as Record<string, unknown>
  if (!isIsoDate(body.given_date)) throw new Error('Invalid given_date')
  if (!isIsoDate(body.given_time)) throw new Error('Invalid given_time')
  return {
    given_date: new Date(body.given_date).toISOString().split('T')[0],
    given_time: new Date(body.given_time).toISOString(),
    notes: optionalNotes(body.notes) ?? null,
  }
}

export function parseVitaminLogPatch(input: unknown): VitaminLogPatch {
  if (!input || typeof input !== 'object') throw new Error('Invalid body')
  const body = input as Record<string, unknown>
  const patch: VitaminLogPatch = {}
  if (body.given_date !== undefined) {
    if (isIsoDate(body.given_date)) {
      patch.given_date = new Date(body.given_date).toISOString().split('T')[0]
    } else {
      throw new Error('Invalid given_date')
    }
  }
  if (body.given_time !== undefined) {
    if (isIsoDate(body.given_time)) {
      patch.given_time = new Date(body.given_time).toISOString()
    } else {
      throw new Error('Invalid given_time')
    }
  }
  const notes = optionalNotes(body.notes)
  if (notes !== undefined) patch.notes = notes
  return patch
}

export function parseNewGrowthLog(input: unknown): NewGrowthLog {
  if (!input || typeof input !== 'object') throw new Error('Invalid body')
  const body = input as Record<string, unknown>
  if (!isIsoDate(body.log_date)) throw new Error('Invalid log_date')
  return {
    log_date: new Date(body.log_date).toISOString().split('T')[0],
    weight_kg: optionalNumber(body.weight_kg) ?? null,
    height_cm: optionalNumber(body.height_cm) ?? null,
    head_circumference_cm: optionalNumber(body.head_circumference_cm) ?? null,
    notes: optionalNotes(body.notes) ?? null,
  }
}

export function parseGrowthLogPatch(input: unknown): GrowthLogPatch {
  if (!input || typeof input !== 'object') throw new Error('Invalid body')
  const body = input as Record<string, unknown>
  const patch: GrowthLogPatch = {}
  if (body.log_date !== undefined) {
    if (isIsoDate(body.log_date)) {
      patch.log_date = new Date(body.log_date).toISOString().split('T')[0]
    } else {
      throw new Error('Invalid log_date')
    }
  }
  const weight = optionalNumber(body.weight_kg)
  if (weight !== undefined) patch.weight_kg = weight
  const height = optionalNumber(body.height_cm)
  if (height !== undefined) patch.height_cm = height
  const head = optionalNumber(body.head_circumference_cm)
  if (head !== undefined) patch.head_circumference_cm = head
  const notes = optionalNotes(body.notes)
  if (notes !== undefined) patch.notes = notes
  return patch
}

export function parseBabyProfile(input: unknown): BabyProfile {
  if (!input || typeof input !== 'object') throw new Error('Invalid body')
  const body = input as Record<string, unknown>
  const GENDERS: Gender[] = ['male', 'female', 'other']
  return {
    name: typeof body.name === 'string' ? body.name.slice(0, 100) : null,
    date_of_birth: isIsoDate(body.date_of_birth) ? new Date(body.date_of_birth).toISOString() : null,
    gender: optionalEnum(body.gender, GENDERS) ?? null,
  }
}
