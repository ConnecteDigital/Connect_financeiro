'use client'

import { useEffect, useState, useRef } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { getCall } from '@/lib/db/calls'
import { useTenant } from '@/lib/tenant-context'
import { ArrowLeft, Share2, Loader2, FileImage, FileText } from 'lucide-react'

const BRL = (v: number | string) =>
  `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const B = '1px solid black'

function ImprimirContent({ id }: { id: string }) {
  const { tenant } = useTenant()
  const [call, setCall] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState<'png' | 'pdf' | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getCall(id).then(setCall).catch(console.error).finally(() => setLoading(false))
  }, [id])

  async function buildCanvas() {
    const html2canvas = (await import('html2canvas')).default
    return html2canvas(sheetRef.current!, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    })
  }

  async function handleSharePng() {
    if (!sheetRef.current || sharing) return
    setSharing('png')
    try {
      const canvas = await buildCanvas()
      const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/png'))
      if (!blob) throw new Error('Falha ao gerar imagem')
      const osNumber = call?.service_orders?.[0]?.os_number ?? 'OS'
      const file = new File([blob], `OS-${osNumber}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Ordem de Serviço ${osNumber}` })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `OS-${osNumber}.png`; a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') alert('Não foi possível compartilhar a imagem.')
    } finally {
      setSharing(null)
    }
  }

  async function handleSharePdf() {
    if (!sheetRef.current || sharing) return
    setSharing('pdf')
    try {
      const canvas = await buildCanvas()
      const { jsPDF } = await import('jspdf')
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const ratio = canvas.height / canvas.width
      const imgW = pageW
      const imgH = imgW * ratio
      // Se a imagem for maior que uma página, adiciona páginas extras
      let y = 0
      let remaining = imgH
      while (remaining > 0) {
        pdf.addImage(imgData, 'PNG', 0, -y, imgW, imgH)
        remaining -= pageH
        y += pageH
        if (remaining > 0) pdf.addPage()
      }
      const osNumber = call?.service_orders?.[0]?.os_number ?? 'OS'
      const pdfBlob = pdf.output('blob')
      const file = new File([pdfBlob], `OS-${osNumber}.pdf`, { type: 'application/pdf' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Ordem de Serviço ${osNumber}` })
      } else {
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url; a.download = `OS-${osNumber}.pdf`; a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') alert('Não foi possível gerar o PDF.')
    } finally {
      setSharing(null)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-500">Carregando...</div>
  if (!call) return <div className="flex items-center justify-center h-screen text-slate-500">Chamado não encontrado.</div>

  const isSimplified = tenant?.call_form_config?.simplified === true

  // ── Millenium romaneio (simplified tenants) ──
  if (isSimplified) {
    const logoUrl = tenant?.logo_url
    const callNumber = call.id?.slice(-6)?.toUpperCase() ?? '—'
    const callDateRaw = call.date ? new Date(call.date + 'T12:00:00') : null
    const callDateStr = callDateRaw ? callDateRaw.toLocaleDateString('pt-BR') : '___/___/______'
    const callTime = call.scheduled_time ?? ''
    const clientName = call.contact_name ?? call.client?.name ?? ''
    const address = call.call_address ?? call.client?.address ?? ''
    const problem = call.service_category ?? ''
    const cpf = call.contact_cpf ?? call.client?.cpf_cnpj ?? ''
    const phone = call.contact_phone ?? call.client?.phone ?? ''
    const STATUS_LABELS = ['Agendado', 'Realizado', 'Orçamento', 'Chamado']
    const STATUS_MAP: Record<string, string> = {
      agendado: 'Agendado', aprovado: 'Realizado', orcamento: 'Orçamento', aberto: 'Chamado',
    }
    const activeStatus = STATUS_MAP[call.status ?? ''] ?? null

    const navy = '#1a2e5a'
    const lineStyle: React.CSSProperties = { borderBottom: `1.5px solid ${navy}`, minHeight: 28, marginBottom: 10 }
    const labelStyle: React.CSSProperties = { fontWeight: 800, fontSize: 13, color: navy, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }

    return (
      <>
        <div className="print:hidden flex items-center max-w-xl mx-auto pt-3 pb-2 px-3">
          <Link href={`/dashboard/chamados/${id}`}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
        </div>

        <div
          ref={sheetRef}
          className="os-sheet bg-white mx-auto"
          style={{ maxWidth: 600, fontFamily: 'Arial, sans-serif', color: navy, padding: 32, minHeight: 700 }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            {/* Logo */}
            <div style={{ width: 160 }}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={tenant?.name ?? 'Logo'} loading="eager"
                  style={{ maxWidth: 150, maxHeight: 70, objectFit: 'contain' }} />
              ) : (
                <span style={{ fontWeight: 900, fontSize: 20, color: navy }}>{tenant?.name ?? ''}</span>
              )}
            </div>
            {/* CHAMADO / DATA / HORÁRIO */}
            <div style={{ textAlign: 'right', fontSize: 12, color: navy }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 4 }}>
                <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>Chamado:</span>
                <span style={{ borderBottom: `1.5px solid ${navy}`, minWidth: 80, display: 'inline-block', paddingBottom: 1 }}>{callNumber}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 4 }}>
                <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>Data:</span>
                <span style={{ borderBottom: `1.5px solid ${navy}`, minWidth: 110, display: 'inline-block', paddingBottom: 1 }}>{callDateStr}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>Horário:</span>
                <span style={{ borderBottom: `1.5px solid ${navy}`, minWidth: 70, display: 'inline-block', paddingBottom: 1 }}>{callTime}</span>
              </div>
            </div>
          </div>

          {/* Body fields */}
          <div style={{ marginBottom: 8 }}>
            <p style={labelStyle}>Cliente</p>
            <div style={{ ...lineStyle, fontSize: 13, paddingBottom: 2 }}>{clientName}</div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <p style={labelStyle}>Localização</p>
            <div style={{ ...lineStyle, fontSize: 13, paddingBottom: 2 }}>{address}</div>
            <div style={{ ...lineStyle }} />
          </div>

          <div style={{ marginBottom: 8 }}>
            <p style={labelStyle}>Problema</p>
            <div style={{ ...lineStyle, fontSize: 13, paddingBottom: 2 }}>{problem}</div>
            <div style={{ ...lineStyle }} />
          </div>

          <div style={{ marginBottom: 8 }}>
            <p style={labelStyle}>CPF</p>
            <div style={{ ...lineStyle, fontSize: 13, paddingBottom: 2 }}>{cpf}</div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <p style={labelStyle}>Telefone para Contato</p>
            <div style={{ ...lineStyle, fontSize: 13, paddingBottom: 2 }}>{phone}</div>
          </div>

          {/* Status circles */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 16 }}>
            {STATUS_LABELS.map(label => {
              const active = label === activeStatus
              return (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    border: `2.5px solid ${navy}`,
                    background: active ? navy : 'transparent',
                  }} />
                  <span style={{ fontWeight: 700, fontSize: 12, color: navy, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="print:hidden" style={{ height: 96 }} />

        <div className="print:hidden fixed bottom-6 inset-x-0 flex justify-center gap-3 z-50">
          <button onClick={handleSharePng} disabled={!!sharing}
            className="flex items-center gap-2 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-2xl transition active:scale-95 disabled:opacity-70"
            style={{ backgroundColor: '#16a34a', boxShadow: '0 8px 24px rgba(22,163,74,0.40)' }}>
            {sharing === 'png' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileImage className="w-5 h-5" />}
            {sharing === 'png' ? 'Gerando...' : 'Imagem'}
          </button>
          <button onClick={handleSharePdf} disabled={!!sharing}
            className="flex items-center gap-2 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-2xl transition active:scale-95 disabled:opacity-70"
            style={{ backgroundColor: '#2563eb', boxShadow: '0 8px 24px rgba(37,99,235,0.40)' }}>
            {sharing === 'pdf' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
            {sharing === 'pdf' ? 'Gerando...' : 'PDF'}
          </button>
        </div>

        <style>{`
          @media print {
            @page { margin: 10mm; size: A4; }
            html, body { background: white !important; }
            .print\\:hidden { display: none !important; }
            aside, nav, header { display: none !important; }
            main { padding: 0 !important; margin: 0 !important; }
            .os-sheet { max-width: 100% !important; }
          }
        `}</style>
      </>
    )
  }

  const so = call.service_orders?.[0]
  if (!so) return <div className="flex items-center justify-center h-screen text-slate-500">Este chamado não possui ordem de serviço.</div>

  const companyName = tenant?.name ?? 'Empresa'
  const cnpj = tenant?.cnpj ?? ''
  const tenantPhone = tenant?.phone ?? ''
  const ORIGIN_LABELS: Record<string, string> = {
    site_lider: 'Site Líder', site_poa: 'Site POA', site_millenium: 'Site Millenium',
    site_praja: 'Site Pra Já', indicacao: 'Indicação', terceirizado: 'Terceirizado',
  }
  const origin = call.origin as string | null
  const originBranding = origin ? (tenant?.origin_branding?.[origin] ?? null) : null
  const siteName = origin ? (ORIGIN_LABELS[origin] ?? origin) : null
  const logoUrl = originBranding?.logo_url ?? tenant?.logo_url
  const brandColor = originBranding?.color ?? null

  const client = call.client
  const clientName = client?.name ?? call.contact_name ?? '—'
  const items: any[] = so.items ?? []
  const TOTAL_ROWS = 8
  const emptyRows = Math.max(0, TOTAL_ROWS - items.length)

  const totalServicos = items.reduce((acc: number, it: any) => acc + Number(it.total ?? it.quantity * it.unit_price), 0)
  const locacao = Number(so.equipment_rental_value ?? 0)
  const desconto = Number(so.discount ?? 0)
  const impostos = Number(so.taxes ?? 0)
  const valorTotal = Number(so.total_value ?? 0)

  const osDate = so.date ? new Date(so.date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const levChecks = [
    { label: 'Com planta baixa', on: !!so.has_floor_plan },
    { label: 'Sem planta baixa', on: !!so.has_no_floor_plan },
    { label: 'Com planta hidráulica', on: !!so.has_hydraulic_plan },
    { label: 'Sem planta hidráulica', on: !!so.has_no_hydraulic_plan },
    { label: 'Sem conhecimento', on: !!so.has_no_knowledge },
    { label: 'Sem garantia', on: !!so.has_no_guarantee },
    { label: 'Com garantia 30 dias', on: !!so.has_guarantee },
  ]

  const cobrancaItems = ['Metro Linear', 'Metro Cúbico', 'Litros', 'Carga', 'Valor Fechado', 'Metro Quadrado']

  return (
    <>
      {/* Voltar */}
      <div className="print:hidden flex items-center max-w-3xl mx-auto pt-3 pb-2 px-3">
        <Link href={`/dashboard/chamados/${id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
      </div>

      {/* OS Sheet */}
      <div
        ref={sheetRef}
        className="os-sheet bg-white mx-auto"
        style={{ maxWidth: 760, fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#000', padding: 12 }}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', border: B }}>
          {/* Logo */}
          <div style={{ width: 120, borderRight: B, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, flexShrink: 0, background: brandColor ? `${brandColor}18` : undefined }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={siteName ?? companyName} loading="eager"
                style={{ maxWidth: 100, maxHeight: 64, objectFit: 'contain' }} />
            ) : (
              <p style={{ fontWeight: 900, fontSize: 16, textAlign: 'center', color: brandColor ?? '#000' }}>{siteName ?? companyName}</p>
            )}
          </div>
          {/* Company info */}
          <div style={{ flex: 1, padding: '8px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: brandColor ?? '#000' }}>{siteName ?? companyName}</p>
            {siteName && <p style={{ fontSize: 11, color: '#666' }}>{companyName}</p>}
            {cnpj && <p style={{ fontSize: 11 }}>CNPJ: {cnpj}</p>}
            {tenantPhone && <p style={{ fontSize: 11 }}>Fone: {tenantPhone}</p>}
            {!cnpj && !tenantPhone && <p style={{ fontSize: 11 }}>Atendimento 24h · Domingos e Feriados</p>}
          </div>
          {/* OS number */}
          <div style={{ width: 130, borderLeft: B, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 8, flexShrink: 0 }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ordem de Serviço</p>
            <p style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1, color: brandColor ?? '#000' }}>{so.os_number}</p>
            <p style={{ fontSize: 10 }}>{osDate}</p>
          </div>
        </div>

        {/* ── Client data grid ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: 'none' }}>
          <tbody>
            <tr>
              <OSCell label="Código do Cliente" value="" style={{ width: 110 }} />
              <OSCell label="OS" value={String(so.os_number)} style={{ width: 70 }} />
              <OSCell label="Bairro" value={call.call_neighborhood || client?.neighborhood || ''} />
              <OSCell label="ESTADO" value={client?.state || ''} style={{ width: 56 }} />
            </tr>
            <tr>
              <OSCell label="Nome" value={clientName} colSpan={2} />
              <OSCell label="CEP" value={client?.cep || ''} />
              <OSCell label="Inscrição Est." value="" style={{ width: 56 }} />
            </tr>
            <tr>
              <OSCell label="Endereço" value={call.call_address || client?.address || ''} colSpan={2} />
              <OSCell label="Cidade" value={call.call_city || client?.city || ''} />
              <OSCell label="Veículo" value="" />
            </tr>
            <tr>
              <OSCell label="Data do Vcto" value={osDate} style={{ width: 110 }} />
              <OSCell label="CPF/CNPJ" value={client?.cpf_cnpj || ''} />
              <OSCell label="Motorista" value={so.driver || ''} />
              <OSCell label="NF" value={so.nf_number || ''} style={{ width: 56 }} />
            </tr>
            <tr>
              <OSCell label="Fone" value={call.contact_phone || client?.phone || ''} />
              <OSCell label="Forma de Pagto" value={so.payment_method || ''} colSpan={3} />
            </tr>
          </tbody>
        </table>

        {/* ── Service items ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: 'none' }}>
          <thead>
            <tr style={{ background: brandColor ? `${brandColor}22` : '#f3f4f6' }}>
              <th style={{ border: B, padding: '3px 5px', textAlign: 'left', width: 50 }}>Quant.</th>
              <th style={{ border: B, padding: '3px 5px', textAlign: 'left' }}>Descrição</th>
              <th style={{ border: B, padding: '3px 5px', textAlign: 'right', width: 90 }}>R$ Unit.</th>
              <th style={{ border: B, padding: '3px 5px', textAlign: 'right', width: 90 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any) => (
              <tr key={it.id}>
                <td style={{ border: B, padding: '3px 5px', textAlign: 'center' }}>{it.quantity}</td>
                <td style={{ border: B, padding: '3px 5px' }}>
                  {it.description}
                  {it.notes && (
                    <span style={{ display: 'block', fontSize: 10, color: '#374151' }}>{it.notes}</span>
                  )}
                </td>
                <td style={{ border: B, padding: '3px 5px', textAlign: 'right' }}>{BRL(it.unit_price)}</td>
                <td style={{ border: B, padding: '3px 5px', textAlign: 'right' }}>{BRL(it.total ?? it.quantity * it.unit_price)}</td>
              </tr>
            ))}
            {Array.from({ length: emptyRows }).map((_, i) => (
              <tr key={`e${i}`}>
                <td style={{ border: B, padding: '3px 5px', height: 20 }}>&nbsp;</td>
                <td style={{ border: B, padding: '3px 5px' }}>&nbsp;</td>
                <td style={{ border: B, padding: '3px 5px' }}>&nbsp;</td>
                <td style={{ border: B, padding: '3px 5px' }}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Locação row ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: 'none' }}>
          <tbody>
            <tr>
              <td style={{ border: B, padding: '3px 5px', fontWeight: 700, fontSize: 10 }}>
                Locação de Equipamentos e Mão de Obra
              </td>
              <td style={{ border: B, padding: '3px 5px', textAlign: 'right', width: 90 }}>
                {locacao > 0 ? BRL(locacao) : ''}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Sistema de Cobrança + Levantamento + Totals ── */}
        <div style={{ display: 'flex', border: B, borderTop: 'none' }}>
          {/* Left: checkboxes */}
          <div style={{ flex: 1, padding: '6px 8px', borderRight: B }}>
            <p style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Sistema de Cobrança</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
              {cobrancaItems.map(c => (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                  <span style={{ display: 'inline-block', width: 11, height: 11, border: B, flexShrink: 0 }} />
                  {c}
                </div>
              ))}
            </div>
            <p style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', marginTop: 8, marginBottom: 4 }}>Levantamento</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
              {levChecks.map(c => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 11, height: 11, border: B, flexShrink: 0,
                    background: c.on ? '#000' : 'transparent', color: '#fff', fontSize: 8, fontWeight: 900
                  }}>{c.on ? '✓' : ''}</span>
                  {c.label}
                </div>
              ))}
            </div>
          </div>
          {/* Right: totals */}
          <div style={{ width: 160, flexShrink: 0 }}>
            <TotalRow label="Total dos Serviços" value={BRL(totalServicos)} />
            <TotalRow label="Descontos" value={desconto > 0 ? `- ${BRL(desconto)}` : ''} />
            <TotalRow label="Impostos" value={impostos > 0 ? BRL(impostos) : ''} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: brandColor ?? '#111', color: '#fff', fontWeight: 900, fontSize: 12 }}>
              <span>VALOR TOTAL</span>
              <span>{BRL(valorTotal)}</span>
            </div>
          </div>
        </div>

        {/* ── Condições + Observações ── */}
        <div style={{ display: 'flex', border: B, borderTop: 'none' }}>
          <div style={{ flex: 1, padding: '5px 8px', borderRight: B }}>
            <p style={{ fontWeight: 700, fontSize: 9, textTransform: 'uppercase', marginBottom: 3 }}>Condições de Pagamento</p>
            <p style={{ fontSize: 11, minHeight: 28 }}>{so.conditions || ''}</p>
          </div>
          <div style={{ flex: 1, padding: '5px 8px' }}>
            <p style={{ fontWeight: 700, fontSize: 9, textTransform: 'uppercase', marginBottom: 3 }}>Observações</p>
            <p style={{ fontSize: 11, minHeight: 28 }}>{so.observations || call.notes || ''}</p>
          </div>
        </div>

        {/* ── Signature text ── */}
        <div style={{ border: B, borderTop: 'none', padding: '5px 8px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 600 }}>
            PAGAREI(emos) PELO(s) SERVIÇO(s) PRESTADO(s) O VALOR TOTAL DE R$__________
          </p>
          <p style={{ fontSize: 10, color: '#444', marginTop: 2 }}>
            Declaro que os serviços acima descritos foram prestados a contento.
          </p>
        </div>

        {/* ── Signature row ── */}
        <div style={{ display: 'flex', border: B, borderTop: 'none' }}>
          <SigCell label="Data" bottom={osDate} flex={1} />
          <SigCell label="Assinatura" bottom="" flex={2} />
          <SigCell label="Carro" bottom="" flex={1} />
          <div style={{ flex: 1, borderLeft: B, padding: '5px 8px' }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Prof. 1</p>
            <div style={{ borderBottom: B, marginTop: 18, marginBottom: 6 }} />
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Prof. 2</p>
            <div style={{ borderBottom: B, marginTop: 18 }} />
          </div>
        </div>
      </div>

      {/* Espaço para o botão fixo não cobrir o fim da folha */}
      <div className="print:hidden" style={{ height: 96 }} />

      {/* Botões de compartilhar fixos no rodapé */}
      <div className="print:hidden fixed bottom-6 inset-x-0 flex justify-center gap-3 z-50">
        <button
          onClick={handleSharePng}
          disabled={!!sharing}
          className="flex items-center gap-2 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-2xl transition active:scale-95 disabled:opacity-70"
          style={{ backgroundColor: '#16a34a', boxShadow: '0 8px 24px rgba(22,163,74,0.40)' }}>
          {sharing === 'png' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileImage className="w-5 h-5" />}
          {sharing === 'png' ? 'Gerando...' : 'Imagem'}
        </button>
        <button
          onClick={handleSharePdf}
          disabled={!!sharing}
          className="flex items-center gap-2 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-2xl transition active:scale-95 disabled:opacity-70"
          style={{ backgroundColor: '#2563eb', boxShadow: '0 8px 24px rgba(37,99,235,0.40)' }}>
          {sharing === 'pdf' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
          {sharing === 'pdf' ? 'Gerando...' : 'PDF'}
        </button>
      </div>

      <style>{`
        @media print {
          @page { margin: 7mm; size: A4; }
          html, body { background: white !important; height: auto !important; overflow: visible !important; }
          .print\\:hidden { display: none !important; }
          aside, nav, header { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .os-sheet { max-width: 100% !important; padding: 4px !important; }
        }
      `}</style>
    </>
  )
}

function OSCell({ label, value, colSpan, style }: { label: string; value: string; colSpan?: number; style?: React.CSSProperties }) {
  return (
    <td colSpan={colSpan} style={{ border: '1px solid black', padding: '2px 5px', verticalAlign: 'top', ...style }}>
      <p style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', lineHeight: 1, marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 11, minHeight: 14 }}>{value || ' '}</p>
    </td>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid black', fontSize: 10 }}>
      <span>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function SigCell({ label, bottom, flex }: { label: string; bottom: string; flex: number }) {
  return (
    <div style={{ flex, borderLeft: flex > 1 ? 'none' : '1px solid black', borderRight: '1px solid black', padding: '5px 8px' }}>
      <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>{label}</p>
      <div style={{ borderBottom: '1px solid black', marginTop: 24, paddingBottom: 2 }}>
        {bottom && <span style={{ fontSize: 9, color: '#555' }}>{bottom}</span>}
      </div>
    </div>
  )
}

export default function ImprimirOSPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ImprimirContent id={id} />
}
