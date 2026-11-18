// Garantia por peça (Rodrigues e Loja): além da garantia da mão de obra,
// cada peça trocada pode ter o prazo dela — ex.: compressor, 6 meses.
// Fica em service_orders.parts_guarantee, em quotes.details.parts_guarantee
// e, nos pedidos da loja, na própria linha da peça.

export interface PartGuarantee { part: string; period: string }

export const PART_PERIODS = ['30 dias', '60 dias', '90 dias', '6 meses', '1 ano', '2 anos']

// Só as linhas completas (peça + prazo), sem espaços sobrando
export function cleanPartsGuarantee(list: unknown): PartGuarantee[] {
  if (!Array.isArray(list)) return []
  return list
    .map((g: any) => ({ part: String(g?.part ?? '').trim(), period: String(g?.period ?? '').trim() }))
    .filter(g => g.part && g.period)
}

export const partGuaranteeLine = (g: PartGuarantee) => `${g.part} — ${g.period}`
