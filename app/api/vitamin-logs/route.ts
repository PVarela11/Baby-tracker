import { getSupabaseAdmin, notConfigured } from '@/lib/supabase/admin'
import { parseNewVitaminLog } from '@/lib/types'

const COLUMNS = 'id,given_date,given_time,notes,created_at'

export async function GET() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  try {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('vitamin_logs')
      .select(COLUMNS)
      .gte('given_date', since.split('T')[0])
      .order('given_date', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('Supabase GET vitamin_logs error:', error)
      return Response.json({ error: 'Failed to load vitamin logs' }, { status: 500 })
    }
    return Response.json(data)
  } catch (error) {
    console.error('Unexpected error fetching vitamin logs:', error)
    return Response.json({ error: 'Failed to load vitamin logs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  let log
  try {
    log = parseNewVitaminLog(await request.json())
  } catch (error) {
    console.error('Invalid vitamin log payload:', error)
    return Response.json({ error: 'Invalid vitamin log' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase.from('vitamin_logs').insert(log).select(COLUMNS).single()
    if (error) {
      console.error('Supabase INSERT vitamin_logs error:', error)
      return Response.json({ error: 'Failed to save vitamin log' }, { status: 500 })
    }
    return Response.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error saving vitamin log:', error)
    return Response.json({ error: 'Failed to save vitamin log' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  const url = new URL(request.url)
  const givenDate = url.searchParams.get('given_date')

  try {
    let query = supabase.from('vitamin_logs')

    if (givenDate) {
      // Delete vitamin log for a specific date
      const { error } = await query.eq('given_date', givenDate).delete()
      if (error) {
        console.error('Supabase DELETE vitamin_logs by date error:', error)
        return Response.json({ error: 'Failed to delete vitamin log' }, { status: 500 })
      }
    } else {
      // Delete all vitamin logs
      const { error } = await query.delete().not('id', 'is', null)
      if (error) {
        console.error('Supabase DELETE all vitamin_logs error:', error)
        return Response.json({ error: 'Failed to clear vitamin logs' }, { status: 500 })
      }
    }
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('Unexpected error deleting vitamin logs:', error)
    return Response.json({ error: 'Failed to delete vitamin logs' }, { status: 500 })
  }
}
