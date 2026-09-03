'use client'

import { useEffect, useState, useRef } from 'react'
import { Printer, Share2, Download } from 'lucide-react'

const fmt = (v: number) =>
  `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

function Badge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    pago:      { label: 'Pago',      color: '#10b981' },
    pendente:  { label: 'Pendente',  color: '#f59e0b' },
    cancelado: { label: 'Cancelado', color: '#ef4444' },
  }
  const s = map[status] ?? map.pendente
  return <span style={{ color: s.color, fontWeight: 600, fontSize: 11 }}>{s.label}</span>
}

function gerarImagemCanvas(payload: any): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const W = 800, SCALE = 2
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    if (!ctx) return reject(new Error('Canvas não disponível'))

    const { tab, range, tenantName, data, expData, ceData } = payload
    const s = data?.summary

    // measure height needed
    const baseRows =
      tab === 'chamados'
        ? 4 + 4 + (data?.byOrigin?.length ?? 0) + (data?.byCategory?.length ?? 0) + (data?.byCity?.length ?? 0)
        : tab === 'saidas'
        ? 3 + (expData?.expenses?.length ?? 0)
        : 3 + (ceData?.entries?.length ?? 0)
    const H = Math.max(700, 280 + baseRows * 36 + 120)

    canvas.width = W * SCALE
    canvas.height = H * SCALE
    ctx.scale(SCALE, SCALE)

    // background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    // orange top border
    ctx.fillStyle = '#f97316'
    ctx.fillRect(0, 0, W, 4)

    let y = 28

    // Header
    ctx.fillStyle = '#1d1d1f'
    ctx.font = 'bold 20px Arial'
    ctx.fillText(tenantName ?? 'Relatório', 32, y)

    const titleLabel = tab === 'chamados' ? 'Relatório de Chamados' : tab === 'saidas' ? 'Relatório de Saídas' : 'Relatório de Entradas'
    ctx.font = 'bold 13px Arial'
    ctx.fillStyle = '#f97316'
    const tw = ctx.measureText(titleLabel).width
    ctx.fillText(titleLabel, W - 32 - tw, y)

    y += 18
    ctx.font = '11px Arial'
    ctx.fillStyle = '#6e6e73'
    const periodLabel = `Período: ${range?.label ?? `${range?.start} a ${range?.end}`}`
    const pw = ctx.measureText(periodLabel).width
    ctx.fillText(periodLabel, W - 32 - pw, y)

    y += 14
    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(32, y)
    ctx.lineTo(W - 32, y)
    ctx.stroke()
    y += 20

    function drawKpiGrid(items: { label: string; value: string; color: string }[]) {
      const cols = 2, colW = (W - 64 - 10) / cols, rowH = 72
      items.forEach((item, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = 32 + col * (colW + 10)
        const iy = y + row * (rowH + 10)
        // card
        ctx.fillStyle = '#ffffff'
        ctx.strokeStyle = '#e5e7eb'
        ctx.lineWidth = 1
        ctx.beginPath()
        ;(ctx as any).roundRect?.(x, iy, colW, rowH, 8) || ctx.rect(x, iy, colW, rowH)
        ctx.fill()
        ctx.stroke()
        // label
        ctx.fillStyle = '#6e6e73'
        ctx.font = 'bold 9px Arial'
        ctx.fillText(item.label.toUpperCase(), x + 12, iy + 18)
        // value
        ctx.fillStyle = item.color
        ctx.font = 'bold 18px Arial'
        ctx.fillText(item.value, x + 12, iy + 50)
      })
      return Math.ceil(items.length / cols) * (rowH + 10)
    }

    function drawTable(title: string, headers: string[], rows: string[][], aligns: ('left' | 'right')[]) {
      ctx.font = 'bold 13px Arial'
      ctx.fillStyle = '#1d1d1f'
      ctx.fillText(title, 32, y)
      y += 6
      ctx.strokeStyle = '#f3f4f6'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(32, y)
      ctx.lineTo(W - 32, y)
      ctx.stroke()
      y += 12

      // header row
      const colW = (W - 64) / headers.length
      ctx.fillStyle = '#f9fafb'
      ctx.fillRect(32, y - 8, W - 64, 24)
      ctx.font = 'bold 9px Arial'
      ctx.fillStyle = '#6e6e73'
      headers.forEach((h, i) => {
        const x = aligns[i] === 'right' ? 32 + (i + 1) * colW - 8 : 32 + i * colW + 8
        ctx.textAlign = aligns[i] ?? 'left'
        ctx.fillText(h.toUpperCase(), x, y + 8)
      })
      ctx.textAlign = 'left'
      y += 28

      // data rows
      rows.forEach((row) => {
        ctx.strokeStyle = '#f3f4f6'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(32, y + 16)
        ctx.lineTo(W - 32, y + 16)
        ctx.stroke()
        row.forEach((cell, i) => {
          ctx.font = i === 0 ? '11px Arial' : (i === row.length - 1 ? 'bold 11px Arial' : '11px Arial')
          ctx.fillStyle = '#1d1d1f'
          const x = aligns[i] === 'right' ? 32 + (i + 1) * colW - 8 : 32 + i * colW + 8
          ctx.textAlign = aligns[i] ?? 'left'
          ctx.fillText(cell, x, y + 12)
        })
        ctx.textAlign = 'left'
        y += 28
      })
      y += 12
    }

    if (tab === 'chamados' && s) {
      const approvalRate = s.totalCalls > 0 ? Math.round((s.approvedCalls / s.totalCalls) * 100) : 0
      y += drawKpiGrid([
        { label: 'Total de Chamados', value: String(s.totalCalls), color: '#1d1d1f' },
        { label: 'Aprovados', value: String(s.approvedCalls), color: '#10b981' },
        { label: 'Taxa de Aprovação', value: `${approvalRate}%`, color: '#10b981' },
        { label: 'Cancelados', value: String(s.cancelledCalls), color: '#ef4444' },
      ])
      y += 10
      y += drawKpiGrid([
        { label: 'Receita Bruta', value: fmt(s.grossRevenue), color: '#f97316' },
        { label: 'Receita Líquida', value: fmt(s.netRevenue ?? s.liquidRevenue ?? 0), color: '#10b981' },
        { label: 'Recebido', value: fmt(s.paidRevenue), color: '#10b981' },
        { label: 'A Receber', value: fmt(s.pendingRevenue), color: '#f59e0b' },
      ])
      y += 16

      if (data.byOrigin?.length > 0) {
        drawTable('Por Origem', ['Origem', 'Chamados', 'Receita'], data.byOrigin.map((o: any) => [o.name, String(o.calls), fmt(o.revenue)]), ['left', 'right', 'right'])
      }
      if (data.byCategory?.length > 0) {
        drawTable('Por Tipo de Serviço', ['Tipo', 'OS', 'Receita'], data.byCategory.map((c: any) => [c.category, String(c.calls), fmt(c.revenue)]), ['left', 'right', 'right'])
      }
      if (data.byCity?.length > 0) {
        drawTable('Ranking por Cidade', ['#', 'Cidade', 'OS', 'Receita'], data.byCity.map((c: any, i: number) => [`#${i + 1}`, c.city, String(c.calls), fmt(c.revenue)]), ['left', 'left', 'right', 'right'])
      }
    } else if (tab === 'saidas' && expData) {
      y += drawKpiGrid([
        { label: 'Total', value: fmt(expData.total), color: '#1d1d1f' },
        { label: 'Pago', value: fmt(expData.paid), color: '#ef4444' },
        { label: 'Pendente', value: fmt(expData.pending), color: '#f59e0b' },
      ])
      y += 16
      if (expData.expenses?.length > 0) {
        drawTable('Lançamentos', ['Data', 'Descrição', 'Status', 'Valor'],
          expData.expenses.map((e: any) => [
            e.due_date ? new Date(e.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—',
            (e.description ?? '').substring(0, 30),
            e.status === 'pago' ? 'Pago' : 'Pendente',
            fmt(e.amount),
          ]), ['left', 'left', 'left', 'right'])
      }
    } else if (tab === 'entradas' && ceData) {
      y += drawKpiGrid([
        { label: 'Total', value: fmt(ceData.total), color: '#1d1d1f' },
        { label: 'Recebido', value: fmt(ceData.paid), color: '#10b981' },
        { label: 'A Receber', value: fmt(ceData.pending), color: '#f59e0b' },
      ])
      y += 16
      if (ceData.entries?.length > 0) {
        drawTable('Lançamentos', ['Data', 'Descrição', 'Status', 'Valor'],
          ceData.entries.map((e: any) => [
            e.due_date ? new Date(e.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—',
            (e.description ?? '').substring(0, 30),
            e.status === 'pago' ? 'Pago' : 'Pendente',
            fmt(e.amount),
          ]), ['left', 'left', 'left', 'right'])
      }
    }

    // footer
    ctx.font = '10px Arial'
    ctx.fillStyle = '#aeaeb2'
    ctx.fillText('Connect Financeiro · Documento gerado automaticamente', 32, H - 16)
    const tnW = ctx.measureText(tenantName ?? '').width
    ctx.fillText(tenantName ?? '', W - 32 - tnW, H - 16)

    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('Falha ao gerar imagem'))
    }, 'image/png')
  })
}

