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
  const originLabels: Record<string, string> = { site_lider: 'Site Líder', site_poa: 'Site POA', indicacao: 'Indicação', terceirizado: 'Terceirizado' }
  const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706']
  const byOrigin = Object.entries(originCount).map(([key, data], i) => ({
    name: originLabels[key] ?? key, ...data, color: colors[i % colors.length]
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
    const week = `Sem ${Math.ceil(new Date(o.date).getDate() / 7)}`
    if (!weekMap[week]) weekMap[week] = { bruto: 0, liquido: 0 }
    const cost = Number(o.outsource_fuel_cost || 0) + Number(o.outsource_meal_cost || 0) + Number(o.outsource_truck_cost || 0) + Number(o.outsource_other_cost || 0)
    weekMap[week].bruto += Number(o.total_value || 0)
    weekMap[week].liquido += Number(o.total_value || 0) - cost
  })
  const revenueByWeek = Object.entries(weekMap).sort(([a], [b]) => a.localeCompare(b)).map(([name, data]) => ({ name, ...data }))

  return {
    summary: { totalCalls, approvedCalls, scheduledCalls, cancelledCalls, noVisitCalls, grossRevenue, netRevenue, paidRevenue, pendingRevenue, totalExpenses, outsourceCosts },
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
