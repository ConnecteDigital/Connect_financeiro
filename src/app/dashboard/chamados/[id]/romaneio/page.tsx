'use client'

import { useEffect, useState, useRef } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { getCall } from '@/lib/db/calls'
import { useTenant } from '@/lib/tenant-context'
import {
  ArrowLeft, Share2, Loader2,
  MapPin, Phone, User, Clock, CalendarDays,
  Wrench, FileText, UserCheck, MessageSquare, Users,
} from 'lucide-react'

function hexToRgb(hex: string): string {
  const h = hex.startsWith('#') ? hex.slice(1) : 'f97316'
  const r = parseInt(h.slice(0, 2), 16) || 249
  const g = parseInt(h.slice(2, 4), 16) || 115
  const b = parseInt(h.slice(4, 6), 16) || 22
  return `${r}, ${g}, ${b}`
}

function RomaneioContent({ id }: { id: string }) {
  const { tenant } = useTenant()
  const [call, setCall] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getCall(id).then(setCall).catch(console.error).finally(() => setLoading(false))
  }, [id])

  async function handleShare() {
    if (!sheetRef.current || sharing) return
    setSharing(true)
    const el = sheetRef.current
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        logging: false,
      })
      const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/png'))
      if (!blob) throw new Error('Falha ao gerar imagem')
      const number = call?.call_number ?? 'romaneio'
      const file = new File([blob], `romaneio-${number}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Romaneio ${number}` })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `romaneio-${number}.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.error('Erro ao compartilhar romaneio:', e)
        alert('Não foi possível compartilhar. Tente novamente.')
      }
    } finally {
      setSharing(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-500">Carregando...</div>
  if (!call) return <div className="flex items-center justify-center h-screen text-slate-500">Chamado não encontrado.</div>

  const companyName = tenant?.name ?? 'Empresa'
  const origin = call.origin as string | null
  const ORIGIN_LABELS: Record<string, string> = {
    site_lider: 'Site Líder', site_poa: 'Site POA', site_millenium: 'Site Millenium',
    site_praja: 'Site Pra Já', indicacao: 'Indicação', terceirizado: 'Terceirizado',
  }
  const originBranding = origin ? (tenant?.origin_branding?.[origin] ?? null) : null
  const siteName = origin ? (ORIGIN_LABELS[origin] ?? origin) : null
  const logoUrl = originBranding?.logo_url ?? tenant?.logo_url
  const primaryColor = originBranding?.color ?? tenant?.primary_color ?? '#f97316'
  const rgb = hexToRgb(primaryColor)

  const client = call.client
  const clientName = client?.name ?? call.contact_name ?? ''
  const phone = call.contact_phone || client?.phone || ''
  const cpf = (call as any).contact_cpf || client?.cpf_cnpj || ''
  const addr1 = call.call_address || client?.address || ''
  const addr2 = [call.call_neighborhood || client?.neighborhood, call.call_city || client?.city].filter(Boolean).join(', ')
  const localizacao = [addr1, addr2].filter(Boolean).join('\n')
  const problem = call.service_category || ''
  const notes = call.notes || ''
  const solicitante = (call as any).solicitante || ''
  const driver = (call as any).driver || ''
  const serviceDate = call.scheduled_date ?? call.date
  const dateLabel = serviceDate ? new Date(serviceDate + 'T12:00:00').toLocaleDateString('pt-BR') : ''
  const time = call.scheduled_time ? String(call.scheduled_time).slice(0, 5) : ''
  const number = call.call_number ?? ''

  const cards: { icon: React.ReactNode; label: string; value: string; wide?: boolean }[] = [
    clientName ? { icon: <User className="w-4 h-4" />, label: 'Cliente', value: clientName, wide: true } : null,
    phone ? { icon: <Phone className="w-4 h-4" />, label: 'Telefone', value: phone } : null,
    cpf ? { icon: <FileText className="w-4 h-4" />, label: 'CPF / CNPJ', value: cpf } : null,
    localizacao ? { icon: <MapPin className="w-4 h-4" />, label: 'Localização', value: localizacao, wide: true } : null,
    problem ? { icon: <Wrench className="w-4 h-4" />, label: 'Serviço', value: problem, wide: true } : null,
    notes ? { icon: <MessageSquare className="w-4 h-4" />, label: 'Observações', value: notes, wide: true } : null,
    solicitante ? { icon: <UserCheck className="w-4 h-4" />, label: 'Solicitante', value: solicitante } : null,
    driver ? { icon: <Users className="w-4 h-4" />, label: 'Técnico Responsável', value: driver } : null,
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string; wide?: boolean }[]

  return (
    <>
      {/* Back link */}
      <div className="print:hidden flex items-center max-w-[500px] mx-auto pt-3 pb-3 px-3">
        <Link href={`/dashboard/chamados/${id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
      </div>

      {/* Romaneio card */}
      <div
        ref={sheetRef}
        className="romaneio-sheet bg-white mx-auto overflow-hidden"
        style={{
          maxWidth: 500,
          borderRadius: 24,
          boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
          fontFamily: 'system-ui, -apple-system, Arial, sans-serif',
        }}
      >
        {/* ── Header colorido ── */}
        <div style={{ background: primaryColor, padding: '28px 24px 24px' }}>
          {/* Topo: logo + nome + número */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            {/* Logo + empresa */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={companyName} loading="eager"
                    style={{ width: 44, height: 44, objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontWeight: 900, fontSize: 24, color: '#fff' }}>{companyName.charAt(0)}</span>
                )}
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                  Romaneio
                </p>
                <p style={{ color: '#fff', fontWeight: 800, fontSize: 16, lineHeight: 1.15 }}>{siteName ?? companyName}</p>
                {siteName && <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 1 }}>{companyName}</p>}
              </div>
            </div>

            {/* Número do chamado */}
            <div style={{
              background: 'rgba(255,255,255,0.18)',
              borderRadius: 16,
              padding: '10px 16px',
              textAlign: 'center',
              backdropFilter: 'blur(4px)',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Chamado
              </p>
              <p style={{ color: '#fff', fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{number}</p>
            </div>
          </div>

          {/* Chips de data e hora */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {dateLabel && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.18)',
                borderRadius: 100, padding: '6px 14px',
              }}>
                <CalendarDays style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.9)' }} />
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{dateLabel}</span>
              </div>
            )}
            {time && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.18)',
                borderRadius: 100, padding: '6px 14px',
              }}>
                <Clock style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.9)' }} />
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{time}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Cards de informação ── */}
        <div style={{ padding: '20px 20px 8px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {cards.map((card, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                background: `rgba(${rgb}, 0.05)`,
                border: `1px solid rgba(${rgb}, 0.14)`,
                borderRadius: 16, padding: '14px 16px',
                width: card.wide ? '100%' : 'calc(50% - 5px)',
                boxSizing: 'border-box',
              }}
            >
              {/* Ícone */}
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: `rgba(${rgb}, 0.13)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: primaryColor,
              }}>
                {card.icon}
              </div>
              {/* Texto */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 4, lineHeight: 1,
                }}>
                  {card.label}
                </p>
                <p style={{
                  fontSize: 14, fontWeight: 600, color: '#0f172a',
                  lineHeight: 1.35, whiteSpace: 'pre-line',
                }}>
                  {card.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Rodapé ── */}
        <div style={{
          margin: '12px 20px 20px',
          background: `rgba(${rgb}, 0.06)`,
          borderRadius: 12, padding: '10px 14px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 11, color: `rgba(${rgb}, 0.9)`, fontWeight: 600 }}>
            Via do técnico — apresentar ao cliente no atendimento
          </p>
        </div>
      </div>

      {/* Espaço para o botão fixo */}
      <div className="print:hidden" style={{ height: 96 }} />

      {/* Botão compartilhar */}
      <div className="print:hidden fixed bottom-6 inset-x-0 flex justify-center z-50">
        <button
          onClick={handleShare}
          disabled={sharing}
          className="flex items-center gap-2.5 text-white font-semibold px-8 py-4 rounded-2xl shadow-2xl transition active:scale-95 disabled:opacity-70"
          style={{ backgroundColor: '#16a34a', boxShadow: '0 8px 24px rgba(22,163,74,0.45)' }}>
          {sharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
          {sharing ? 'Gerando...' : 'Compartilhar'}
        </button>
      </div>

      <style>{`
        @media print {
          @page { margin: 8mm; size: A5; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          aside, nav, header { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .romaneio-sheet {
            max-width: 100% !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  )
}

export default function RomaneioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <RomaneioContent id={id} />
}
