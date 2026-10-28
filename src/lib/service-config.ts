// Configuração das categorias de serviço e seus campos na OS
export interface ServiceCategoryConfig {
  subOptions?: string[]
  qtyLabel: string
  priceLabel: string
  allowFlatPrice?: boolean  // permite modo "valor fechado" sem quantidade
}

export const SERVICE_CONFIG: Record<string, ServiceCategoryConfig> = {
  'Desobstrução': {
    subOptions: ['Ralo', 'Pia', 'Vaso', 'Esgoto', 'Coluna', 'Caixa de Gordura'],
    qtyLabel: 'Quantidade de metros',
    priceLabel: 'Valor do metro (R$)',
    allowFlatPrice: true,
  },
  'Hidrojateamento': {
    qtyLabel: 'Metragem (m)',
    priceLabel: 'Valor do metro (R$)',
    allowFlatPrice: true,
  },
  'Limpeza': {
    subOptions: ['Caixa de Gordura', 'Fossa'],
    qtyLabel: 'Quantidade',
    priceLabel: 'Valor unitário (R$)',
    allowFlatPrice: true,
  },
  'Sucção': {
    subOptions: ['Fossa'],
    qtyLabel: 'Quantidade de litros',
    priceLabel: 'Valor do litro (R$)',
    allowFlatPrice: true,
  },
  'Aplicação de CO2': {
    qtyLabel: 'Quantidade',
    priceLabel: 'Valor unitário (R$)',
    allowFlatPrice: true,
  },
  'Outros': {
    qtyLabel: 'Quantidade',
    priceLabel: 'Valor (R$)',
    allowFlatPrice: true,
  },
  'Reclamação': {
    qtyLabel: 'Quantidade',
    priceLabel: 'Valor (R$)',
    allowFlatPrice: true,
  },
}

export const SERVICE_CATEGORIES = Object.keys(SERVICE_CONFIG)

// Sugestões prontas pro passo de onboarding de "Conserto de Geladeira e
// Eletrodomésticos" — apenas uma lista inicial pro usuário escolher/editar,
// não precisa de configuração especial (usa o padrão genérico abaixo).
export const GELADEIRA_PRESET_CATEGORIES = [
  'Troca de Compressor',
  'Recarga de Gás',
  'Troca de Termostato',
  'Não Está Gelando',
  'Troca de Borracha de Vedação',
  'Troca de Placa Eletrônica',
  'Outros',
]

const GENERIC_CATEGORY_CONFIG: ServiceCategoryConfig = {
  qtyLabel: 'Quantidade',
  priceLabel: 'Valor (R$)',
  allowFlatPrice: true,
}

// Nomes antigos de categoria que tenants/chamados podem ainda ter salvos
// (ex: "Desentupimento" era o nome de "Desobstrução" antes do rename).
// Mantém o comportamento correto (sub-opções, valor fechado) pra dados
// e tenants que não foram atualizados pro nome novo.
const CATEGORY_ALIASES: Record<string, string> = {
  'Desentupimento': 'Desobstrução',
}

export function resolveCategoryName(cat: string): string {
  return CATEGORY_ALIASES[cat] ?? cat
}

// Para o tenant Millenium: Sucção e Hidrojateamento não usam sub-opção fixa
// (o técnico digita livremente no campo de observações da linha).
//
// Categorias que a empresa cadastrou por conta própria (ex: tipos de
// serviço de conserto de geladeira, ou qualquer nome digitado em
// Configurações) não têm entrada no SERVICE_CONFIG — nesse caso cai no
// padrão genérico, que já permite quantidade/valor e valor fechado.
export function getServiceConfig(cat: string, milleniumCustomOS: boolean): ServiceCategoryConfig {
  const resolvedCat = resolveCategoryName(cat)
  const base = SERVICE_CONFIG[resolvedCat] ?? GENERIC_CATEGORY_CONFIG
  if (milleniumCustomOS && (resolvedCat === 'Sucção' || resolvedCat === 'Hidrojateamento') && base.subOptions) {
    return { ...base, subOptions: undefined }
  }
  return base
}