export default function RelatoriosImprimirPage() {
  const [payload, setPayload] = useState<any>(null)
  const [mode, setMode] = useState<'pdf' | 'image'>('pdf')
  const [sharing, setSharing] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent))
    const params = new URLSearchParams(window.location.search)
    setMode((params.get('mode') as 'pdf' | 'image') ?? 'pdf')
    try {
      const raw = sessionStorage.getItem('relatorio_print')
      if (raw) setPayload(JSON.parse(raw))
    } catch {}
  }, [])

  // auto-print only on desktop PDF mode
  useEffect(() => {
    if (payload && mode === 'pdf' && !isMobile) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [payload, mode, isMobile])

  async function handleShare() {
    if (!payload || sharing) return
    setSharing(true)
    try {
      const blob = await gerarImagemCanvas(payload)
      const label = payload?.range?.label ?? payload?.range?.start ?? 'relatorio'
      const file = new File([blob], `relatorio-${label}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Relatório ${label}` })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `relatorio-${label}.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e: unknown) {
      if ((e as { name?: string })?.name !== 'AbortError') {
        console.error('Erro ao compartilhar:', e)
        alert('Não foi possível compartilhar. Tente novamente.')
      }
    } finally {
      setSharing(false)
    }
  }

  if (!payload) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        <p style={{ fontSize: 14 }}>Nenhum dado. Acesse Relatórios e clique em Compartilhar.</p>
      </div>
    )
  }

  const { tab, range, tenantName, tenantCnpj, data, expData, ceData } = payload

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', fontSize: 12, color: '#1d1d1f', background: 'white', paddingBottom: isMobile ? 90 : 0 }}>
      {/* Desktop toolbar — hidden in print */}
      {!isMobile && (
        <div className="no-print" style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f97316', color: 'white', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <Printer size={15} />
            Imprimir / Salvar PDF
          </button>
          <button onClick={handleShare} disabled={sharing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#10b981', color: 'white', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: sharing ? 0.7 : 1 }}>
            <Share2 size={15} />
            {sharing ? 'Gerando...' : 'Compartilhar Imagem'}
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '24px 20px', maxWidth: 860, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ borderBottom: '2px solid #f97316', paddingBottom: 14, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{tenantName ?? 'Relatório'}</h1>
              {tenantCnpj && <p style={{ fontSize: 11, color: '#6e6e73', marginTop: 2 }}>CNPJ: {tenantCnpj}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f97316', margin: 0 }}>
                {tab === 'chamados' ? 'Relatório de Chamados' : tab === 'saidas' ? 'Relatório de Saídas' : 'Relatório de Entradas'}
              </p>
              <p style={{ fontSize: 11, color: '#6e6e73', marginTop: 2 }}>
                Período: {range?.label ?? `${range?.start} a ${range?.end}`}
              </p>
              <p style={{ fontSize: 10, color: '#aeaeb2', marginTop: 2 }}>
                Gerado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* ── CHAMADOS ── */}
        {tab === 'chamados' && data && (() => {
          const s = data.summary
          return (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Total de Chamados', value: s.totalCalls, color: '#1d1d1f' },
                  { label: 'Aprovados', value: s.approvedCalls, color: '#10b981' },
                  { label: 'Taxa de Aprovação', value: `${s.totalCalls > 0 ? Math.round((s.approvedCalls / s.totalCalls) * 100) : 0}%`, color: '#10b981' },
                  { label: 'Cancelados', value: s.cancelledCalls, color: '#ef4444' },
                ].map(k => (
                  <div key={k.label} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6e6e73', margin: 0 }}>{k.label}</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: k.color, margin: '4px 0 0' }}>{k.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Receita Bruta', value: fmt(s.grossRevenue), color: '#f97316' },
                  { label: 'Receita Líquida', value: fmt(s.netRevenue ?? s.liquidRevenue ?? 0), color: '#10b981' },
                  { label: 'Recebido', value: fmt(s.paidRevenue), color: '#10b981' },
                  { label: 'A Receber', value: fmt(s.pendingRevenue), color: '#f59e0b' },
                ].map(k => (
                  <div key={k.label} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6e6e73', margin: 0 }}>{k.label}</p>
                    <p style={{ fontSize: 15, fontWeight: 800, color: k.color, margin: '4px 0 0' }}>{k.value}</p>
                  </div>
                ))}
              </div>
              {data.byOrigin?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #f3f4f6' }}>Por Origem</h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f9fafb' }}>
                      <th style={th}>Origem</th><th style={{ ...th, textAlign: 'right' }}>Chamados</th><th style={{ ...th, textAlign: 'right' }}>Receita</th>
                    </tr></thead>
                    <tbody>{data.byOrigin.map((o: any) => (
                      <tr key={o.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={td}>{o.name}</td><td style={{ ...td, textAlign: 'right' }}>{o.calls}</td><td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmt(o.revenue)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              {data.byCategory?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #f3f4f6' }}>Por Tipo de Serviço</h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f9fafb' }}>
                      <th style={th}>Tipo</th><th style={{ ...th, textAlign: 'right' }}>OS</th><th style={{ ...th, textAlign: 'right' }}>Receita</th>
                    </tr></thead>
                    <tbody>{data.byCategory.map((c: any) => (
                      <tr key={c.category} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={td}>{c.category}</td><td style={{ ...td, textAlign: 'right' }}>{c.calls}</td><td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmt(c.revenue)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              {data.byCity?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #f3f4f6' }}>Ranking por Cidade</h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f9fafb' }}>
                      <th style={th}>#</th><th style={th}>Cidade</th><th style={{ ...th, textAlign: 'right' }}>OS</th><th style={{ ...th, textAlign: 'right' }}>Receita</th>
                    </tr></thead>
                    <tbody>{data.byCity.map((c: any, i: number) => (
                      <tr key={c.city} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ ...td, color: '#aeaeb2', fontWeight: 700 }}>#{i + 1}</td><td style={td}>{c.city}</td><td style={{ ...td, textAlign: 'right' }}>{c.calls}</td><td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmt(c.revenue)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </>
          )
        })()}

        {/* ── SAÍDAS ── */}
        {tab === 'saidas' && expData && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Total', value: fmt(expData.total), color: '#1d1d1f' },
                { label: 'Pago', value: fmt(expData.paid), color: '#ef4444' },
                { label: 'Pendente', value: fmt(expData.pending), color: '#f59e0b' },
              ].map(k => (
                <div key={k.label} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6e6e73', margin: 0 }}>{k.label}</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: k.color, margin: '4px 0 0' }}>{k.value}</p>
                </div>
              ))}
            </div>
            {expData.expenses?.length > 0 && (
              <div>
                <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #f3f4f6' }}>Lançamentos</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                    <thead><tr style={{ background: '#f9fafb' }}>
                      <th style={th}>Data</th><th style={th}>Descrição</th><th style={th}>Status</th><th style={{ ...th, textAlign: 'right' }}>Valor</th>
                    </tr></thead>
                    <tbody>{expData.expenses.map((e: any) => (
                      <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ ...td, whiteSpace: 'nowrap', color: '#6e6e73' }}>{e.due_date ? new Date(e.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{e.description}</td>
                        <td style={td}><Badge status={e.status} /></td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{fmt(e.amount)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── ENTRADAS ── */}
        {tab === 'entradas' && ceData && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Total', value: fmt(ceData.total), color: '#1d1d1f' },
                { label: 'Recebido', value: fmt(ceData.paid), color: '#10b981' },
                { label: 'A Receber', value: fmt(ceData.pending), color: '#f59e0b' },
              ].map(k => (
                <div key={k.label} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6e6e73', margin: 0 }}>{k.label}</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: k.color, margin: '4px 0 0' }}>{k.value}</p>
                </div>
              ))}
            </div>
            {ceData.entries?.length > 0 && (
              <div>
                <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #f3f4f6' }}>Lançamentos</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 380 }}>
                    <thead><tr style={{ background: '#f9fafb' }}>
                      <th style={th}>Data</th><th style={th}>Descrição</th><th style={th}>Status</th><th style={{ ...th, textAlign: 'right' }}>Valor</th>
                    </tr></thead>
                    <tbody>{ceData.entries.map((e: any) => (
                      <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ ...td, whiteSpace: 'nowrap', color: '#6e6e73' }}>{e.due_date ? new Date(e.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{e.description}</td>
                        <td style={td}><Badge status={e.status} /></td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{fmt(e.amount)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 32, paddingTop: 10, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 10, color: '#aeaeb2', margin: 0 }}>Connect Financeiro · Documento gerado automaticamente</p>
          <p style={{ fontSize: 10, color: '#aeaeb2', margin: 0 }}>{tenantName}</p>
        </div>
      </div>

      {/* Mobile bottom bar — fixed, visible, safe area aware */}
      {isMobile && (
        <div className="no-print" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'white', borderTop: '1px solid #e2e8f0',
          padding: '12px 16px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
          display: 'flex', gap: 10,
        }}>
          <button onClick={handleShare} disabled={sharing}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: sharing ? '#6ee7b7' : '#10b981', color: 'white', border: 'none', borderRadius: 12, padding: '14px 0', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            <Share2 size={18} />
            {sharing ? 'Gerando imagem...' : 'Compartilhar Imagem'}
          </button>
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: '#6e6e73', padding: '8px 10px', textAlign: 'left',
}
const td: React.CSSProperties = { fontSize: 12, color: '#1d1d1f', padding: '8px 10px' }
