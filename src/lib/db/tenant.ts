import { createClient } from '@/lib/supabase/client'

let cachedTenantId: string | null = null

export async function getMyTenantId(): Promise<string> {
  if (cachedTenantId) return cachedTenantId
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')
  // A policy de RLS permite ver todos os perfis do tenant,
  // então é obrigatório filtrar pelo usuário logado.
  const { data, error } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (error || !data) throw new Error('Perfil não encontrado')
  cachedTenantId = data.tenant_id
  return cachedTenantId!
}

export function clearTenantCache() {
  cachedTenantId = null
}
