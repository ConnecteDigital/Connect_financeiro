// "Olá, Victor!" — primeiro nome de quem está logado. Se o perfil ainda
// está com o nome da empresa (padrão de quando a conta foi criada), fica
// só "Olá!".
export function greeting(profileName: string | null | undefined, tenantName?: string | null): string {
  const name = (profileName ?? '').trim()
  if (!name || name.toLowerCase() === (tenantName ?? '').trim().toLowerCase()) return 'Olá!'
  const first = name.split(/\s+/)[0]
  return `Olá, ${first.charAt(0).toUpperCase()}${first.slice(1)}!`
}
