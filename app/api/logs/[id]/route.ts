import { getSupabaseAdmin, notConfigured } from '@/lib/supabase/admin'
import { parseLogPatch } from '@/lib/types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()
  const { id } = await params
  if (!UUID.test(id)) return Response.json({ error: 'Invalid id' }, { status: 400 })

  let patch
  try {
    patch = parseLogPatch(await request.json())
  } catch {
    return Response.json({ error: 'Invalid update' }, { status: 400 })
  }

  const { data, error } = await supabase.from('logs').update(patch).eq('id', id).select().single()
  if (error) return Response.json({ error: 'Failed to update log' }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()
  const { id } = await params
  if (!UUID.test(id)) return Response.json({ error: 'Invalid id' }, { status: 400 })

  const { error } = await supabase.from('logs').delete().eq('id', id)
  if (error) return Response.json({ error: 'Failed to delete log' }, { status: 500 })
  return new Response(null, { status: 204 })
}
