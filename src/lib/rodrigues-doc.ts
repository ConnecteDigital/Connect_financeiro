// Dados fixos do cabeçalho dos documentos da Rodrigues (Orçamento / OS).
// Podem ser sobrescritos em tenants.call_form_config.document_header.

export interface DocHeader {
  name: string
  legal_name: string
  cnpj: string
  address_lines: string[]
  phone: string
  instagram: string
  city: string
  pix: string
  payment_methods: string
  signature?: string | null   // assinatura da empresa (imagem), já impressa nos documentos
}

export const RODRIGUES_DOC_HEADER: DocHeader = {
  name: 'RODRIGUES REFRIGERAÇÕES',
  legal_name: '45.946.465 VICTOR EMANOEL RODRIGUES BARBOSA',
  cnpj: '45.946.465/0001-78',
  address_lines: ['Rua São João Batista do Glória, 125, loja', 'Jardim Leblon, Belo Horizonte-MG', 'CEP 31540-100'],
  phone: '+55 (31) 97576-2097',
  instagram: 'rodriigues_refrigeracao',
  city: 'Belo Horizonte',
  pix: '45946465000178',
  payment_methods: 'Boleto, transferência bancária, dinheiro, cheque, cartão de crédito, cartão de débito, pix, picpay ou link de pagamento.',
}

export function docHeaderOf(tenant: { call_form_config?: any } | null | undefined): DocHeader {
  const o = tenant?.call_form_config?.document_header ?? {}
  // Assinatura da empresa: desenhada uma vez em Configurações; sai em todo documento
  const signature = tenant?.call_form_config?.document_signature?.image ?? null
  return { ...RODRIGUES_DOC_HEADER, ...o, signature }
}

// Campos extras do orçamento da Rodrigues (quotes.details)
export interface QuoteDetails {
  appliance?: string
  brand?: string
  model?: string
  defect?: string
  validity_days?: string
  visit_date?: string
  visit_period?: string
  payment_conditions?: string
  parts_guarantee?: { part: string; period: string }[]   // garantia de cada peça
  total_only?: boolean   // orçamento só com o valor total (sem preço por item)
}

export const VISIT_PERIODS = ['Manhã (08:00 - 12:00)', 'Tarde (12:00 - 18:00)', 'Noite (19:00 - 22:00)']
