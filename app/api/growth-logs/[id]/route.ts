import { getSupabaseAdmin, notConfigured } from '@/lib/supabase/admin'
import { parseGrowthLogPatch } from '@/lib/types'

const COLUMNS = 'id,log_date,weight_kg,height_cm,head_circumference_cm,notes,created_at'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  let patch
  try {
    patch = parseGrowthLogPatch(await request.json())
  } catch {
    return Response.json({ error: 'Invalid patch' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('growth_logs')
    .update(patch)
    .eq('id', params.id)
    .select(COLUMNS)
    .single()

  if (error) return Response.json({ error: 'Failed to update growth log' }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  const { error } = await supabase.from('growth_logs').delete().eq('id', params.id)
  if (error) return Response.json({ error: 'Failed to delete growth log' }, { status: 500 })
  return new Response(null, { status: 204 })
}
