import { getSupabaseAdmin, notConfigured } from '@/lib/supabase/admin'
import { parseVitaminLogPatch } from '@/lib/types'

const COLUMNS = 'id,given_date,given_time,notes,created_at'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  let patch
  try {
    patch = parseVitaminLogPatch(await request.json())
  } catch {
    return Response.json({ error: 'Invalid patch' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('vitamin_logs')
    .update(patch)
    .eq('id', params.id)
    .select(COLUMNS)
    .single()

  if (error) return Response.json({ error: 'Failed to update vitamin log' }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  const { error } = await supabase.from('vitamin_logs').delete().eq('id', params.id)
  if (error) return Response.json({ error: 'Failed to delete vitamin log' }, { status: 500 })
  return new Response(null, { status: 204 })
}
