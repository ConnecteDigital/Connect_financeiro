import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const MASTER_EMAILS = ['connectefinanceiro@gmail.com']

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
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

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser()
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { slug } = await params
  const admin = adminClient()

  const { data: tenant, error } = await admin
    .from('tenants')
    .select('id, slug, name, logo_url, primary_color, call_origins, enable_commissions, cnpj, phone, origin_branding')
    .eq('slug', slug)
    .single()

  if (error || !tenant) {
    return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })
  }

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`

  const [callsRes, ordersRes, expensesRes, recentCallsRes] = await Promise.all([
    admin.from('calls').select('id, status, date, contact_name, service_category, call_number, scheduled_date')
      .eq('tenant_id', tenant.id)
      .gte('date', monthStart).lt('date', monthEnd)
      .order('date', { ascending: false }).limit(100),
    admin.from('service_orders').select('total_value, payment_status, remaining_amount, amount_paid')
      .eq('tenant_id', tenant.id)
      .gte('date', monthStart).lt('date', monthEnd),
    admin.from('expenses').select('amount, status, type')
      .eq('tenant_id', tenant.id)
      .gte('due_date', monthStart).lt('due_date', monthEnd),
    admin.from('calls').select('id, call_number, contact_name, service_category, status, date, scheduled_date, scheduled_time, call_address')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false }).limit(10),
  ])

  const calls = callsRes.data ?? []
  const orders = ordersRes.data ?? []
  const expenses = expensesRes.data ?? []

  const gross_revenue = orders.reduce((s, o) => s + (o.total_value || 0), 0)
  const pending_receivables = orders
    .filter(o => o.payment_status === 'pendente' || o.payment_status === 'pago_parcial')
    .reduce((s, o) => s + (o.remaining_amount || 0), 0)
  const total_expenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)

  return NextResponse.json({
    tenant,
    stats: {
      total_calls: calls.length,
      approved_calls: calls.filter(c => c.status === 'aprovado').length,
      open_calls: calls.filter(c => c.status === 'aberto' || c.status === 'agendado').length,
      cancelled_calls: calls.filter(c => c.status === 'cancelado').length,
      gross_revenue,
      pending_receivables,
      total_expenses,
      net_revenue: gross_revenue - total_expenses,
    },
    recent_calls: recentCallsRes.data ?? [],
  })
}
