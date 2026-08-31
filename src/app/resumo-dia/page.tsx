'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CallRow {
  id: string
  date: string
  call_time: string | null
  contact_name: string | null
  call_neighborhood: string | null
  call_city: string | null
  contact_phone: string | null
  service_category: string | null
  status: string
  notes: string | null
  service_orders: { total_value: number | null; payment_status: string | null }[]
}

const STATUS_LABEL: Record<string, string> = {
  aprovado: 'Feito',
  agendado: 'Agendado',
  nao_aprovou: 'Não aprovou',
  nao_quis_visita: 'Não quis',
  cancelado: 'Cancelado',
}

const PAYMENT_LABEL: Record<string, string> = {
  pago: 'Pago',
  pago_parcial: 'Parcial',
  pendente: 'Pendente',
}

function fmt(date: string) {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

export default function ResumoDiaPage() {
  const [calls, setCalls] = useState<CallRow[]>([])
  const [date, setDate] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const storedDate = sessionStorage.getItem('resumo_dia_date') || new Date().toISOString().slice(0, 10)
    setDate(storedDate)

    const supabase = createClient()

    async function load() {
      // Get tenant
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
        if (profile?.tenant_id) {
          const { data: tenant } = await supabase.from('tenants').select('name').eq('id', profile.tenant_id).single()
          if (tenant) setTenantName(tenant.name)
        }
      }

      const { data } = await supabase
        .from('calls')
        .select(`
          id, date, call_time, contact_name, call_neighborhood, call_city,
          contact_phone, service_category, status, notes,
          service_orders(total_value, payment_status)
        `)
        .eq('date', storedDate)
        .order('call_time', { ascending: true, nullsFirst: false })

      setCalls((data as CallRow[]) ?? [])
      setLoading(false)
    }

    load()
  }, [])

  async function handleShare() {
    setSharing(true)
    try {
      const blob = await gerarImagemCanvas()
      if (!blob) { setSharing(false); return }
      const file = new File([blob], `resumo-${date}.png`, { type: 'image/png' })
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: `Resumo do Dia — ${tenantName}`, files: [file] })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `resumo-${date}.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      console.error('Erro ao gerar imagem:', e)
      alert('Não foi possível gerar a imagem. Tente usar o botão PDF.')
    } finally {
      setSharing(false)
    }
  }

  function gerarImagemCanvas(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const W = 900
      const ROW_H = 36
      const HEADER_H = 90
      const SUMMARY_H = 70
      const TABLE_HEADER_H = 30
      const FOOTER_H = 36
      const PADDING = 20
      const totalRows = calls.length + 1 // +1 total row
      const H = PADDING + HEADER_H + SUMMARY_H + TABLE_HEADER_H + totalRows * ROW_H + FOOTER_H + PADDING

      const canvas = document.createElement('canvas')
      canvas.width = W * 2
      canvas.height = H * 2
      const ctx = canvas.getContext('2d')!
      ctx.scale(2, 2)

      // Background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, W, H)

      let y = PADDING

      // Header
      ctx.fillStyle = '#1a1a1a'
      ctx.font = 'bold 18px Arial'
      ctx.fillText(`${tenantName} — Resumo do Dia`, PADDING, y + 22)
      ctx.fillStyle = '#555555'
      ctx.font = '11px Arial'
      ctx.fillText(`Data: ${date ? fmt(date) : '—'}   ·   Gerado em: ${new Date().toLocaleString('pt-BR')}`, PADDING, y + 42)
      y += HEADER_H - 20

      // Summary cards
      const cards = [
        { label: 'TOTAL DE CHAMADOS', value: String(calls.length), color: '#15803d', bg: '#f0faf0', border: '#bbf7d0' },
        { label: 'FEITOS (OS)', value: String(totalFeitos), color: '#15803d', bg: '#f0faf0', border: '#bbf7d0' },
        { label: 'FATURAMENTO DO DIA', value: `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: '#b45309', bg: '#fffbeb', border: '#fbbf24' },
      ]
      cards.forEach((card, i) => {
        const cx = PADDING + i * 290
        ctx.fillStyle = card.bg
        roundRect(ctx, cx, y, 270, 52, 8)
        ctx.strokeStyle = card.border
        ctx.lineWidth = 1
        roundRect(ctx, cx, y, 270, 52, 8, true)
        ctx.fillStyle = '#555'
        ctx.font = 'bold 9px Arial'
        ctx.fillText(card.label, cx + 12, y + 18)
        ctx.fillStyle = card.color
        ctx.font = 'bold 18px Arial'
        ctx.fillText(card.value, cx + 12, y + 42)
      })
      y += SUMMARY_H

      // Table columns
      const cols = [
        { label: 'DATA', w: 90 },
        { label: 'HORA', w: 55 },
        { label: 'CLIENTE', w: 130 },
        { label: 'BAIRRO / CIDADE', w: 150 },
        { label: 'TELEFONE', w: 110 },
        { label: 'SOLICITAÇÃO', w: 130 },
        { label: 'STATUS', w: 75 },
        { label: 'VALOR', w: 80 },
      ]

      // Table header
      ctx.fillStyle = '#1e4d2b'
      ctx.fillRect(PADDING, y, W - PADDING * 2, TABLE_HEADER_H)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 9px Arial'
      let cx = PADDING + 8
      cols.forEach(col => {
        ctx.fillText(col.label, cx, y + 20)
        cx += col.w
      })
      y += TABLE_HEADER_H

      // Table rows
      calls.forEach((c, i) => {
        const os = c.service_orders?.[0]
        const value = os?.total_value != null ? `R$ ${Number(os.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'
        const hora = c.call_time ? c.call_time.slice(0, 5) : '—'
        const local = [c.call_neighborhood, c.call_city].filter(Boolean).join(' / ') || '—'
        const statusLabel = STATUS_LABEL[c.status] ?? c.status

        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f5f9f5'
        ctx.fillRect(PADDING, y, W - PADDING * 2, ROW_H)
        ctx.strokeStyle = '#e5e5e5'
        ctx.lineWidth = 0.5
        ctx.beginPath(); ctx.moveTo(PADDING, y + ROW_H); ctx.lineTo(W - PADDING, y + ROW_H); ctx.stroke()

        const vals = [fmt(c.date), hora, c.contact_name || '—', local, c.contact_phone || '—', c.service_category || '—', statusLabel, value]
        let vx = PADDING + 8
        vals.forEach((val, vi) => {
          ctx.fillStyle = vi === 2 ? '#111' : '#333'
          ctx.font = vi === 2 ? 'bold 10px Arial' : '10px Arial'
          if (vi === 6) {
            ctx.fillStyle = c.status === 'aprovado' ? '#15803d' : '#b91c1c'
            ctx.font = 'bold 10px Arial'
          }
          // Truncate text
          const maxW = cols[vi].w - 8
          let text = val
          while (ctx.measureText(text).width > maxW && text.length > 1) text = text.slice(0, -1)
          if (text !== val) text = text.slice(0, -1) + '…'
          ctx.fillText(text, vx, y + 23)
          vx += cols[vi].w
        })
        y += ROW_H
      })

      // Total row
      ctx.fillStyle = '#b91c1c'
      ctx.fillRect(PADDING, y, W - PADDING * 2, ROW_H)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 11px Arial'
      ctx.fillText(`TOTAL DO DIA — ${calls.length} chamado${calls.length !== 1 ? 's' : ''} (${totalFeitos} feito${totalFeitos !== 1 ? 's' : ''})`, PADDING + 8, y + 23)
      ctx.textAlign = 'right'
      ctx.fillText(`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, W - PADDING - 8, y + 23)
      ctx.textAlign = 'left'
      y += ROW_H + 16

      // Footer
      ctx.fillStyle = '#999'
      ctx.font = '9px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`${tenantName}  ·  Connect Financeiro  ·  Impresso em ${new Date().toLocaleString('pt-BR')}`, W / 2, y + 12)
      ctx.textAlign = 'left'

      canvas.toBlob(resolve, 'image/png')
    })
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, stroke = false) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
    if (stroke) ctx.stroke(); else ctx.fill()
  }

  const totalValue = calls.reduce((sum, c) => {
    const os = c.service_orders?.[0]
    return sum + (os?.total_value ?? 0)
  }, 0)

  const totalFeitos = calls.filter(c => c.status === 'aprovado').length

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; background: white; color: #111; }
        @page { margin: 12mm 10mm; size: A4 landscape; }
        @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

        .page { padding: 16px; }

        .header { margin-bottom: 12px; }
        .header h1 { font-size: 16px; font-weight: bold; color: #1a1a1a; }
        .header p { font-size: 11px; color: #555; margin-top: 2px; }

        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #1e4d2b; color: white; }
        thead th { padding: 6px 8px; text-align: left; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.03em; white-space: nowrap; }
        tbody tr:nth-child(even) { background: #f5f9f5; }
        tbody tr:hover { background: #eaf4ea; }
        tbody td { padding: 6px 8px; border-bottom: 1px solid #e5e5e5; vertical-align: middle; }

        .status-pill { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: bold; }
        .status-feito { background: #dcfce7; color: #15803d; }
        .status-agendado { background: #dbeafe; color: #1d4ed8; }
        .status-outros { background: #fee2e2; color: #b91c1c; }

        .total-row { background: #b91c1c !important; color: white; }
        .total-row td { padding: 7px 8px; font-weight: bold; font-size: 12px; }

        .summary { display: flex; gap: 20px; margin-bottom: 14px; }
        .summary-card { background: #f0faf0; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 14px; }
        .summary-card .label { font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 0.05em; }
        .summary-card .value { font-size: 16px; font-weight: bold; color: #15803d; margin-top: 1px; }

        .footer { margin-top: 16px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }

        .print-btn { position: fixed; bottom: 24px; right: 24px; background: #1e4d2b; color: white; border: none; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.2); z-index: 100; }

        .date-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .date-bar input { border: 1px solid #ccc; padding: 4px 8px; border-radius: 6px; font-size: 11px; }
        .date-bar button { background: #1e4d2b; color: white; border: none; padding: 5px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; }
      `}</style>

      <div className="page" ref={contentRef}>
        {/* Date picker (only on screen) */}
        <div className="date-bar no-print">
          <label style={{ fontWeight: 600 }}>Data:</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          <button onClick={async () => {
            setLoading(true)
            const supabase = createClient()
            const { data } = await supabase
              .from('calls')
              .select(`id, date, call_time, contact_name, call_neighborhood, call_city, contact_phone, service_category, status, notes, service_orders(total_value, payment_status)`)
              .eq('date', date)
              .order('call_time', { ascending: true, nullsFirst: false })
            setCalls((data as CallRow[]) ?? [])
            setLoading(false)
          }}>Buscar</button>
        </div>

        <div className="header">
          <h1>{tenantName} — Resumo do Dia</h1>
          <p>Data: {date ? fmt(date) : '—'} &nbsp;·&nbsp; Gerado em: {new Date().toLocaleString('pt-BR')}</p>
        </div>

        {/* Summary cards */}
        <div className="summary">
          <div className="summary-card">
            <div className="label">Total de chamados</div>
            <div className="value">{calls.length}</div>
          </div>
          <div className="summary-card">
            <div className="label">Feitos (OS)</div>
            <div className="value">{totalFeitos}</div>
          </div>
          <div className="summary-card" style={{ borderColor: '#fbbf24', background: '#fffbeb' }}>
            <div className="label">Faturamento do dia</div>
            <div className="value" style={{ color: '#b45309' }}>R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>Carregando...</p>
        ) : calls.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>Nenhum chamado nesta data.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Bairro / Cidade</th>
                <th>Telefone</th>
                <th>Solicitação</th>
                <th>Status</th>
                <th>Pagamento</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {calls.map(c => {
                const os = c.service_orders?.[0]
                const value = os?.total_value ?? null
                const statusLabel = STATUS_LABEL[c.status] ?? c.status
                const pillCls = c.status === 'aprovado' ? 'status-feito' : c.status === 'agendado' ? 'status-agendado' : 'status-outros'
                const local = [c.call_neighborhood, c.call_city].filter(Boolean).join(' / ') || '—'
                return (
                  <tr key={c.id}>
                    <td>{fmt(c.date)}</td>
                    <td>{c.call_time ? c.call_time.slice(0, 5) : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{c.contact_name || '—'}</td>
                    <td>{local}</td>
                    <td>{c.contact_phone || '—'}</td>
                    <td>{c.service_category || '—'}</td>
                    <td><span className={`status-pill ${pillCls}`}>{statusLabel}</span></td>
                    <td>{os?.payment_status ? (PAYMENT_LABEL[os.payment_status] ?? os.payment_status) : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {value != null ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                  </tr>
                )
              })}
              <tr className="total-row">
                <td colSpan={8}>TOTAL DO DIA — {calls.length} chamado{calls.length !== 1 ? 's' : ''} ({totalFeitos} feito{totalFeitos !== 1 ? 's' : ''})</td>
                <td style={{ textAlign: 'right' }}>R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        )}

        <div className="footer">
          {tenantName} &nbsp;·&nbsp; Connect Financeiro &nbsp;·&nbsp; Impresso em {new Date().toLocaleString('pt-BR')}
        </div>
      </div>

      <div className="no-print" style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', gap: 10 }}>
        <button onClick={() => window.print()}
          style={{ background: '#374151', color: 'white', border: 'none', padding: '12px 18px', borderRadius: 10, fontSize: 14, fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
          🖨️ PDF
        </button>
        <button onClick={handleShare} disabled={sharing}
          style={{ background: '#25D366', color: 'white', border: 'none', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 'bold', cursor: sharing ? 'wait' : 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.2)', opacity: sharing ? 0.7 : 1 }}>
          {sharing ? '⏳ Gerando...' : '📸 Compartilhar como Foto'}
        </button>
      </div>
    </>
  )
}
