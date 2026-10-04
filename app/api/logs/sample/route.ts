import { getSupabaseAdmin, notConfigured } from '@/lib/supabase/admin'
import { generateSampleLogs } from '@/lib/sample-data'

export async function POST() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  const { error } = await supabase.from('logs').insert(generateSampleLogs(7))
  if (error) return Response.json({ error: 'Failed to load sample data' }, { status: 500 })
  return new Response(null, { status: 204 })
}
