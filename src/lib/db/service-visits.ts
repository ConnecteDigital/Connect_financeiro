import { createClient } from '@/lib/supabase/client'

export type VisitOutcome = 'aprovado' | 'aprovado_reagendado' | 'resolvido' | 'orcamento' | 'remarcado' | 'faltou_peca' | 'cliente_ausente' | 'nao_aprovou' | 'sem_conserto' | 'pagou_somente_visita' | 'outro'

export const VISIT_OUTCOME_LABEL: Record<string, string> = {
  aprovado: 'Serviço aprovado',
  aprovado_reagendado: 'Aprovado — vai fazer em outro horário',
  resolvido: 'Retorno resolvido',
  orcamento: 'Orçamento — cliente vai decidir',
  remarcado: 'Cliente remarcou',
  faltou_peca: 'Faltou peça',
  cliente_ausente: 'Cliente não estava em casa',
  nao_aprovou: 'Cliente não aprovou',
  sem_conserto: 'Não tem conserto',
  pagou_somente_visita: 'Pagou somente a taxa de visita',
  outro: 'Outro',
}

export async function getCallVisits(callId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('service_visits')
    .select('*')
    .eq('call_id', callId)
    .order('started_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

// Visita em andamento do técnico logado (RLS já restringe aos chamados dele)
export async function getOpenVisit() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('service_visits')
    .select('*, call:calls(id, contact_name, client:clients(name))')
    .is('finished_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0] ?? null
}

export async function getVisitsInRange(startIso: string, endIso: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('service_visits')
    .select('*, auxiliary:auxiliaries(id, name), call:calls(id, contact_name, call_number, client:clients(name))')
    .gte('started_at', startIso)
    .lt('started_at', endIso)
    .order('started_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function startServiceVisit(callId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('start_service_visit', { p_call_id: callId })
  if (error) throw error
  return data
}

export async function finishServiceVisit(callId: string, outcome: VisitOutcome, notes?: string, newDate?: string, newTime?: string) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('finish_service_visit', {
    p_call_id: callId,
    p_outcome: outcome,
    p_notes: notes || null,
    p_new_date: newDate || null,
    // p_new_time vem da migration_v38: só vai quando é usado
    ...(newTime ? { p_new_time: newTime } : {}),
  })
  if (error) throw error
  return data
}

export async function updateServiceVisit(id: string, values: { started_at?: string; finished_at?: string | null }) {
  const supabase = createClient()
  const { error } = await supabase.from('service_visits').update(values).eq('id', id)
  if (error) throw error
}

// Técnico muda o resultado de um chamado já encerrado (orçamento →
// aprovado, não aprovou por engano etc.)
export async function tecnicoChangeOutcome(callId: string, status: 'aprovado' | 'orcamento' | 'nao_aprovou' | 'pagou_somente_visita' | 'agendado') {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('tecnico_change_outcome', { p_call_id: callId, p_status: status })
  if (error) throw error
  return data
}

// Devoluções (estornos) de uma OS — ver migration_v34.sql
export interface OsRefund {
  id: string
  service_order_id: string
  date: string
  amount: number
  reason: string | null
  commission_discount: number
}

export async function getOsRefunds(serviceOrderId: string): Promise<OsRefund[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('os_refunds')
    .select('id, service_order_id, date, amount, reason, commission_discount')
    .eq('service_order_id', serviceOrderId).order('created_at', { ascending: true })
  if (error) return []   // tabela ainda não criada (v34 não rodada)
  return (data ?? []).map(r => ({ ...r, amount: Number(r.amount), commission_discount: Number(r.commission_discount) }))
}

export async function registerOsRefund(serviceOrderId: string, amount: number, reason: string, date: string) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('register_os_refund', {
    p_service_order_id: serviceOrderId, p_amount: amount, p_reason: reason || null, p_date: date || null,
  })
  if (error) throw error
  return data
}

export async function undoOsRefund(refundId: string) {
  const supabase = createClient()
  const { error } = await supabase.rpc('undo_os_refund', { p_refund_id: refundId })
  if (error) throw error
}
