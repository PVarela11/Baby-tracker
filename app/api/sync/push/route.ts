import { getSupabaseAdmin, notConfigured } from '@/lib/supabase/admin'
import { checkSyncPasscode } from '@/lib/sync-auth'

interface PushBody {
  logs?: any[]
  vitamin_logs?: any[]
  growth_logs?: any[]
  baby_profile?: any
}

interface PushResponse {
  logs?: { applied: string[]; failed: { id: string; error: string }[] }
  vitamin_logs?: { applied: string[]; failed: { id: string; error: string }[] }
  growth_logs?: { applied: string[]; failed: { id: string; error: string }[] }
  baby_profile?: { applied: boolean; error?: string }
}

function ensureNull(value: any): any {
  if (value === '' || value === null || value === undefined) {
    return null
  }
  return value
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  if (!checkSyncPasscode(request)) {
    console.error('Sync push failed: Unauthorized (wrong or missing passcode)')
    return Response.json({ error: 'Unauthorized', detail: 'Invalid or missing passcode' }, { status: 401 })
  }

  let body: PushBody
  try {
    body = await request.json()
  } catch (error) {
    console.error('Sync push failed: Invalid JSON body', error)
    return Response.json({ error: 'Invalid JSON', detail: 'Request body must be valid JSON' }, { status: 400 })
  }

  const response: PushResponse = {}

  // Handle logs upsert
  if (body.logs && body.logs.length > 0) {
    const applied: string[] = []
    const failed: { id: string; error: string }[] = []
    
    for (const log of body.logs) {
      const { error } = await supabase.rpc('upsert_log', {
        p_id: log.id,
        p_event_type: log.event_type,
        p_start_time: log.start_time,
        p_end_time: ensureNull(log.end_time),
        p_breast_side: ensureNull(log.breast_side),
        p_diaper_type: ensureNull(log.diaper_type),
        p_notes: ensureNull(log.notes),
        p_created_at: log.created_at,
        p_updated_at: log.updated_at,
        p_deleted_at: ensureNull(log.deleted_at),
        p_device_id: log.device_id,
        p_user_id: ensureNull(log.user_id),
      })
      
      if (error) {
        console.error('upsert_log Supabase error:', error)
        failed.push({ id: log.id, error: error.message })
      } else {
        applied.push(log.id)
      }
    }
    response.logs = { applied, failed }
  }

  // Handle vitamin_logs upsert
  if (body.vitamin_logs && body.vitamin_logs.length > 0) {
    const applied: string[] = []
    const failed: { id: string; error: string }[] = []
    
    for (const log of body.vitamin_logs) {
      const { error } = await supabase.rpc('upsert_vitamin_log', {
        p_id: log.id,
        p_given_date: log.given_date,
        p_given_time: log.given_time,
        p_notes: ensureNull(log.notes),
        p_created_at: log.created_at,
        p_updated_at: log.updated_at,
        p_deleted_at: ensureNull(log.deleted_at),
        p_device_id: log.device_id,
        p_user_id: ensureNull(log.user_id),
      })
      
      if (error) {
        console.error('upsert_vitamin_log Supabase error:', error)
        failed.push({ id: log.id, error: error.message })
      } else {
        applied.push(log.id)
      }
    }
    response.vitamin_logs = { applied, failed }
  }

  // Handle growth_logs upsert
  if (body.growth_logs && body.growth_logs.length > 0) {
    const applied: string[] = []
    const failed: { id: string; error: string }[] = []
    
    for (const log of body.growth_logs) {
      const { error } = await supabase.rpc('upsert_growth_log', {
        p_id: log.id,
        p_log_date: log.log_date,
        p_weight_kg: ensureNull(log.weight_kg),
        p_height_cm: ensureNull(log.height_cm),
        p_head_circumference_cm: ensureNull(log.head_circumference_cm),
        p_notes: ensureNull(log.notes),
        p_created_at: log.created_at,
        p_updated_at: log.updated_at,
        p_deleted_at: ensureNull(log.deleted_at),
        p_device_id: log.device_id,
        p_user_id: ensureNull(log.user_id),
      })
      
      if (error) {
        console.error('upsert_growth_log Supabase error:', error)
        failed.push({ id: log.id, error: error.message })
      } else {
        applied.push(log.id)
      }
    }
    response.growth_logs = { applied, failed }
  }

  // Handle baby_profile upsert
  if (body.baby_profile) {
    const { error } = await supabase.rpc('upsert_baby_profile', {
      p_id: body.baby_profile.id,
      p_name: ensureNull(body.baby_profile.name),
      p_date_of_birth: ensureNull(body.baby_profile.date_of_birth),
      p_gender: ensureNull(body.baby_profile.gender),
      p_updated_at: body.baby_profile.updated_at,
      p_deleted_at: ensureNull(body.baby_profile.deleted_at),
      p_device_id: body.baby_profile.device_id,
      p_user_id: ensureNull(body.baby_profile.user_id),
    })
    
    if (error) {
      console.error('upsert_baby_profile Supabase error:', error)
      response.baby_profile = { applied: false, error: error.message }
    } else {
      response.baby_profile = { applied: true }
    }
  }

  return Response.json(response)
}
