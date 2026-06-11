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

/** GET /api/admin/users — listar usuários de um tenant */
export async function GET(req: NextRequest) {
  const denied = checkSecret(req)
  if (denied) return denied

  const tenantId = req.nextUrl.searchParams.get('tenant_id')
  if (!tenantId) return NextResponse.json({ error: 'tenant_id obrigatório' }, { status: 400 })

  const supabase = adminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, active, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Buscar emails dos auth.users
  const ids = (data ?? []).map((p: any) => p.id)
  const emailMap: Record<string, string> = {}
  for (const id of ids) {
    const { data: user } = await supabase.auth.admin.getUserById(id)
    if (user?.user) emailMap[id] = user.user.email ?? ''
  }

  return NextResponse.json(
    (data ?? []).map((p: any) => ({ ...p, email: emailMap[p.id] ?? '' }))
  )
}

/** POST /api/admin/users — criar usuário e vincular ao tenant */
export async function POST(req: NextRequest) {
  const denied = checkSecret(req)
  if (denied) return denied

  const body = await req.json()
  const { email, password, name, tenant_id, role = 'admin' } = body

  if (!email || !password || !tenant_id) {
    return NextResponse.json({ error: 'email, password e tenant_id são obrigatórios' }, { status: 400 })
  }

  const supabase = adminClient()

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { tenant_id, name: name || email, role },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.user.id, email: data.user.email })
}

/** DELETE /api/admin/users?id=... — remover usuário */
export async function DELETE(req: NextRequest) {
  const denied = checkSecret(req)
  if (denied) return denied

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const supabase = adminClient()
  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
