import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

export async function getDashboardStatsRange(startDate: string, endDate: string) {
  const supabase = createClient()
  const weekStart = startDate
  const weekEnd = endDate

  const [callsRes, ordersRes, expensesRes] = await Promise.all([
    supabase
      .from('calls')
      .select('id, status')
      .gte('date', weekStart)
      .lte('date', weekEnd),
    supabase
      .from('service_orders')
      .select('total_value, payment_status, amount_paid, remaining_amount, outsource_fuel_cost, outsource_meal_cost, outsource_truck_cost, outsource_other_cost, service_type')
      .gte('date', weekStart)
      .lte('date', weekEnd),
    supabase
      .from('expenses')
      .select('amount, status')
      .gte('due_date', weekStart)
      .lte('due_date', weekEnd),
  ])

  const calls = callsRes.data ?? []
  const orders = ordersRes.data ?? []
  const expenses = expensesRes.data ?? []

  const total_calls = calls.length
  const approved_calls = calls.filter(c => c.status === 'aprovado').length
  const scheduled_calls = calls.filter(c => c.status === 'agendado').length
  const cancelled_calls = calls.filter(c => c.status === 'cancelado').length
  const no_visit_calls = calls.filter(c => c.status === 'nao_quis_visita').length
  const not_approved_calls = calls.filter(c => c.status === 'nao_aprovou').length
  const gross_revenue = orders.reduce((s, o) => s + (o.total_value || 0), 0)

  const total_costs = orders.reduce((s, o) => {
    const outsource = (o.outsource_fuel_cost || 0) + (o.outsource_meal_cost || 0) +
      (o.outsource_truck_cost || 0) + (o.outsource_other_cost || 0)
    return s + outsource
  }, 0)

  const total_expenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const net_revenue = gross_revenue - total_costs - total_expenses

  const pending_receivables = orders
    .filter(o => o.payment_status === 'pendente' || o.payment_status === 'pago_parcial')
    .reduce((s, o) => s + (o.remaining_amount || o.total_value || 0), 0)

  const paid_revenue = gross_revenue - pending_receivables

  return {
    total_calls,
    approved_calls,
    scheduled_calls,
    cancelled_calls,
    no_visit_calls,
    not_approved_calls,
    gross_revenue,
    net_revenue,
    pending_receivables,
    total_expenses,
    outsource_costs: total_costs,
    paid_revenue,
  }
}

export async function getNotifications() {
  const supabase = createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [scheduledRes, pendingPaymentsRes, pendingExpensesRes] = await Promise.all([
    supabase
      .from('calls')
      .select('id, notes, contact_name, scheduled_time, call_address, service_category, client:clients(name)')
      .eq('status', 'agendado')
      // agendado para hoje: usa a data do serviço; chamados antigos sem ela usam a data do chamado
      .or(`scheduled_date.eq.${today},and(scheduled_date.is.null,date.eq.${today})`)
      .order('scheduled_time', { ascending: true }),
    supabase
      .from('service_orders')
      .select('id, call_id, total_value, remaining_amount, remaining_due_date, client:clients(name), payment_status')
      .in('payment_status', ['pendente', 'pago_parcial'])
      .lte('remaining_due_date', today),
    supabase
      .from('expenses')
      .select('id, description, amount, due_date')
      .eq('status', 'pendente')
      .lte('due_date', format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd')),
  ])

  return {
    scheduled: scheduledRes.data ?? [],
    pendingPayments: pendingPaymentsRes.data ?? [],
    pendingExpenses: pendingExpensesRes.data ?? [],
  }
}

/** Todos os valores a receber (pendentes e parciais), sem filtro de vencimento */
export async function getPendingReceivables() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('service_orders')
    .select('id, call_id, date, total_value, amount_paid, remaining_amount, remaining_due_date, payment_status, client:clients(name)')
    .in('payment_status', ['pendente', 'pago_parcial'])
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}
