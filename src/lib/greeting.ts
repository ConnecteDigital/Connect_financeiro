// "Olá, Victor!" — primeiro nome de quem está logado. Se o perfil ainda
// está com o nome da empresa (padrão de quando a conta foi criada), fica
// só "Olá!".
export function greeting(profileName: string | null | undefined, tenantName?: string | null): string {
  const name = (profileName ?? '').trim()
  if (!name || name.toLowerCase() === (tenantName ?? '').trim().toLowerCase()) return 'Olá!'
  const first = name.split(/\s+/)[0]
  return `Olá, ${first.charAt(0).toUpperCase()}${first.slice(1)}!`
}

// Nome de quem confirma o cartão / paga a comissão (o dono da empresa),
// usado nos avisos pro técnico. Fica em call_form_config.owner_name
// (Eletromark: "Marcos"); a Rodrigues continua "Rodrigues".
export function ownerNameOf(tenant: { slug?: string | null; call_form_config?: any } | null | undefined): string {
  const n = String(tenant?.call_form_config?.owner_name ?? '').trim()
  if (n) return n
  if (tenant?.slug === 'rodrigues-refrigeracao') return 'Rodrigues'
  return 'gestor'
}
