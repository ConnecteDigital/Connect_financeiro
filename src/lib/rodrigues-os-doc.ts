import type { RodriguesDocProps } from '@/components/RodriguesDocument'
import { docHeaderOf } from '@/lib/rodrigues-doc'
import { paymentsFromOs } from '@/lib/payments'
import { serviceWithoutAppliance } from '@/lib/service-config'

const BRL = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export type OsDocKind = 'os' | 'orcamento' | 'laudo'
export const OS_DOC_KINDS: { key: OsDocKind; label: string }[] = [
  { key: 'os', label: 'Ordem de serviço' },
  { key: 'orcamento', label: 'Orçamento' },
  { key: 'laudo', label: 'Laudo técnico' },
]

// Cliente e aparelho do chamado, iguais em todo documento
function callDocBase(tenant: any, call: any) {
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
  return {
    header,
    clientName,
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
    ] as [string, string | null | undefined][],
  }
}

const REPORT_TITLE: Record<string, string> = {
  nao_aprovou: 'Relatório de serviço não aprovado',
  pagou_somente_visita: 'Relatório de visita técnica',
  orcamento: 'Relatório de atendimento — orçamento',
}
const REPORT_RESULT: Record<string, string> = {
  nao_aprovou: 'Serviço não aprovado pelo cliente',
  sem_conserto: 'Aparelho sem conserto',
  pagou_somente_visita: 'Serviço não realizado — paga somente a taxa de visita',
  orcamento: 'Orçamento passado — aguardando a decisão do cliente',
}
const REPORT_TEXT: Record<string, string> = {
  nao_aprovou: 'O técnico compareceu ao endereço, avaliou o aparelho e informou o diagnóstico e o valor do serviço. O cliente não aprovou a execução, e o serviço não foi realizado.',
  sem_conserto: 'O técnico compareceu ao endereço e avaliou o aparelho. Foi constatado que o aparelho não tem conserto, e o serviço não foi realizado.',
  pagou_somente_visita: 'O técnico compareceu ao endereço e avaliou o aparelho. O serviço não foi realizado; foi cobrada somente a taxa de visita.',
  orcamento: 'O técnico compareceu ao endereço, avaliou o aparelho e passou o orçamento do serviço. O cliente ficou de decidir sobre a execução.',
}

// Relatório do atendimento que NÃO virou serviço (não aprovado, sem
// conserto, só a taxa, orçamento em aberto) — mesmo modelo da OS, sem
// valores, pro cliente guardar ou pra prestar conta.
export function rodriguesVisitReportDoc(tenant: any, call: any, visits: any[], tecnicoName: string): RodriguesDocProps {
  const base = callDocBase(tenant, call)
  const done = visits.filter(v => v.finished_at).sort((a, b) => String(a.finished_at).localeCompare(String(b.finished_at)))
  const last = done[done.length - 1]
  // Motivo: o que o técnico marcou ao encerrar (ex.: "sem conserto"); senão, o status do chamado
  const reason = last?.outcome && REPORT_RESULT[last.outcome] ? last.outcome : call.status
  const when = last ? new Date(last.finished_at) : new Date((call.scheduled_date ?? call.date) + 'T12:00:00')
  const hm = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const notes = done.map(v => String(v.notes ?? '').trim()).filter(Boolean)
  const fee = Number(call.visit_fee || 0)
  return {
    header: base.header,
    title: `${REPORT_TITLE[call.status] ?? 'Relatório de atendimento'}${call.call_number ? ` ${call.call_number}` : ''}`,
    date: when.toLocaleDateString('pt-BR'),
    client: base.client,
    info: base.info,
    hideItems: true,
    items: [],
    blocks: [
      {
        title: 'Atendimento',
        fields: [
          ['Data da visita', when.toLocaleDateString('pt-BR')],
          ['Horário', last ? `${hm(last.started_at)} às ${hm(last.finished_at)}` : null],
          ['Técnico', tecnicoName || null],
          ['Visitas realizadas', done.length > 1 ? String(done.length) : null],
          ['Resultado', REPORT_RESULT[reason] ?? 'Serviço não realizado'],
          ['Taxa de visita', call.status === 'pagou_somente_visita' && fee > 0 ? BRL(fee) : null],
        ],
      },
      {
        title: 'Descrição',
        text: [REPORT_TEXT[reason] ?? 'O serviço não foi realizado.', ...notes.map(n => `Observação do técnico: ${n}`)].join('\n\n'),
      },
    ],
    signatures: [base.header.name, base.clientName],
  }
}

// Ordem de serviço da Rodrigues no modelo de documento deles. O mesmo
// serviço também sai como Orçamento ou Laudo técnico (muda o título e,
// no laudo, entra o parecer do técnico).
export function rodriguesOsDoc(tenant: any, call: any, so: any, kind: OsDocKind = 'os'): RodriguesDocProps {
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
    title: `${OS_DOC_KINDS.find(k => k.key === kind)!.label} ${so.os_number ?? ''}`.trim(),
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
    // Laudo: o parecer do técnico (o que foi encontrado e feito) em destaque
    blocks: kind === 'laudo' ? [{
      title: 'Parecer técnico',
      text: [
        call.service_category ? `Defeito apresentado: ${serviceWithoutAppliance(call.service_category, call.appliance_type, call.device_brand) || call.service_category}` : '',
        desc ? `Serviço realizado: ${desc}` : 'Serviço realizado conforme descrito abaixo.',
      ].filter(Boolean).join('\n\n'),
    }] : undefined,
    discount,
    payment: conditions ? { conditions } : null,
    guarantee,
    // Sem garantia: o motivo que o técnico escreveu sai em Observações
    extraInfo: so.has_no_guarantee ? (String(so.no_guarantee_reason ?? '').trim() || 'Serviço sem garantia.') : null,
    extraTitle: 'Observações',
    signatures: kind === 'os' ? [header.name, clientName] : [header.name],
  }
}
