'use client'

import { Phone, MapPin } from 'lucide-react'
import { formatAddress } from '@/lib/address'
import type { Tenant } from '@/lib/tenant-context'

// Réplica do formulário em papel da Rodrigues ("Certificado de Garantia").
// Renderizado dentro da folha capturada pelo html2canvas (Imagem/PDF) e
// usado na impressão — por isso só estilos inline e preto/cinza.

const BRL = (v: number | string) =>
  `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const LINE = '1px solid #000'
const BAND_BG = '#e9e9e9'
const DISPLAY_FONT = "'Lilita One', 'Arial Black', Impact, sans-serif"
const MIN_ROWS = 7

interface Row { tipo: string; quant: string; valor: string }

function Band({ children }: { children: string }) {
  return (
    <div style={{
      background: BAND_BG, textAlign: 'center', fontSize: 13, letterSpacing: '0.45em',
      padding: '3px 0', margin: '6px 44px 0', textTransform: 'uppercase',
    }}>
      {children}
    </div>
  )
}

function Box({ checked }: { checked: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 13, height: 13, border: LINE, marginRight: 5, fontSize: 11, fontWeight: 700,
      lineHeight: 1, verticalAlign: 'middle', flexShrink: 0,
    }}>
      {checked ? 'X' : ''}
    </span>
  )
}

function FieldLine({ label, value, width }: { label: string; value: string; width?: number | string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginTop: 6, fontSize: 11 }}>
      <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{label}:</span>
      <span style={{ borderBottom: LINE, flex: width ? undefined : 1, width, minHeight: 15, paddingLeft: 4, fontSize: 11 }}>
        {value}
      </span>
    </div>
  )
}

export default function RodriguesCertificado({
  tenant, call, so, parts, tecnicoName,
}: {
  tenant: Tenant | null
  call: any
  so: any
  parts: any[]
  tecnicoName: string
}) {
  const client = call.client
  const clientName = client?.name ?? call.contact_name ?? ''
  const address = formatAddress({
    address: call.call_address || client?.address,
    number: call.call_address ? call.address_number : client?.address_number,
    complement: call.call_address ? call.address_complement : client?.address_complement,
    neighborhood: call.call_neighborhood || client?.neighborhood,
    city: call.call_city || client?.city,
  })
  const date = so.date ? new Date(so.date + 'T12:00:00').toLocaleDateString('pt-BR') : ''
  const defeito = (call.service_category
    || [call.appliance_type, call.device_brand].filter(Boolean).join(' ')
    || '').trim()

  const [firstWord, ...restWords] = (tenant?.name ?? 'Empresa').toUpperCase().split(' ')
  const restName = restWords.join(' ')

  const rows: Row[] = [
    ...(so.items ?? []).map((it: any) => ({
      tipo: String(it.description ?? '').replace(/\s*\(valor fechado\)\s*$/i, ''),
      quant: String(it.quantity ?? ''),
      valor: BRL(it.total ?? Number(it.quantity || 0) * Number(it.unit_price || 0)),
    })),
    ...parts.map(p => ({
      tipo: p.item_name,
      quant: String(p.quantity ?? ''),
      valor: BRL(p.total_value),
    })),
  ]
  const descricao = (so.observations ?? '').trim()
  const emptyRows = Math.max(0, MIN_ROWS - rows.length - (descricao ? 1 : 0))

  // Garantia → caixas do papel
  const noGuarantee = !!so.has_no_guarantee
  const labor90 = !!(so.has_guarantee_90 || so.has_guarantee_6m || so.has_guarantee_1y)
  const partsExtra = !!(so.has_guarantee_6m || so.has_guarantee_1y)
  const partsExtraLabel = so.has_guarantee_1y
    ? 'Garantia adicional sobre peças 1 ano'
    : 'Garantia adicional sobre peças 6 meses'

  const cell: React.CSSProperties = { border: LINE, padding: '3px 6px', fontSize: 11, height: 22 }

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#000', fontSize: 11 }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lilita+One&display=swap" />

      {/* ── Cabeçalho ── */}
      <div style={{ background: BAND_BG, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
        {tenant?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tenant.logo_url} alt=""
            style={{ width: 72, height: 72, objectFit: 'contain', flexShrink: 0 }} />
        )}
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 30, lineHeight: 0.95, letterSpacing: '0.02em' }}>
          <div>{firstWord}</div>
          {restName && <div>{restName}</div>}
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right', fontFamily: DISPLAY_FONT, lineHeight: 1.35 }}>
          {tenant?.cnpj && <div style={{ fontSize: 17 }}>CNPJ: {tenant.cnpj}</div>}
          {tenant?.phone && (
            <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: 7, background: '#000' }}>
                <Phone style={{ width: 8, height: 8, color: '#fff' }} strokeWidth={3} />
              </span>
              TELEFONE: {tenant.phone}
            </div>
          )}
          {tenant?.address && (
            <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
              <MapPin style={{ width: 11, height: 11 }} strokeWidth={3} />
              {tenant.address.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* ── Título ── */}
      <div style={{ position: 'relative', textAlign: 'center', marginTop: 6 }}>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 30, letterSpacing: '0.03em' }}>CERTIFICADO DE GARANTIA</div>
        {so.os_number && (
          <div style={{ position: 'absolute', right: 0, top: 10, fontSize: 10, color: '#444' }}>OS {so.os_number}</div>
        )}
      </div>

      {/* ── Dados ── */}
      <FieldLine label="DATA" value={date} width={110} />
      <FieldLine label="Nome do cliente" value={clientName} />
      <FieldLine label="Endereço" value={address} />

      {/* ── Defeito apresentado ── */}
      <Band>Defeito apresentado</Band>
      <div style={{ border: LINE, margin: '0 44px', minHeight: 36, padding: '4px 8px', fontSize: 12 }}>
        {defeito}
      </div>

      {/* ── Descrição do serviço ── */}
      <Band>Descrição do serviço</Band>
      <table style={{ borderCollapse: 'collapse', width: 'calc(100% - 88px)', margin: '0 44px' }}>
        <thead>
          <tr>
            <th style={{ ...cell, fontWeight: 400, textAlign: 'center' }}>TIPO</th>
            <th style={{ ...cell, fontWeight: 400, textAlign: 'center', width: 70 }}>QUANT.</th>
            <th style={{ ...cell, fontWeight: 400, textAlign: 'center', width: 130 }}>VALOR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={cell}>{r.tipo}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{r.quant}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{r.valor}</td>
            </tr>
          ))}
          {descricao && (
            <tr>
              <td colSpan={3} style={{ ...cell, height: 'auto', whiteSpace: 'pre-wrap' }}>{descricao}</td>
            </tr>
          )}
          {Array.from({ length: emptyRows }).map((_, i) => (
            <tr key={`e${i}`}>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
            </tr>
          ))}
          <tr>
            <td style={cell}>&nbsp;</td>
            <td style={cell}>&nbsp;</td>
            <td style={{ ...cell, fontWeight: 700 }}>
              TOTAL: <span style={{ float: 'right' }}>{BRL(so.total_value)}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Prazo da garantia ── */}
      <Band>Prazo da garantia</Band>
      <div style={{ border: LINE, margin: '0 44px', padding: '4px 6px', fontSize: 12, lineHeight: 1.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}><Box checked={noGuarantee} />Sem garantia</span>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}><Box checked={labor90} />Garantia de 90 dias sobre MÃO DE OBRA — conforme CDC</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Box checked={partsExtra} />{partsExtraLabel}
        </div>
      </div>

      {/* ── Termos ── */}
      <div style={{ border: LINE, marginTop: 6, padding: '4px 6px', fontSize: 10, lineHeight: 1.3, textAlign: 'justify' }}>
        <b>ATENDIMENTO EM GARANTIA</b> - O atendimento será realizado no prazo legal de até 30 dias,
        conforme o Código de Defesa do Consumidor. O prazo conta a partir da comunicação do cliente
        informando o defeito. O atendimento é agendado de acordo com a disponibilidade técnica,
        respeitando o prazo legal. <b>POLÍTICA DE REEMBOLSO</b> - Em caso de solicitação de reembolso,
        somente o valor da mão de obra poderá ser devolvido, pois as peças instaladas não podem ser
        reaproveitadas. Se o problema não for solucionado pela empresa dentro do prazo legal de 30 dias, o
        cliente poderá escolher entre: 1. Reembolso parcial descontando o valor das peças utilizadas. 2.
        Nova execução do serviço sem custo adicional. 3. Abatimento proporcional no valor pago. TERMOS E{' '}
        <b>CONDIÇÕES DA GARANTIA -</b> A garantia cobre: O defeito reparado neste atendimento. A mão de
        obra realizada pela empresa. Peças fornecidas pela empresa conforme fabricante. A garantia <b>NÃO</b>{' '}
        cobre: Oscilação ou queda de energia. Mau uso, falta de manutenção, instalação inadequada.
        Defeitos diferentes do reparado. danos posteriores ou ação de terceiros. violação de lacres. avarias
        externas. Condições para uso da garantia: Apresentar este recibo. Novo problema = novo orçamento.
        pagamento deve estar quitado.
      </div>

      {/* ── Declaração ── */}
      <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, margin: '14px 40px 0', lineHeight: 1.4 }}>
        Declaro que eu estou ciente do defeito diagnosticado, dos materiais e valores
        descritos. Eu estou de acordo, e autorizo a execução desse serviço.
      </p>

      {/* ── Assinaturas ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 60, marginTop: 34, padding: '0 6px' }}>
        {[{ label: 'Cliente', name: clientName }, { label: 'Técnico', name: tecnicoName }].map(s => (
          <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: LINE, paddingTop: 2, fontWeight: 700, fontSize: 11 }}>{s.label}</div>
            {s.name && <div style={{ fontSize: 9, color: '#444', marginTop: 1 }}>{s.name}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
