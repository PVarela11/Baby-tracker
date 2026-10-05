import { getSupabaseAdmin, notConfigured } from '@/lib/supabase/admin'
import { parseNewVitaminLog } from '@/lib/types'

const COLUMNS = 'id,given_date,given_time,notes,created_at'

export async function GET() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('vitamin_logs')
    .select(COLUMNS)
    .gte('given_date', since.split('T')[0])
    .order('given_date', { ascending: false })
    .limit(1000)

  if (error) return Response.json({ error: 'Failed to load vitamin logs' }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  let log
  try {
    log = parseNewVitaminLog(await request.json())
  } catch {
    return Response.json({ error: 'Invalid vitamin log' }, { status: 400 })
  }

  const { data, error } = await supabase.from('vitamin_logs').insert(log).select(COLUMNS).single()
  if (error) return Response.json({ error: 'Failed to save vitamin log' }, { status: 500 })
  return Response.json(data, { status: 201 })
}

export async function DELETE() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  const { error } = await supabase.from('vitamin_logs').delete().not('id', 'is', null)
  if (error) return Response.json({ error: 'Failed to clear vitamin logs' }, { status: 500 })
  return new Response(null, { status: 204 })
}
