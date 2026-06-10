// Configuração das categorias de serviço e seus campos na OS
export interface ServiceCategoryConfig {
  subOptions?: string[]
  qtyLabel: string
  priceLabel: string
}

export const SERVICE_CONFIG: Record<string, ServiceCategoryConfig> = {
  'Sucção': {
    subOptions: ['Fossa'],
    qtyLabel: 'Quantidade de litros',
    priceLabel: 'Valor do litro (R$)',
  },
  'Desobstrução': {
    subOptions: ['Ralo', 'Pia', 'Vaso', 'Esgoto', 'Coluna'],
    qtyLabel: 'Quantidade de metros',
    priceLabel: 'Valor do metro (R$)',
  },
  'Limpeza': {
    subOptions: ['Fossa', 'Caixa de Gordura'],
    qtyLabel: 'Quantidade',
    priceLabel: 'Valor unitário (R$)',
  },
  'Hidrojateamento': {
    qtyLabel: 'Metragem (m)',
    priceLabel: 'Valor do metro (R$)',
  },
  'Aplicação de CO2': {
    qtyLabel: 'Quantidade',
    priceLabel: 'Valor unitário (R$)',
  },
  'Outros': {
    qtyLabel: 'Quantidade',
    priceLabel: 'Valor (R$)',
  },
}

export const SERVICE_CATEGORIES = Object.keys(SERVICE_CONFIG)
