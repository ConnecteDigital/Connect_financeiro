import type { RodriguesDocProps } from '@/components/RodriguesDocument'
import { docHeaderOf } from '@/lib/rodrigues-doc'
import { paymentsFromOs } from '@/lib/payments'
import { serviceWithoutAppliance } from '@/lib/service-config'

const BRL = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Ordem de serviço da Rodrigues no modelo de documento deles
export function rodriguesOsDoc(tenant: any, call: any, so: any): RodriguesDocProps {
  const header = docHeaderOf(tenant)
  const client = call.client ?? {}
  const clientName = client.name ?? call.contact_name ?? ''
  const useCall = !!call.call_address
  const street = [
    useCall ? call.call_address : client.address,
    useCall ? call.address_number : client.address_number,
    useCall ? call.address_complement : client.address_complement,
  ].filter(Boolean).join(', ')
  const neighborhood = (useCall ? call.call_neighborhood : client.neighborhood) || call.call_neighborhood || client.neighborhood
  const city = (useCall ? call.call_city : client.city) || call.call_city || client.city
  const cityLine = [neighborhood, city ? `${city}${/-[A-Z]{2}$/.test(city) ? '' : '-MG'}` : null].filter(Boolean).join(', ')

  // Itens: na Rodrigues a OS tem uma linha de valor fechado; a descrição
  // do que foi feito (preenchida pelo técnico) vira o texto da linha.
  const rawItems: any[] = so.items ?? []
  const desc = (so.observations ?? '').trim()
  const items = rawItems.map((it: any) => ({
    description: rawItems.length === 1 && desc
      ? desc
      : String(it.description ?? '').replace(/\s*\(valor fechado\)\s*$/i, ''),
    quantity: Number(it.quantity || 1),
    unit_price: Number(it.unit_price ?? 0),
  }))
  const discount = Number(so.discount || 0)
  if (items.length === 0) items.push({ description: desc || call.service_category || 'Serviço', quantity: 1, unit_price: Number(so.total_value || 0) + discount })

  const lines = paymentsFromOs(so)
  const conditions = lines.length === 0 ? null : lines.map(l => {
    const card = l.method === 'Cartão' && l.card_type
      ? ` ${l.card_type === 'credito' ? 'crédito' : 'débito'}${l.card_type === 'credito' && (l.installments ?? 1) > 1 ? ` em ${l.installments}x` : ''}`
      : ''
    return lines.length === 1 ? `${l.method}${card}.` : `${l.method}${card}: ${BRL(l.amount)}`
  }).join('\n')

  const guarantee = so.has_no_guarantee ? 'Sem garantia'
    : so.has_guarantee_1y ? '1 ano'
    : so.has_guarantee_6m ? '6 meses'
    : so.has_guarantee_90 ? '90 dias'
    : so.has_guarantee_60 ? '60 dias'
    : null

  return {
    header,
    title: `Ordem de serviço ${so.os_number ?? ''}`.trim(),
    date: so.date ? new Date(so.date + 'T12:00:00').toLocaleDateString('pt-BR') : '',
    client: {
      name: clientName,
      addressLines: [street, cityLine, client.cep ? `CEP ${client.cep}` : ''],
      phone: client.phone ?? call.contact_phone,
    },
    info: [
      ['Marca', call.device_brand],
      ['Modelo', call.device_model],
      ['Aparelho', call.appliance_type],
      ['Defeito', serviceWithoutAppliance(call.service_category, call.appliance_type, call.device_brand)],
    ],
    items,
    discount,
    payment: conditions ? { conditions } : null,
    guarantee,
    // Sem garantia: o motivo que o técnico escreveu sai em Observações
    extraInfo: so.has_no_guarantee ? (String(so.no_guarantee_reason ?? '').trim() || 'Serviço sem garantia.') : null,
    extraTitle: 'Observações',
    signatures: [header.name, clientName],
  }
}
