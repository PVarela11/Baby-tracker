import { getSupabaseAdmin, notConfigured } from '@/lib/supabase/admin'
import { parseNewGrowthLog } from '@/lib/types'

const COLUMNS = 'id,log_date,weight_kg,height_cm,head_circumference_cm,notes,created_at'

export async function GET() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  const { data, error } = await supabase
    .from('growth_logs')
    .select(COLUMNS)
    .order('log_date', { ascending: false })
    .limit(1000)

  if (error) return Response.json({ error: 'Failed to load growth logs' }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  let log
  try {
    log = parseNewGrowthLog(await request.json())
  } catch {
    return Response.json({ error: 'Invalid growth log' }, { status: 400 })
  }

  const { data, error } = await supabase.from('growth_logs').insert(log).select(COLUMNS).single()
  if (error) return Response.json({ error: 'Failed to save growth log' }, { status: 500 })
  return Response.json(data, { status: 201 })
}

export async function DELETE() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  const { error } = await supabase.from('growth_logs').delete().not('id', 'is', null)
  if (error) return Response.json({ error: 'Failed to clear growth logs' }, { status: 500 })
  return new Response(null, { status: 204 })
}
