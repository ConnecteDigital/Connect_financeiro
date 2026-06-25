import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const MASTER_EMAILS = ['connectefinanceiro@gmail.com']

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function getSessionUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await getSessionUser()
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const admin = adminClient()

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`

  // All tenants
  const { data: tenants, error: tenantsErr } = await admin
    .from('tenants')
    .select('id, slug, name, logo_url, primary_color, active, created_at')
    .order('name')

  if (tenantsErr) return NextResponse.json({ error: tenantsErr.message }, { status: 500 })

  // Aggregate stats per tenant in parallel
  const summaries = await Promise.all((tenants ?? []).map(async (tenant) => {
    const [callsRes, ordersRes, openCallsRes] = await Promise.all([
      admin.from('calls')
        .select('id, status')
        .eq('tenant_id', tenant.id)
        .gte('date', monthStart)
        .lt('date', monthEnd),
      admin.from('service_orders')
        .select('total_value, payment_status, remaining_amount')
        .eq('tenant_id', tenant.id)
        .gte('date', monthStart)
        .lt('date', monthEnd),
      admin.from('calls')
        .select('id')
        .eq('tenant_id', tenant.id)
        .in('status', ['aberto', 'agendado']),
    ])

    const calls = callsRes.data ?? []
    const orders = ordersRes.data ?? []

    const gross_revenue = orders.reduce((s, o) => s + (o.total_value || 0), 0)
    const pending_receivables = orders
      .filter(o => o.payment_status === 'pendente' || o.payment_status === 'pago_parcial')
      .reduce((s, o) => s + (o.remaining_amount || 0), 0)

    return {
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        logo_url: tenant.logo_url,
        primary_color: tenant.primary_color,
        active: tenant.active,
      },
      stats: {
        total_calls: calls.length,
        approved_calls: calls.filter(c => c.status === 'aprovado').length,
        open_calls: openCallsRes.data?.length ?? 0,
        gross_revenue,
        pending_receivables,
      },
    }
  }))

  return NextResponse.json({ summaries, month: monthStart })
}
