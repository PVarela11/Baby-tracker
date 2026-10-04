import { getSupabaseAdmin, notConfigured } from '@/lib/supabase/admin'
import { parseNewLog } from '@/lib/types'

const COLUMNS = 'id,event_type,start_time,end_time,breast_side,diaper_type,notes,created_at'

export async function GET() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('logs')
    .select(COLUMNS)
    .or(`start_time.gte.${since},end_time.is.null`)
    .order('start_time', { ascending: false })
    .limit(5000)

  if (error) return Response.json({ error: 'Failed to load logs' }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  let log
  try {
    log = parseNewLog(await request.json())
  } catch {
    return Response.json({ error: 'Invalid log' }, { status: 400 })
  }

  const { data, error } = await supabase.from('logs').insert(log).select(COLUMNS).single()
  if (error) return Response.json({ error: 'Failed to save log' }, { status: 500 })
  return Response.json(data, { status: 201 })
}

export async function DELETE() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  const { error } = await supabase.from('logs').delete().not('id', 'is', null)
  if (error) return Response.json({ error: 'Failed to clear logs' }, { status: 500 })
  return new Response(null, { status: 204 })
}
