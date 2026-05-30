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

  return {
    total_calls,
    approved_calls,
    gross_revenue,
    net_revenue,
    pending_receivables,
    total_expenses,
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
      .eq('date', today)
      .order('scheduled_time', { ascending: true }),
    supabase
      .from('service_orders')
      .select('id, total_value, remaining_amount, remaining_due_date, client:clients(name), payment_status')
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
