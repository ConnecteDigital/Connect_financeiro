import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Variáveis de ambiente do Supabase não configuradas.')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function checkSecret(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
}

export async function GET(req: NextRequest) {
  const denied = checkSecret(req)
  if (denied) return denied

  const supabase = adminClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug, name, primary_color, active, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const denied = checkSecret(req)
  if (denied) return denied

  const body = await req.json()
  const { name, slug, primary_color } = body
  if (!name || !slug) {
    return NextResponse.json({ error: 'Nome e slug são obrigatórios' }, { status: 400 })
  }

  const supabase = adminClient()
  const { data, error } = await supabase
    .from('tenants')
    .insert({ name, slug: slug.toLowerCase().replace(/\s+/g, '-'), primary_color: primary_color || '#f97316' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
