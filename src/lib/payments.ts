// Pagamento dividido (Rodrigues): uma OS pode ser paga com várias formas,
// cada uma com o seu valor. Fica em service_orders.payments; payment_method,
// card_type e installments continuam preenchidos (resumo) pras telas e
// impressões antigas.

export const PAYMENT_METHOD_OPTIONS = ['Dinheiro', 'PIX', 'Cartão', 'Boleto'] as const

export interface PaymentLine {
  method: string
  amount: number
  card_type?: string | null
  installments?: number | null
}

export const cardGross = (lines: PaymentLine[]) =>
  lines.filter(l => l.method === 'Cartão').reduce((s, l) => s + Number(l.amount || 0), 0)

export const paymentsSum = (lines: PaymentLine[]) =>
  lines.reduce((s, l) => s + Number(l.amount || 0), 0)

export const hasCard = (lines: PaymentLine[]) => lines.some(l => l.method === 'Cartão')

// Normaliza pra salvar: tira linhas sem forma, limpa campos de cartão
export function cleanPayments(lines: PaymentLine[]): PaymentLine[] {
  return lines.filter(l => l.method).map(l => l.method === 'Cartão'
    ? {
        method: l.method, amount: Number(l.amount || 0),
        card_type: l.card_type || null,
        installments: l.card_type === 'credito' ? (l.installments || 1) : null,
      }
    : { method: l.method, amount: Number(l.amount || 0) })
}

// Campos de resumo gravados junto com payments
export function paymentSummaryFields(lines: PaymentLine[]) {
  const clean = cleanPayments(lines)
  const card = clean.find(l => l.method === 'Cartão')
  const methods = Array.from(new Set(clean.map(l => l.method)))
  return {
    payments: clean.length ? clean : null,
    payment_method: methods.length ? methods.join(' + ') : null,
    card_type: card?.card_type ?? null,
    installments: card?.installments ?? null,
  }
}

// Lê as linhas de uma OS (formato novo ou o antigo de uma forma só)
export function paymentsFromOs(so: any): PaymentLine[] {
  if (!so) return []
  if (Array.isArray(so.payments)) {
    return so.payments.map((p: any) => ({
      method: p.method, amount: Number(p.amount || 0),
      card_type: p.card_type ?? null, installments: p.installments ?? null,
    }))
  }
  if (!so.payment_method) return []
  const methods = String(so.payment_method).split(/\s*[,+]\s*/).filter(Boolean)
  return methods.map((m, i) => ({
    method: m,
    amount: methods.length === 1 && i === 0 ? Number(so.total_value || 0) : 0,
    card_type: m === 'Cartão' ? so.card_type ?? null : null,
    installments: m === 'Cartão' ? so.installments ?? null : null,
  }))
}

// Total pago em cartão de uma OS salva (espelha _os_card_gross no banco)
export function osCardGross(so: any): number {
  if (!so) return 0
  if (Array.isArray(so.payments)) return cardGross(paymentsFromOs(so))
  return so.card_net_value != null ? Number(so.total_value || 0) : 0
}

// OS com parte no cartão ainda sem o valor líquido confirmado pelo dono
export function osCardPending(so: any): boolean {
  if (!so || so.card_net_value != null) return false
  if (Array.isArray(so.payments)) return hasCard(paymentsFromOs(so))
  return String(so.payment_method ?? '').includes('Cartão')
}

export function formatPaymentLine(l: PaymentLine) {
  const card = l.method === 'Cartão' && l.card_type
    ? ` ${l.card_type === 'credito' ? 'crédito' : 'débito'}${l.card_type === 'credito' && (l.installments ?? 1) > 1 ? ` ${l.installments}x` : ''}`
    : ''
  return `${l.method}${card}: R$ ${Number(l.amount || 0).toFixed(2)}`
}
