// Lembra os últimos valores de visita usados (local ao aparelho/navegador)
// pra reaproveitar com um clique em vez de digitar de novo.
const KEY = 'connect_recent_visit_fees'
const MAX = 6

export function getRecentVisitFees(): number[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addRecentVisitFee(value: number) {
  if (typeof window === 'undefined' || !value || value <= 0) return
  try {
    const current = getRecentVisitFees().filter(v => v !== value)
    const next = [value, ...current].slice(0, MAX)
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignora — é só uma conveniência, não precisa falhar o salvamento do chamado
  }
}
