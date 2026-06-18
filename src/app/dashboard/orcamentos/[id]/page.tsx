'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Share2, Check, X, Loader2 } from 'lucide-react'

const ORIGIN_LABELS: Record<string, string> = {
  site_lider: 'Site Líder',
  site_poa: 'Site POA',
  site_millenium: 'Site Millenium',
  site_praja: 'Site Pra Já',
  indicacao: 'Indicação',
  terceirizado: 'Terceirizado',
}

interface QuoteItem {
  description: string
  quantity: number
  unit_price: number
}

interface Quote {
  id: string
  quote_number: string | null
  client_name: string
  client_phone: string | null
  client_cpf: string | null
  client_address: string | null
  client_city: string | null
  service_category: string | null
  service_description: string | null
  items: QuoteItem[]
  subtotal: number
  discount: number
  taxes: number
  total: number
  valid_until: string | null
  status: string
  origin: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface Tenant {
  id: string
  name: string
  logo_url: string | null
  primary_color: string
  origin_branding?: Record<string, { color: string; logo_url?: string }>
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function hexToRgb(hex: string): string {
  const h = hex.startsWith('#') ? hex.slice(1) : 'f97316'
  const r = parseInt(h.slice(0, 2), 16) || 249
  const g = parseInt(h.slice(2, 4), 16) || 115
  const b = parseInt(h.slice(4, 6), 16) || 22
  return `${r}, ${g}, ${b}`
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pendente: { label: 'Pendente', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  aprovado: { label: 'Aprovado', bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  recusado: { label: 'Recusado', bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
  expirado: { label: 'Expirado', bg: 'rgba(113,113,122,0.12)', color: '#71717a' },
}

export default function OrcamentoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [quote, setQuote] = useState<Quote | null>(null)
  const [tenantData, setTenantData] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [sharing, setSharing] = useState(false)
  const shareCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    const supabase = createClient()
    async function load() {
      const { data: qData } = await supabase.from('quotes').select('*').eq('id', id).single()
      if (qData) setQuote(qData)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
        if (profile?.tenant_id) {
          const { data: t } = await supabase.from('tenants').select('id, name, logo_url, primary_color, origin_branding').eq('id', profile.tenant_id).single()
          if (t) setTenantData(t as Tenant)
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function handleShare() {
    if (!shareCardRef.current || sharing) return
    setSharing(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        logging: false,
      })
      const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/png'))
      if (!blob) throw new Error('Falha ao gerar imagem')
      const number = quote?.quote_number ?? 'orcamento'
      const file = new File([blob], `orcamento-${number}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Orçamento ${number}` })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `orcamento-${number}.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e: unknown) {
      if ((e as { name?: string })?.name !== 'AbortError') {
        console.error('Erro ao compartilhar orçamento:', e)
        alert('Não foi possível compartilhar. Tente novamente.')
      }
    } finally {
      setSharing(false)
    }
  }

  async function updateStatus(newStatus: string) {
    if (!quote) return
    setUpdatingStatus(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from('quotes').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', quote.id).select().single()
      if (data) setQuote(data)
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--text-secondary)' }}>
        Orçamento não encontrado.
        <Link href="/dashboard/orcamentos" className="block mt-2 text-sm" style={{ color: 'var(--primary)' }}>Voltar</Link>
      </div>
    )
  }

  const status = STATUS_MAP[quote.status] ?? STATUS_MAP.pendente
  const originBranding = quote.origin ? (tenantData?.origin_branding?.[quote.origin] ?? null) : null
  const brandColor = originBranding?.color ?? tenantData?.primary_color ?? '#f97316'
  const brandLogo = originBranding?.logo_url ?? tenantData?.logo_url
  const siteName = quote.origin ? (ORIGIN_LABELS[quote.origin] ?? quote.origin) : null
  const rgb = hexToRgb(brandColor)

  const clientFields = [
    ['Nome', quote.client_name],
    ['Telefone', quote.client_phone],
    ['CPF/CNPJ', quote.client_cpf],
    ['Endereço', quote.client_address],
    ['Cidade', quote.client_city],
  ].filter(([, v]) => v) as [string, string][]

  return (
    <>
      {/* Screen view */}
      <div className="space-y-5 max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/orcamentos" className="w-9 h-9 rounded-xl flex items-center justify-center transition"
              style={{ background: 'var(--surface-secondary)' }}>
              <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{quote.quote_number ?? 'Orçamento'}</h1>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: status.bg, color: status.color }}>{status.label}</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{quote.client_name}</p>
            </div>
          </div>
          <button onClick={handleShare} disabled={sharing} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition flex-shrink-0"
            style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
            {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden sm:inline">Compartilhar</span>
          </button>
        </div>

        {/* Status actions */}
        {quote.status === 'pendente' && (
          <div className="flex gap-3">
            <button onClick={() => updateStatus('aprovado')} disabled={updatingStatus}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
              {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Aprovar
            </button>
            <button onClick={() => updateStatus('recusado')} disabled={updatingStatus}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Recusar
            </button>
          </div>
        )}

        {/* Client info card */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Dados do Cliente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              ['Nome', quote.client_name],
              ['Telefone', quote.client_phone],
              ['CPF/CNPJ', quote.client_cpf],
              ['Endereço', quote.client_address],
              ['Cidade', quote.client_city],
              ['Origem', siteName],
              ['Válido até', quote.valid_until ? new Date(quote.valid_until + 'T12:00:00').toLocaleDateString('pt-BR') : null],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={String(label)}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                <p className="font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{String(value)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Itens do Orçamento</h2>
          <div className="space-y-2">
            {(quote.items ?? []).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.description}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.quantity}x {fmt(item.unit_price)}</p>
                </div>
                <p className="text-sm font-semibold flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{fmt(item.quantity * item.unit_price)}</p>
              </div>
            ))}
          </div>
          <div className="pt-2 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
              <span style={{ color: 'var(--text-primary)' }}>{fmt(Number(quote.subtotal))}</span>
            </div>
            {Number(quote.discount) > 0 && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Desconto</span>
                <span className="text-red-500">- {fmt(Number(quote.discount))}</span>
              </div>
            )}
            {Number(quote.taxes) > 0 && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Impostos</span>
                <span style={{ color: 'var(--text-primary)' }}>+ {fmt(Number(quote.taxes))}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t text-base font-bold" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--text-primary)' }}>Total</span>
              <span style={{ color: 'var(--primary)' }}>{fmt(Number(quote.total))}</span>
            </div>
          </div>
        </div>

        {quote.notes && (
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Observações</h2>
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{quote.notes}</p>
          </div>
        )}
      </div>

      {/* Share card — off-screen, fixed width 500px, always rendered for html2canvas */}
      <div
        ref={shareCardRef}
        style={{
          position: 'fixed',
          left: -9999,
          top: 0,
          width: 500,
          background: '#ffffff',
          fontFamily: 'system-ui, -apple-system, Arial, sans-serif',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
        }}
      >
        {/* Colored header */}
        <div style={{ background: brandColor, padding: '28px 24px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            {/* Logo + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {brandLogo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={brandLogo} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                  : <span style={{ fontWeight: 900, fontSize: 22, color: '#fff' }}>{(siteName ?? tenantData?.name ?? 'E').charAt(0)}</span>
                }
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                  Orçamento
                </p>
                <p style={{ color: '#fff', fontWeight: 800, fontSize: 16, lineHeight: 1.15 }}>{siteName ?? tenantData?.name}</p>
                {siteName && <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 1 }}>{tenantData?.name}</p>}
              </div>
            </div>
            {/* Quote number */}
            <div style={{
              background: 'rgba(255,255,255,0.18)', borderRadius: 16,
              padding: '10px 16px', textAlign: 'center',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Número</p>
              <p style={{ color: '#fff', fontSize: 20, fontWeight: 900, lineHeight: 1.1 }}>{quote.quote_number ?? 'ORC'}</p>
            </div>
          </div>
          {/* Date chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 100, padding: '5px 12px' }}>
              <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>
                {new Date(quote.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
            {quote.valid_until && (
              <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 100, padding: '5px 12px' }}>
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>
                  Válido até {new Date(quote.valid_until + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Client info */}
        <div style={{ padding: '20px 20px 8px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {clientFields.map(([label, value]) => (
            <div key={label} style={{
              background: `rgba(${rgb}, 0.05)`,
              border: `1px solid rgba(${rgb}, 0.14)`,
              borderRadius: 14, padding: '12px 14px',
              width: 'calc(50% - 5px)', boxSizing: 'border-box',
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: 3 }}>{label}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Items */}
        <div style={{ margin: '8px 20px' }}>
          {/* Header row */}
          <div style={{ display: 'flex', background: brandColor, borderRadius: '10px 10px 0 0', padding: '8px 12px' }}>
            <span style={{ flex: 1, color: '#fff', fontSize: 11, fontWeight: 700 }}>Descrição</span>
            <span style={{ width: 50, textAlign: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>Qtd</span>
            <span style={{ width: 90, textAlign: 'right', color: '#fff', fontSize: 11, fontWeight: 700 }}>Total</span>
          </div>
          {(quote.items ?? []).map((item, idx) => (
            <div key={idx} style={{
              display: 'flex', padding: '8px 12px',
              background: idx % 2 === 0 ? '#fff' : `rgba(${rgb}, 0.03)`,
              borderBottom: `1px solid rgba(${rgb}, 0.1)`,
            }}>
              <span style={{ flex: 1, fontSize: 12, color: '#1e293b' }}>{item.description}</span>
              <span style={{ width: 50, textAlign: 'center', fontSize: 12, color: '#64748b' }}>{item.quantity}</span>
              <span style={{ width: 90, textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{fmt(item.quantity * item.unit_price)}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div style={{ margin: '0 20px 20px', padding: '12px 14px', background: `rgba(${rgb}, 0.07)`, borderRadius: '0 0 12px 12px' }}>
          {Number(quote.discount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              <span>Desconto</span><span style={{ color: '#ef4444' }}>- {fmt(Number(quote.discount))}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 900, color: brandColor }}>
            <span>TOTAL</span><span>{fmt(Number(quote.total))}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ margin: '0 20px 20px', background: `rgba(${rgb}, 0.06)`, borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: `rgba(${rgb}, 0.9)`, fontWeight: 600 }}>
            Este orçamento é válido por 30 dias a partir da data de emissão.
          </p>
        </div>
      </div>

      {/* Print layout */}
      <div className="hidden print:block print-layout" style={{ fontFamily: 'Arial, sans-serif', color: '#1a1a1a', maxWidth: '800px', margin: '0 auto', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', borderBottom: `3px solid ${brandColor}`, paddingBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {brandLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brandLogo} alt="Logo" style={{ height: '60px', objectFit: 'contain' }} />
            )}
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1a1a1a', margin: 0 }}>{siteName ?? tenantData?.name}</h1>
              {siteName && <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0' }}>{tenantData?.name}</p>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: brandColor, margin: 0 }}>{quote.quote_number ?? 'ORÇAMENTO'}</p>
            <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0' }}>Data: {new Date(quote.created_at).toLocaleDateString('pt-BR')}</p>
            {quote.valid_until && <p style={{ fontSize: '12px', color: '#666', margin: '2px 0 0' }}>Válido até: {new Date(quote.valid_until + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}
          </div>
        </div>
        <div style={{ marginBottom: '24px', padding: '16px', background: '#f8f8f8', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: brandColor, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dados do Cliente</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {clientFields.map(([l, v]) => (
              <div key={l}>
                <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>{l}</span>
                <p style={{ fontSize: '13px', fontWeight: '600', margin: '2px 0 0' }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
          <thead>
            <tr style={{ background: brandColor }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: '#fff', fontSize: '12px', fontWeight: '600' }}>Descrição</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', color: '#fff', fontSize: '12px', fontWeight: '600', width: '60px' }}>Qtd</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', color: '#fff', fontSize: '12px', fontWeight: '600', width: '100px' }}>Val. Unit.</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', color: '#fff', fontSize: '12px', fontWeight: '600', width: '100px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(quote.items ?? []).map((item, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9', borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px 12px', fontSize: '13px' }}>{item.description}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '13px' }}>{item.quantity}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '13px' }}>{fmt(item.unit_price)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '13px', fontWeight: '600' }}>{fmt(item.quantity * item.unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <div style={{ width: '240px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', borderBottom: '1px solid #eee' }}>
              <span>Subtotal</span><span>{fmt(Number(quote.subtotal))}</span>
            </div>
            {Number(quote.discount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', borderBottom: '1px solid #eee', color: '#ef4444' }}>
                <span>Desconto</span><span>- {fmt(Number(quote.discount))}</span>
              </div>
            )}
            {Number(quote.taxes) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', borderBottom: '1px solid #eee' }}>
                <span>Impostos</span><span>+ {fmt(Number(quote.taxes))}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '16px', fontWeight: 'bold', color: brandColor, borderTop: `2px solid ${brandColor}`, marginTop: '4px' }}>
              <span>TOTAL</span><span>{fmt(Number(quote.total))}</span>
            </div>
          </div>
        </div>
        {quote.notes && (
          <div style={{ marginBottom: '24px', padding: '14px', border: '1px solid #ddd', borderRadius: '6px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: '6px' }}>Observações</h3>
            <p style={{ fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{quote.notes}</p>
          </div>
        )}
        <div style={{ borderTop: `2px solid ${brandColor}`, paddingTop: '12px', textAlign: 'center', fontSize: '11px', color: '#888' }}>
          <p>Este orçamento é válido por 30 dias a partir da data de emissão.</p>
        </div>
      </div>

      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-layout { display: block !important; }
          .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
        }
      `}</style>
    </>
  )
}
