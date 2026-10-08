import { getSupabaseAdmin, notConfigured } from '@/lib/supabase/admin'
import { parseNewGrowthLog } from '@/lib/types'

const COLUMNS = 'id,log_date,weight_kg,height_cm,head_circumference_cm,notes,created_at'

export async function GET() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  try {
    const { data, error } = await supabase
      .from('growth_logs')
      .select(COLUMNS)
      .order('log_date', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('Supabase GET growth_logs error:', error)
      return Response.json({ error: 'Failed to load growth logs' }, { status: 500 })
    }
    return Response.json(data)
  } catch (error) {
    console.error('Unexpected error fetching growth logs:', error)
    return Response.json({ error: 'Failed to load growth logs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  let log
  try {
    log = parseNewGrowthLog(await request.json())
  } catch (error) {
    console.error('Invalid growth log payload:', error)
    return Response.json({ error: 'Invalid growth log' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase.from('growth_logs').insert(log).select(COLUMNS).single()
    if (error) {
      console.error('Supabase INSERT growth_logs error:', error)
      return Response.json({ error: 'Failed to save growth log' }, { status: 500 })
    }
    return Response.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error saving growth log:', error)
    return Response.json({ error: 'Failed to save growth log' }, { status: 500 })
  }
}

export async function DELETE() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  try {
    const { error } = await supabase.from('growth_logs').delete().not('id', 'is', null)
    if (error) {
      console.error('Supabase DELETE growth_logs error:', error)
      return Response.json({ error: 'Failed to clear growth logs' }, { status: 500 })
    }
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('Unexpected error clearing growth logs:', error)
    return Response.json({ error: 'Failed to clear growth logs' }, { status: 500 })
  }
}
