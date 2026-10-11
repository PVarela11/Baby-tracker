import { getSupabaseAdmin, notConfigured } from '@/lib/supabase/admin'
import { checkSyncPasscode } from '@/lib/sync-auth'

interface PushBody {
  logs?: any[]
  vitamin_logs?: any[]
  growth_logs?: any[]
  baby_profile?: any
}

interface PushResponse {
  logs?: any[]
  vitamin_logs?: any[]
  growth_logs?: any[]
  baby_profile?: any
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  if (!checkSyncPasscode(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: PushBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const response: PushResponse = {}

  // Handle logs upsert
  if (body.logs && body.logs.length > 0) {
    const results = []
    for (const log of body.logs) {
      const { data, error } = await supabase.rpc('upsert_log', {
        p_id: log.id,
        p_event_type: log.event_type,
        p_start_time: log.start_time,
        p_end_time: log.end_time,
        p_breast_side: log.breast_side,
        p_diaper_type: log.diaper_type,
        p_notes: log.notes,
        p_created_at: log.created_at,
        p_updated_at: log.updated_at,
        p_deleted_at: log.deleted_at,
        p_device_id: log.device_id,
        p_user_id: log.user_id,
      })
      if (error) {
        console.error('upsert_log error:', error)
        return Response.json({ error: 'Failed to upsert log' }, { status: 500 })
      }
      if (data && data.length > 0) {
        results.push(data[0])
      }
    }
    response.logs = results
  }

  // Handle vitamin_logs upsert
  if (body.vitamin_logs && body.vitamin_logs.length > 0) {
    const results = []
    for (const log of body.vitamin_logs) {
      const { data, error } = await supabase.rpc('upsert_vitamin_log', {
        p_id: log.id,
        p_given_date: log.given_date,
        p_given_time: log.given_time,
        p_notes: log.notes,
        p_created_at: log.created_at,
        p_updated_at: log.updated_at,
        p_deleted_at: log.deleted_at,
        p_device_id: log.device_id,
        p_user_id: log.user_id,
      })
      if (error) {
        console.error('upsert_vitamin_log error:', error)
        return Response.json({ error: 'Failed to upsert vitamin log' }, { status: 500 })
      }
      if (data && data.length > 0) {
        results.push(data[0])
      }
    }
    response.vitamin_logs = results
  }

  // Handle growth_logs upsert
  if (body.growth_logs && body.growth_logs.length > 0) {
    const results = []
    for (const log of body.growth_logs) {
      const { data, error } = await supabase.rpc('upsert_growth_log', {
        p_id: log.id,
        p_log_date: log.log_date,
        p_weight_kg: log.weight_kg,
        p_height_cm: log.height_cm,
        p_head_circumference_cm: log.head_circumference_cm,
        p_notes: log.notes,
        p_created_at: log.created_at,
        p_updated_at: log.updated_at,
        p_deleted_at: log.deleted_at,
        p_device_id: log.device_id,
        p_user_id: log.user_id,
      })
      if (error) {
        console.error('upsert_growth_log error:', error)
        return Response.json({ error: 'Failed to upsert growth log' }, { status: 500 })
      }
      if (data && data.length > 0) {
        results.push(data[0])
      }
    }
    response.growth_logs = results
  }

  // Handle baby_profile upsert
  if (body.baby_profile) {
    const { data, error } = await supabase.rpc('upsert_baby_profile', {
      p_id: body.baby_profile.id,
      p_name: body.baby_profile.name,
      p_date_of_birth: body.baby_profile.date_of_birth,
      p_gender: body.baby_profile.gender,
      p_updated_at: body.baby_profile.updated_at,
      p_deleted_at: body.baby_profile.deleted_at,
      p_device_id: body.baby_profile.device_id,
      p_user_id: body.baby_profile.user_id,
    })
    if (error) {
      console.error('upsert_baby_profile error:', error)
      return Response.json({ error: 'Failed to upsert baby profile' }, { status: 500 })
    }
    if (data && data.length > 0) {
      response.baby_profile = data[0]
    }
  }

  return Response.json(response)
}
