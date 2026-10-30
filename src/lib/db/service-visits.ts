import { createClient } from '@/lib/supabase/client'

export type VisitOutcome = 'aprovado' | 'remarcado' | 'cliente_ausente' | 'nao_aprovou' | 'pagou_somente_visita' | 'outro'

export const VISIT_OUTCOME_LABEL: Record<string, string> = {
  aprovado: 'Serviço aprovado',
  remarcado: 'Faltou peça / remarcado',
  cliente_ausente: 'Cliente não estava em casa',
  nao_aprovou: 'Cliente não aprovou',
  pagou_somente_visita: 'Pagou somente a visita',
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

export async function finishServiceVisit(callId: string, outcome: VisitOutcome, notes?: string, newDate?: string) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('finish_service_visit', {
    p_call_id: callId,
    p_outcome: outcome,
    p_notes: notes || null,
    p_new_date: newDate || null,
  })
  if (error) throw error
  return data
}

export async function updateServiceVisit(id: string, values: { started_at?: string; finished_at?: string | null }) {
  const supabase = createClient()
  const { error } = await supabase.from('service_visits').update(values).eq('id', id)
  if (error) throw error
}
