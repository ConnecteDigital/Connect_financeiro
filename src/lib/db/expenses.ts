import { createClient } from '@/lib/supabase/client'

export async function getExpenses(filters?: { type?: string; status?: string; search?: string }) {
  const supabase = createClient()
  let query = supabase.from('expenses').select('*').order('due_date', { ascending: true })

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
  const { data, error } = await supabase.from('expenses').insert(values).select().single()
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
