'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { channelLabel } from '@/lib/channels'
import { getOriginLabel } from '@/lib/use-call-origins'

// Relatório de chamados em formato planilha (igual ao Resumo do Dia),
// com os filtros escolhidos em Relatórios > Chamados. Os filtros chegam
// pelo sessionStorage ('relatorio_chamados').

const NONE = '__none'
const STATUS_LABEL: Record<string, string> = {
  aprovado: 'Aprovado', agendado: 'Agendado', nao_aprovou: 'Não aprovou', nao_quis_visita: 'Não quis', cancelado: 'Cancelado',
  orcamento: 'Orçamento', pagou_somente_visita: 'Pagou visita', retorno: 'Retorno',
}
const PAYMENT_LABEL: Record<string, string> = { pago: 'Pago', pago_parcial: 'Parcial', pendente: 'Pendente' }

const brl = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const fmtDate = (d?: string | null) => { if (!d) return '—'; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}` }

interface Filters { start: string; end: string; channels: string[]; origins: string[]; statuses: string[] }

interface Row {
  id: string; date: string; time: string; client: string; email: string; phone: string; place: string
  service: string; origin: string; channel: string; status: string; payment: string; value: number | null
}

export default function RelatorioChamadosPage() {
  const [filters, setFilters] = useState<Filters | null>(null)
  const [tenant, setTenant] = useState<any>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let f: Filters | null = null
    try { f = JSON.parse(sessionStorage.getItem('relatorio_chamados') || 'null') } catch {}
    if (!f) {
      const now = new Date()
      const s = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      f = { start: s, end: now.toISOString().slice(0, 10), channels: [], origins: [], statuses: [] }
    }
    setFilters(f)
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      let t: any = null
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
        if (profile?.tenant_id) {
          const { data } = await supabase.from('tenants').select('id, name, slug, call_form_config').eq('id', profile.tenant_id).single()
          t = data; setTenant(data)
        }
      }
      const { data } = await supabase.from('calls')
        .select('id, date, call_time, scheduled_time, status, origin, call_channel, contact_name, contact_phone, call_neighborhood, call_city, service_category, client:clients(name, email, phone, city, neighborhood), service_orders(total_value, payment_status)')
        .gte('date', f!.start).lte('date', f!.end)
        .order('date', { ascending: true })
      const pick = (sel: string[], v: string | null) => sel.length === 0 || sel.includes(v || NONE)
      const list: Row[] = (data ?? [])
        .filter((c: any) => pick(f!.channels, c.call_channel) && pick(f!.origins, c.origin) && (f!.statuses.length === 0 || f!.statuses.includes(c.status)))
        .map((c: any) => {
          const cl = Array.isArray(c.client) ? c.client[0] : c.client
          const sos: any[] = c.service_orders ?? []
          const value = sos.length ? sos.reduce((s, so) => s + Number(so.total_value || 0), 0) : null
          return {
            id: c.id, date: c.date,
            time: String(c.scheduled_time ?? c.call_time ?? '').slice(0, 5),
            client: cl?.name ?? c.contact_name ?? '—',
            email: cl?.email ?? '',
            phone: c.contact_phone ?? cl?.phone ?? '',
            place: [c.call_neighborhood ?? cl?.neighborhood, c.call_city ?? cl?.city].filter(Boolean).join(' / '),
            service: c.service_category ?? '',
            origin: c.origin ? getOriginLabel(c.origin) : '',
            channel: c.call_channel ? channelLabel(c.call_channel, t).replace(/^[^\p{L}\p{N}]+\s*/u, '') : '',
            status: c.status,
            payment: sos[0]?.payment_status ? (PAYMENT_LABEL[sos[0].payment_status] ?? sos[0].payment_status) : '',
            value,
          }
        })
      setRows(list)
      setLoading(false)
    })()
  }, [])

  const total = rows.reduce((s, r) => s + (r.value ?? 0), 0)
  const approved = rows.filter(r => r.status === 'aprovado').length
  const filterLabel = (sel: string[], label: (v: string) => string, all: string) => sel.length ? sel.map(v => v === NONE ? `Sem ${all === 'todas' ? 'origem' : 'canal'}` : label(v)).join(', ') : all
  const filterText = filters ? [
    `Canal: ${filterLabel(filters.channels, v => channelLabel(v, tenant).replace(/^[^\p{L}\p{N}]+\s*/u, ''), 'todos')}`,
    `Origem: ${filterLabel(filters.origins, getOriginLabel, 'todas')}`,
    `Status: ${filters.statuses.length ? filters.statuses.map(s => STATUS_LABEL[s] ?? s).join(', ') : 'todos'}`,
  ].join('  ·  ') : ''

  function downloadExcel() {
    const head = ['Data', 'Hora', 'Cliente', 'E-mail', 'Telefone', 'Bairro / Cidade', 'Serviço', 'Origem', 'Canal', 'Status', 'Pagamento', 'Valor']
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [head.map(esc).join(';'), ...rows.map(r => [
      fmtDate(r.date), r.time, r.client, r.email, r.phone, r.place, r.service, r.origin, r.channel,
      STATUS_LABEL[r.status] ?? r.status, r.payment, r.value != null ? r.value.toFixed(2).replace('.', ',') : '',
    ].map(esc).join(';'))]
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `relatorio-chamados-${filters?.start}-a-${filters?.end}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  }

  async function shareImage() {
    if (!sheetRef.current) return
    setSharing(true)
    try {
      const { sheetFile, shareFile } = await import('@/lib/sheet-capture')
      const file = await sheetFile(sheetRef.current, `relatorio-chamados-${filters?.start}`, 'png')
      await shareFile(file, `Relatório de chamados — ${tenant?.name ?? ''}`)
    } catch (e) {
      console.error(e); alert('Não foi possível gerar a imagem. Use o botão PDF.')
    } finally { setSharing(false) }
  }

  const pill = (s: string) => s === 'aprovado' ? 'st-ok' : s === 'agendado' ? 'st-ag' : 'st-no'

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; background: white; color: #111; }
        @page { margin: 10mm 8mm; size: A4 landscape; }
        @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .table-wrap { overflow: visible !important; } }
        .page { padding: 16px; max-width: 100vw; overflow-x: hidden; background: white; }
        .header h1 { font-size: 16px; font-weight: bold; color: #1a1a1a; overflow-wrap: anywhere; }
        .header p { font-size: 11px; color: #555; margin-top: 2px; }
        .header .filters { margin-top: 4px; color: #333; }
        .summary { display: flex; flex-wrap: wrap; gap: 12px; margin: 12px 0 14px; }
        .card { flex: 1 1 140px; min-width: 0; background: #f0faf0; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 14px; }
        .card .l { font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 0.05em; }
        .card .v { font-size: 16px; font-weight: bold; color: #15803d; margin-top: 1px; }
        .card.money { background: #fffbeb; border-color: #fbbf24; } .card.money .v { color: #b45309; }
        .table-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #1e4d2b; color: white; }
        thead th { padding: 6px 7px; text-align: left; font-size: 9.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.03em; white-space: nowrap; }
        tbody tr:nth-child(even) { background: #f5f9f5; }
        tbody td { padding: 6px 7px; border-bottom: 1px solid #e5e5e5; vertical-align: middle; font-size: 10.5px; }
        td.nw { white-space: nowrap; }
        .pill { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: bold; white-space: nowrap; }
        .st-ok { background: #dcfce7; color: #15803d; } .st-ag { background: #dbeafe; color: #1d4ed8; } .st-no { background: #fee2e2; color: #b91c1c; }
        .total-row { background: #b91c1c !important; color: white; }
        .total-row td { padding: 7px 8px; font-weight: bold; font-size: 12px; border: none; }
        .footer { margin-top: 16px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
        .actions { position: fixed; bottom: 20px; left: 0; right: 0; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; padding: 0 12px; }
        .actions button { color: white; border: none; padding: 12px 18px; border-radius: 10px; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.2); }
      `}</style>

      <div className="page" ref={sheetRef}>
        <div className="header">
          <h1>{tenant?.name ?? ''} — Relatório de Chamados</h1>
          <p>Período: {fmtDate(filters?.start)} a {fmtDate(filters?.end)} &nbsp;·&nbsp; Gerado em: {new Date().toLocaleString('pt-BR')}</p>
          <p className="filters">{filterText}</p>
        </div>

        <div className="summary">
          <div className="card"><div className="l">Total de chamados</div><div className="v">{rows.length}</div></div>
          <div className="card"><div className="l">Aprovados</div><div className="v">{approved}{rows.length ? ` (${Math.round(approved / rows.length * 100)}%)` : ''}</div></div>
          <div className="card money"><div className="l">Faturamento</div><div className="v">{brl(total)}</div></div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>Carregando...</p>
        ) : rows.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>Nenhum chamado com esses filtros no período.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th><th>Hora</th><th>Cliente</th><th>E-mail</th><th>Telefone</th><th>Bairro / Cidade</th>
                  <th>Serviço</th><th>Origem</th><th>Canal</th><th>Status</th><th>Pagamento</th><th style={{ textAlign: 'right' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="nw">{fmtDate(r.date)}</td>
                    <td className="nw">{r.time || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{r.client}</td>
                    <td>{r.email || '—'}</td>
                    <td className="nw">{r.phone || '—'}</td>
                    <td>{r.place || '—'}</td>
                    <td>{r.service || '—'}</td>
                    <td>{r.origin || '—'}</td>
                    <td>{r.channel || '—'}</td>
                    <td><span className={`pill ${pill(r.status)}`}>{STATUS_LABEL[r.status] ?? r.status}</span></td>
                    <td>{r.payment || '—'}</td>
                    <td className="nw" style={{ textAlign: 'right', fontWeight: 600 }}>{r.value != null ? brl(r.value) : '—'}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={11}>TOTAL — {rows.length} chamado{rows.length !== 1 ? 's' : ''} ({approved} aprovado{approved !== 1 ? 's' : ''})</td>
                  <td style={{ textAlign: 'right' }} className="nw">{brl(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="footer">{tenant?.name ?? ''} &nbsp;·&nbsp; Connect Financeiro &nbsp;·&nbsp; Impresso em {new Date().toLocaleString('pt-BR')}</div>
        <div className="no-print" style={{ height: 80 }} />
      </div>

      <div className="actions no-print">
        <button onClick={() => window.print()} style={{ background: '#374151' }}>🖨️ PDF</button>
        <button onClick={downloadExcel} style={{ background: '#1e4d2b' }}>📊 Excel</button>
        <button onClick={shareImage} disabled={sharing} style={{ background: '#25D366', opacity: sharing ? 0.7 : 1 }}>{sharing ? '⏳ Gerando...' : '📸 Foto'}</button>
      </div>
    </>
  )
}
