import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/assets — fetch all assets for a user
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const search = searchParams.get('search')

  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  let query = supabase
    .from('assets')
    .select('*')
    .eq('user_id', userId)
    .order('risk_score', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (type && type !== 'all') query = query.eq('asset_type', type)
  if (search) query = query.or(`hostname.ilike.%${search}%,ip_address.ilike.%${search}%,os_name.ilike.%${search}%`)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assets: data, total: data?.length ?? 0 })
}

// POST /api/assets — manually add an asset
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase.from('assets').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ asset: data }, { status: 201 })
}
