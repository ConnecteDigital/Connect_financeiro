import { createClient } from '@/lib/supabase/client'
import { getMyTenantId } from './tenant'

export async function getExpenses(filters?: { type?: string; status?: string; search?: string }) {
  const supabase = createClient()
  let query = supabase.from('expenses').select('*, supplier:suppliers(id,name), client:clients(id,name)').order('due_date', { ascending: true })

  if (filters?.type && filters.type !== 'todos') query = query.eq('type', filters.type)
  if (filters?.status && filters.status !== 'todos') query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw error

  if (filters?.search) {
    return data.filter(e =>
      e.description.toLowerCase().includes(filters.search!.toLowerCase()) ||
      e.category.toLowerCase().includes(filters.search!.toLowerCase())
    )
  }
  return data
}

export async function createExpense(values: Record<string, unknown>) {
  const supabase = createClient()
  const tenant_id = await getMyTenantId()
  const { data, error } = await supabase.from('expenses').insert({ ...values, tenant_id }).select().single()
  if (error) throw error
  return data
}

export async function updateExpense(id: string, values: Record<string, unknown>) {
  const supabase = createClient()
  const { data, error } = await supabase.from('expenses').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteExpense(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

// Cria/atualiza/remove a saída automática de "custo de peça" vinculada a
// uma OS — usado pela Rodrigues Refrigeração pra refletir no financeiro
// o valor gasto com peças em cada serviço aprovado.
export async function upsertPartsExpense(serviceOrderId: string, amount: number, dueDate: string, description: string) {
  const supabase = createClient()
  const { data: existing } = await supabase
    .from('expenses')
    .select('id')
    .eq('source_service_order_id', serviceOrderId)
    .eq('category', 'Peças')
    .maybeSingle()

  if (amount <= 0) {
    if (existing) await deleteExpense(existing.id)
    return
  }
  if (existing) {
    await updateExpense(existing.id, { amount, description, due_date: dueDate })
  } else {
    await createExpense({
      description, category: 'Peças', amount, type: 'avulso', status: 'pendente',
      due_date: dueDate, source_service_order_id: serviceOrderId,
    })
  }
}
