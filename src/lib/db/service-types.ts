import { createClient } from '@/lib/supabase/client'

export async function getServiceTypes() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('service_types')
    .select('*')
    .eq('active', true)
    .order('category')
    .order('name')
  if (error) throw error
  return data ?? []
}
