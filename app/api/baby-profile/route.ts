import { getSupabaseAdmin, notConfigured } from '@/lib/supabase/admin'
import { parseBabyProfile } from '@/lib/types'

const COLUMNS = 'name,date_of_birth,gender'

export async function GET() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  const { data, error } = await supabase.from('baby_profile').select(COLUMNS).single()
  if (error && error.code !== 'PGRST116') {
    return Response.json({ error: 'Failed to load baby profile' }, { status: 500 })
  }
  return Response.json(data || { name: null, date_of_birth: null, gender: null })
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return notConfigured()

  let profile
  try {
    profile = parseBabyProfile(await request.json())
  } catch {
    return Response.json({ error: 'Invalid baby profile' }, { status: 400 })
  }

  const { data, error } = await supabase.from('baby_profile').upsert(profile).select(COLUMNS).single()
  if (error) return Response.json({ error: 'Failed to save baby profile' }, { status: 500 })
  return Response.json(data, { status: 201 })
}
