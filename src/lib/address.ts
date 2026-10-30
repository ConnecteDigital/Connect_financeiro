export interface AddressParts {
  address?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
}

function street(p: AddressParts) {
  const s = (p.address ?? '').trim()
  const n = (p.number ?? '').trim()
  if (!n) return s
  return s ? `${s}, ${n}` : n
}

// "Rua X, 25 - Bloco 2, Bairro, Cidade"
export function formatAddress(p: AddressParts): string {
  const head = [street(p), (p.complement ?? '').trim()].filter(Boolean).join(' - ')
  return [head, p.neighborhood, p.city].map(v => (v ?? '').trim()).filter(Boolean).join(', ')
}

// Pro Waze: rua + número + bairro + cidade (complemento/referência atrapalham a busca)
export function navigationAddress(p: AddressParts): string {
  return [street(p), p.neighborhood, p.city].map(v => (v ?? '').trim()).filter(Boolean).join(', ')
}
