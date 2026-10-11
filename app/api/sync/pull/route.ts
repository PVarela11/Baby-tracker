import { getSupabaseAdmin, notConfigured } from '@/lib/supabase/admin'
import { checkSyncPasscode } from '@/lib/sync-auth'

interface PullBody {
  logs_cursor?: string
  vitamin_logs_cursor?: string
  growth_logs_cursor?: string
  baby_profile_cursor?: string
}

interface PullResponse {
  logs?: any[]
  logs_cursor?: string
  vitamin_logs?: any[]
  vitamin_logs_cursor?: string
  growth_logs?: any[]
  growth_logs_cursor?: string
  baby_profile?: any
  baby_profile_cursor?: string
}

const BATCH_SIZE = 100

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  if (!checkSyncPasscode(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: PullBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const response: PullResponse = {}

  // Pull logs
  let logsQuery = supabase
    .from('logs')
    .select('*')
    .order('server_updated_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (body.logs_cursor) {
    logsQuery = logsQuery.gt('server_updated_at', body.logs_cursor)
  }

  const { data: logs, error: logsError } = await logsQuery
  if (logsError) {
    console.error('Pull logs error:', logsError)
    return Response.json({ error: 'Failed to pull logs' }, { status: 500 })
  }

  if (logs && logs.length > 0) {
    response.logs = logs
    response.logs_cursor = logs[logs.length - 1].server_updated_at
  }

  // Pull vitamin_logs
  let vitaminQuery = supabase
    .from('vitamin_logs')
    .select('*')
    .order('server_updated_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (body.vitamin_logs_cursor) {
    vitaminQuery = vitaminQuery.gt('server_updated_at', body.vitamin_logs_cursor)
  }

  const { data: vitaminLogs, error: vitaminError } = await vitaminQuery
  if (vitaminError) {
    console.error('Pull vitamin_logs error:', vitaminError)
    return Response.json({ error: 'Failed to pull vitamin logs' }, { status: 500 })
  }

  if (vitaminLogs && vitaminLogs.length > 0) {
    response.vitamin_logs = vitaminLogs
    response.vitamin_logs_cursor = vitaminLogs[vitaminLogs.length - 1].server_updated_at
  }

  // Pull growth_logs
  let growthQuery = supabase
    .from('growth_logs')
    .select('*')
    .order('server_updated_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (body.growth_logs_cursor) {
    growthQuery = growthQuery.gt('server_updated_at', body.growth_logs_cursor)
  }

  const { data: growthLogs, error: growthError } = await growthQuery
  if (growthError) {
    console.error('Pull growth_logs error:', growthError)
    return Response.json({ error: 'Failed to pull growth logs' }, { status: 500 })
  }

  if (growthLogs && growthLogs.length > 0) {
    response.growth_logs = growthLogs
    response.growth_logs_cursor = growthLogs[growthLogs.length - 1].server_updated_at
  }

  // Pull baby_profile (single row)
  let profileQuery = supabase
    .from('baby_profile')
    .select('*')
    .order('server_updated_at', { ascending: true })
    .limit(1)

  if (body.baby_profile_cursor) {
    profileQuery = profileQuery.gt('server_updated_at', body.baby_profile_cursor)
  }

  const { data: profile, error: profileError } = await profileQuery
  if (profileError && profileError.code !== 'PGRST116') {
    console.error('Pull baby_profile error:', profileError)
    return Response.json({ error: 'Failed to pull baby profile' }, { status: 500 })
  }

  if (profile && profile.length > 0) {
    response.baby_profile = profile[0]
    response.baby_profile_cursor = profile[0].server_updated_at
  }

  return Response.json(response)
}
