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
  const tenantTagline = 'Atendimento 24h · Domingos e Feriados'
  const origin = call.origin as string | null
  const originBranding = origin ? (tenant?.origin_branding?.[origin] ?? null) : null
  const logoUrl = originBranding?.logo_url ?? tenant?.logo_url
  const brandColor = originBranding?.color ?? tenant?.primary_color ?? '#555555'

  const client = call.client
  const clientName = client?.name ?? call.contact_name ?? '—'
  const items: any[] = so.items ?? []
  const TOTAL_ROWS = 6
  const emptyRows = Math.max(0, TOTAL_ROWS - items.length)
  const valorTotal = Number(so.total_value ?? 0)
  const osDate = so.date ? new Date(so.date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const labelSt: React.CSSProperties = { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: 2 }
  const valueSt: React.CSSProperties = { fontSize: 12, fontWeight: 700, minHeight: 16 }
  const cellSt: React.CSSProperties = { padding: '5px 8px', verticalAlign: 'top' }

  return (
    <>
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
        style={{ maxWidth: 720, fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#000', padding: 16 }}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', border: B, marginBottom: 0 }}>
          {/* Logo / Company */}
          <div style={{ flex: 1, padding: '14px 18px', borderRight: B }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={companyName} loading="eager"
                style={{ maxHeight: 56, maxWidth: 200, objectFit: 'contain', display: 'block', marginBottom: 4 }} />
            ) : (
              <p style={{ fontWeight: 900, fontSize: 20, color: brandColor, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{companyName.toUpperCase()}</p>
            )}
            <p style={{ fontSize: 10, color: '#777', marginTop: 4 }}>{tenantTagline}</p>
          </div>
          {/* OS Number */}
          <div style={{ width: 160, padding: '14px 16px', textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#777' }}>Ordem de Serviço</p>
            <p style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, color: '#000', marginTop: 4 }}>{so.os_number}</p>
          </div>
        </div>

        {/* ── DADOS DO CLIENTE ── */}
        <div style={{ border: B, borderTop: 'none', background: '#f5f5f5', padding: '3px 8px', textAlign: 'center', fontWeight: 700, fontSize: 11, letterSpacing: '0.04em' }}>
          DADOS DO CLIENTE
        </div>

        {/* Nome | CNPJ/CPF */}
        <div style={{ display: 'flex', border: B, borderTop: 'none' }}>
          <div style={{ flex: 1, ...cellSt, borderRight: B }}>
            <span style={labelSt}>Nome</span>
            <span style={valueSt}>{clientName}</span>
          </div>
          <div style={{ width: 200, ...cellSt }}>
            <span style={labelSt}>CNPJ / CPF</span>
            <span style={valueSt}>{client?.cpf_cnpj || call.contact_cpf || ''}</span>
          </div>
        </div>

        {/* Endereço | Bairro | CEP */}
        <div style={{ display: 'flex', border: B, borderTop: 'none' }}>
          <div style={{ flex: 2, ...cellSt, borderRight: B }}>
            <span style={labelSt}>Endereço</span>
            <span style={valueSt}>{client?.address || call.call_address || ''}</span>
          </div>
          <div style={{ flex: 1, ...cellSt, borderRight: B }}>
            <span style={labelSt}>Bairro</span>
            <span style={valueSt}>{client?.neighborhood || call.call_neighborhood || ''}</span>
          </div>
          <div style={{ width: 90, ...cellSt }}>
            <span style={labelSt}>CEP</span>
            <span style={valueSt}>{client?.cep || ''}</span>
          </div>
        </div>

        {/* Município | Telefone | UF */}
        <div style={{ display: 'flex', border: B, borderTop: 'none' }}>
          <div style={{ flex: 1, ...cellSt, borderRight: B }}>
            <span style={labelSt}>Município</span>
            <span style={valueSt}>{call.call_city || client?.city || ''}</span>
          </div>
          <div style={{ flex: 1, ...cellSt, borderRight: B }}>
            <span style={labelSt}>Telefone</span>
            <span style={valueSt}>{call.contact_phone || client?.phone || ''}</span>
          </div>
          <div style={{ width: 60, ...cellSt }}>
            <span style={labelSt}>UF</span>
            <span style={valueSt}>{client?.state || ''}</span>
          </div>
        </div>

        {/* ── DADOS DO SERVIÇO ── */}
        <div style={{ border: B, borderTop: 'none', background: '#f5f5f5', padding: '3px 8px', textAlign: 'center', fontWeight: 700, fontSize: 11, letterSpacing: '0.04em' }}>
          DADOS DO SERVIÇO
        </div>

        {/* Categoria | Data */}
        <div style={{ display: 'flex', border: B, borderTop: 'none' }}>
          <div style={{ flex: 1, ...cellSt, borderRight: B }}>
            <span style={labelSt}>Categoria</span>
            <span style={valueSt}>{call.service_category || '—'}</span>
          </div>
          <div style={{ width: 150, ...cellSt }}>
            <span style={labelSt}>Data</span>
            <span style={valueSt}>{osDate}</span>
          </div>
        </div>

        {/* Endereço do Serviço */}
        <div style={{ border: B, borderTop: 'none', ...cellSt }}>
          <span style={labelSt}>Endereço do Serviço</span>
          <span style={valueSt}>{call.call_address ? `${call.call_address}${call.call_city ? ` - ${call.call_city}` : ''}` : (client?.address || '')}</span>
        </div>

        {/* ── SERVIÇOS / PEÇAS ── */}
        <div style={{ border: B, borderTop: 'none', background: '#f5f5f5', padding: '3px 8px', textAlign: 'center', fontWeight: 700, fontSize: 11, letterSpacing: '0.04em' }}>
          SERVIÇOS / PEÇAS
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: 'none' }}>
          <thead>
            <tr>
              <th style={{ border: B, borderTop: 'none', padding: '4px 8px', textAlign: 'left', width: 55, fontWeight: 700 }}>Qtd</th>
              <th style={{ border: B, borderTop: 'none', padding: '4px 8px', textAlign: 'left', fontWeight: 700 }}>Descrição</th>
              <th style={{ border: B, borderTop: 'none', padding: '4px 8px', textAlign: 'right', width: 100, fontWeight: 700 }}>Vlr Unit.</th>
              <th style={{ border: B, borderTop: 'none', padding: '4px 8px', textAlign: 'right', width: 110, fontWeight: 700 }}>Vlr Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, idx: number) => (
              <tr key={it.id ?? idx}>
                <td style={{ border: B, padding: '5px 8px', textAlign: 'left', verticalAlign: 'top' }}>{it.quantity}</td>
                <td style={{ border: B, padding: '5px 8px', verticalAlign: 'top' }}>
                  {it.description}
                  {it.notes && <span style={{ display: 'block', fontSize: 9, color: '#555', marginTop: 2 }}>{it.notes}</span>}
                </td>
                <td style={{ border: B, padding: '5px 8px', textAlign: 'right', verticalAlign: 'top' }}>{BRL(it.unit_price)}</td>
                <td style={{ border: B, padding: '5px 8px', textAlign: 'right', verticalAlign: 'top' }}>{BRL(it.total ?? it.quantity * it.unit_price)}</td>
              </tr>
            ))}
            {Array.from({ length: emptyRows }).map((_, i) => (
              <tr key={`e${i}`}>
                <td style={{ border: B, padding: '5px 8px', height: 24 }}>&nbsp;</td>
                <td style={{ border: B, padding: '5px 8px' }}>&nbsp;</td>
                <td style={{ border: B, padding: '5px 8px' }}>&nbsp;</td>
                <td style={{ border: B, padding: '5px 8px' }}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── TOTAL row ── */}
        <div style={{ border: B, borderTop: 'none', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 48, padding: '6px 12px' }}>
            <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.04em' }}>TOTAL</span>
            <span style={{ fontWeight: 900, fontSize: 14 }}>{BRL(valorTotal)}</span>
          </div>
        </div>

        {/* ── Forma de Pagamento ── */}
        <div style={{ border: B, borderTop: 'none', ...cellSt }}>
          <span style={labelSt}>Forma de Pagamento</span>
          <span style={valueSt}>{so.payment_method || ''}</span>
        </div>

        {/* ── Signature row ── */}
        <div style={{ display: 'flex', border: B, borderTop: 'none' }}>
          {/* Data */}
          <div style={{ flex: 1, padding: '8px 12px', borderRight: B }}>
            <span style={labelSt}>Data</span>
            <div style={{ borderBottom: B, marginTop: 28, marginBottom: 4 }} />
            <span style={{ fontSize: 10, color: '#555' }}>{osDate}</span>
          </div>
          {/* Técnico */}
          <div style={{ flex: 1, padding: '8px 12px', borderRight: B }}>
            <span style={labelSt}>Técnico Responsável</span>
            <div style={{ borderBottom: B, marginTop: 28, marginBottom: 4 }} />
            <span style={{ fontSize: 10, color: '#555' }}>{so.driver || ''}</span>
          </div>
          {/* Assinatura cliente */}
          <div style={{ flex: 1, padding: '8px 12px' }}>
            <span style={labelSt}>Assinatura do Cliente</span>
            <div style={{ borderBottom: B, marginTop: 28, marginBottom: 4 }} />
            <span style={{ fontSize: 10, color: '#555' }}>{clientName}</span>
          </div>
        </div>

        {/* ── Footer ── */}
        <p style={{ textAlign: 'center', fontSize: 10, color: '#777', marginTop: 10 }}>
          {companyName.toUpperCase()} · {tenantTagline}
        </p>
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
