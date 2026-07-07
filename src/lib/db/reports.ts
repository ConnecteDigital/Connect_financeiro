import { createClient } from '@/lib/supabase/client'

export async function getReportData(
  startDate: string,
  endDate: string,
  filters?: { origin?: string; serviceCategory?: string }
) {
  const supabase = createClient()

  let callsQuery = supabase
    .from('calls')
    .select('id, status, origin, date, service_category, contact_name, client:clients(name, city)')
    .gte('date', startDate)
    .lte('date', endDate)

  if (filters?.origin && filters.origin !== 'todos') callsQuery = callsQuery.eq('origin', filters.origin)
  if (filters?.serviceCategory && filters.serviceCategory !== 'todos') callsQuery = callsQuery.eq('service_category', filters.serviceCategory)

  let ordersQuery = supabase
    .from('service_orders')
    .select(`
      id, total_value, service_type, payment_status, date,
      outsource_fuel_cost, outsource_meal_cost, outsource_truck_cost, outsource_other_cost,
      client:clients(name, city),
      items:service_order_items(description, quantity, unit_price, total),
      call:calls(origin, service_category)
    `)
    .gte('date', startDate)
    .lte('date', endDate)

  const [callsRes, ordersRes, expensesRes] = await Promise.all([
    callsQuery,
    ordersQuery,
    supabase.from('expenses').select('amount, status, category').gte('due_date', startDate).lte('due_date', endDate),
  ])

  const calls = callsRes.data ?? []
  const orders = ordersRes.data ?? []
  const expenses = expensesRes.data ?? []

  // Status dos chamados
  const totalCalls = calls.length
  const approvedCalls = calls.filter(c => c.status === 'aprovado').length
  const scheduledCalls = calls.filter(c => c.status === 'agendado').length
  const cancelledCalls = calls.filter(c => c.status === 'cancelado').length
  const noVisitCalls = calls.filter(c => c.status === 'nao_quis_visita').length
  const notApprovedCalls = calls.filter(c => c.status === 'nao_aprovou').length

  // Financeiro
  const grossRevenue = orders.reduce((s, o) => s + Number(o.total_value || 0), 0)
  const outsourceCosts = orders.reduce((s, o) =>
    s + Number(o.outsource_fuel_cost || 0) + Number(o.outsource_meal_cost || 0) +
    Number(o.outsource_truck_cost || 0) + Number(o.outsource_other_cost || 0), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const netRevenue = grossRevenue - outsourceCosts - totalExpenses
  const paidRevenue = orders.filter(o => o.payment_status === 'pago').reduce((s, o) => s + Number(o.total_value || 0), 0)
  const pendingRevenue = orders.filter(o => o.payment_status !== 'pago').reduce((s, o) => s + Number(o.total_value || 0), 0)

  // Por origem
  const originCount: Record<string, { calls: number; revenue: number }> = {}
  calls.forEach(c => {
    if (!originCount[c.origin]) originCount[c.origin] = { calls: 0, revenue: 0 }
    originCount[c.origin].calls++
  })
  orders.forEach(o => {
    const origin = (o.call as any)?.origin
    if (origin && originCount[origin]) originCount[origin].revenue += Number(o.total_value || 0)
  })
  const ORIGIN_LABELS: Record<string, string> = { site_lider: 'Site Líder', site_poa: 'Site POA', site_millenium: 'Site Millenium', site_praja: 'Site Pra Já', indicacao: 'Indicação', terceirizado: 'Terceirizado' }
  const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706']
  const byOrigin = Object.entries(originCount).map(([key, data], i) => ({
    name: ORIGIN_LABELS[key] ?? key, ...data, color: colors[i % colors.length]
  }))

  // Por categoria de serviço
  const catMap: Record<string, { calls: number; revenue: number }> = {}
  calls.forEach(c => {
    const cat = c.service_category || 'Não informado'
    if (!catMap[cat]) catMap[cat] = { calls: 0, revenue: 0 }
    catMap[cat].calls++
  })
  orders.forEach(o => {
    const cat = (o.call as any)?.service_category || 'Não informado'
    if (!catMap[cat]) catMap[cat] = { calls: 0, revenue: 0 }
    catMap[cat].revenue += Number(o.total_value || 0)
  })
  const byCategory = Object.entries(catMap).map(([cat, data]) => ({ category: cat, ...data })).sort((a, b) => b.revenue - a.revenue)

  // Por cidade
  const cityMap: Record<string, { calls: number; revenue: number }> = {}
  orders.forEach(o => {
    const city = (o.client as any)?.city || 'Não informado'
    if (!cityMap[city]) cityMap[city] = { calls: 0, revenue: 0 }
    cityMap[city].calls++
    cityMap[city].revenue += Number(o.total_value || 0)
  })
  const byCity = Object.entries(cityMap).map(([city, data]) => ({ city, ...data })).sort((a, b) => b.revenue - a.revenue).slice(0, 10)

  // Receita por semana
  const weekMap: Record<string, { bruto: number; liquido: number }> = {}
  orders.forEach(o => {
    // 'T12:00:00' evita o deslocamento de um dia causado pelo fuso horário
    const week = `Sem ${Math.ceil(new Date(o.date + 'T12:00:00').getDate() / 7)}`
    if (!weekMap[week]) weekMap[week] = { bruto: 0, liquido: 0 }
    const cost = Number(o.outsource_fuel_cost || 0) + Number(o.outsource_meal_cost || 0) + Number(o.outsource_truck_cost || 0) + Number(o.outsource_other_cost || 0)
    weekMap[week].bruto += Number(o.total_value || 0)
    weekMap[week].liquido += Number(o.total_value || 0) - cost
  })
  const revenueByWeek = Object.entries(weekMap).sort(([a], [b]) => a.localeCompare(b)).map(([name, data]) => ({ name, ...data }))

  return {
    summary: { totalCalls, approvedCalls, scheduledCalls, cancelledCalls, noVisitCalls, notApprovedCalls, grossRevenue, netRevenue, paidRevenue, pendingRevenue, totalExpenses, outsourceCosts },
    byOrigin,
    byCategory,
    byCity,
    revenueByWeek,
  }
}

export async function getAvailableCategories() {
  const supabase = createClient()
  const { data } = await supabase.from('calls').select('service_category').not('service_category', 'is', null)
  const cats = [...new Set((data ?? []).map((d: any) => d.service_category).filter(Boolean))]
  return cats as string[]
}

export async function getExpensesReport(
  startDate: string,
  endDate: string,
  filters?: { category?: string; supplierId?: string; status?: string }
) {
  const supabase = createClient()
  let q = supabase
    .from('expenses')
    .select('*, supplier:suppliers(id,name)')
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date', { ascending: false })

  if (filters?.category && filters.category !== 'todos') q = q.eq('category', filters.category)
  if (filters?.supplierId && filters.supplierId !== 'todos') q = q.eq('supplier_id', filters.supplierId)
  if (filters?.status && filters.status !== 'todos') q = q.eq('status', filters.status)

  const { data } = await q
  const expenses = data ?? []

  const total = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
  const paid = expenses.filter((e: any) => e.status === 'pago').reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
  const pending = expenses.filter((e: any) => e.status !== 'pago').reduce((s: number, e: any) => s + Number(e.amount || 0), 0)

  const catMap: Record<string, number> = {}
  expenses.forEach((e: any) => { catMap[e.category || 'outros'] = (catMap[e.category || 'outros'] || 0) + Number(e.amount || 0) })
  const byCategory = Object.entries(catMap).map(([cat, total]) => ({ cat, total })).sort((a, b) => b.total - a.total)

  const suppMap: Record<string, { name: string; total: number }> = {}
  expenses.forEach((e: any) => {
    const key = e.supplier?.id ?? 'sem-fornecedor'
    const name = e.supplier?.name ?? 'Sem fornecedor'
    if (!suppMap[key]) suppMap[key] = { name, total: 0 }
    suppMap[key].total += Number(e.amount || 0)
  })
  const bySupplier = Object.values(suppMap).sort((a, b) => b.total - a.total)

  return { expenses, total, paid, pending, byCategory, bySupplier }
}

export async function getCashEntriesReport(
  startDate: string,
  endDate: string,
  filters?: { clientId?: string; status?: string }
) {
  const supabase = createClient()
  let q = supabase
    .from('cash_entries')
    .select('*, client:clients(id,name)')
    .eq('direction', 'entrada')
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date', { ascending: false })

  if (filters?.clientId && filters.clientId !== 'todos') q = q.eq('client_id', filters.clientId)
  if (filters?.status && filters.status !== 'todos') q = q.eq('status', filters.status)

  const { data } = await q
  const entries = data ?? []

  const total = entries.reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
  const paid = entries.filter((e: any) => e.status === 'pago').reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
  const pending = entries.filter((e: any) => e.status !== 'pago').reduce((s: number, e: any) => s + Number(e.amount || 0), 0)

  const clientMap: Record<string, { name: string; total: number }> = {}
  entries.forEach((e: any) => {
    const key = e.client?.id ?? 'sem-cliente'
    const name = e.client?.name ?? 'Sem cliente'
    if (!clientMap[key]) clientMap[key] = { name, total: 0 }
    clientMap[key].total += Number(e.amount || 0)
  })
  const byClient = Object.values(clientMap).sort((a, b) => b.total - a.total)

  return { entries, total, paid, pending, byClient }
}
