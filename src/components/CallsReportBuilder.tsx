'use client'

import { useMemo, useState } from 'react'
import { FileBarChart, Loader2, FileDown, MessageSquare, X, Check, Table2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { channelsFor, channelLabel as chLabel } from '@/lib/channels'
import { getOriginLabel } from '@/lib/use-call-origins'

// Relatórios > Chamados (Novo Ambiental): escolhe período, canais,
// origens e status (pode marcar mais de um em cada) e gera o relatório.

const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const ptDate = (d: string) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

export const REPORT_STATUSES = [
  { value: 'agendado', label: 'Agendado' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'nao_aprovou', label: 'Não aprovou' },
  { value: 'nao_quis_visita', label: 'Não quis visita' },
  { value: 'cancelado', label: 'Cancelado' },
]
const STATUS_LABEL: Record<string, string> = Object.fromEntries(REPORT_STATUSES.map(s => [s.value, s.label]))
const STATUS_COLOR: Record<string, string> = {
  agendado: 'bg-blue-50 text-blue-700', aprovado: 'bg-emerald-50 text-emerald-700',
  nao_aprovou: 'bg-amber-50 text-amber-700', nao_quis_visita: 'bg-zinc-100 text-zinc-600', cancelado: 'bg-red-50 text-red-600',
}

const NONE = '__none'

interface Row {
  id: string
  date: string
  client: string
  city: string
  origin: string | null
  channel: string | null
  status: string
  gross: number
  net: number
  service: string
}

function netOf(so: any) {
  const gross = Number(so?.total_value || 0)
  if (so?.service_type === 'terceirizado_saida') return gross * Number(so.outsource_profit_pct ?? 50) / 100
  return gross
}

function Chips({ title, options, selected, onChange }: {
  title: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])
  const all = selected.length === 0
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange([])}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${all ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>
          Todos
        </button>
        {options.map(o => {
          const on = selected.includes(o.value)
          return (
            <button key={o.value} type="button" onClick={() => toggle(o.value)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${on ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
              style={on ? { background: 'var(--primary)' } : {}}>
              {on && <Check className="w-3 h-3" />}{o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function CallsReportBuilder({ tenant, origins, range }: {
  tenant: any
  origins: { value: string; label: string }[]
  range: { start: string; end: string; label?: string }
}) {
  const [channels, setChannels] = useState<string[]>([])
  const [originSel, setOriginSel] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [rows, setRows] = useState<Row[] | null>(null)
  const [generatedFor, setGeneratedFor] = useState<{ start: string; end: string; label?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const channelOptions = [...channelsFor(tenant).map(c => ({ value: c.value, label: c.label })), { value: NONE, label: 'Sem canal' }]
  const originOptions = [...origins, { value: NONE, label: 'Sem origem' }]

  // Planilha (igual ao Resumo do Dia) numa aba nova, com os filtros escolhidos
  function openSheet() {
    sessionStorage.setItem('relatorio_chamados', JSON.stringify({ start: range.start, end: range.end, channels, origins: originSel, statuses }))
    window.open('/relatorio-chamados', '_blank')
  }

  async function generate() {
    setLoading(true); setError('')
    try {
      const { data, error } = await createClient().from('calls')
        .select('id, date, scheduled_date, status, origin, call_channel, contact_name, call_city, service_category, client:clients(name, city), service_orders(total_value, service_type, outsource_profit_pct)')
        .gte('date', range.start).lte('date', range.end)
        .order('date', { ascending: false })
      if (error) throw error
      const pick = (sel: string[], v: string | null) => sel.length === 0 || sel.includes(v || NONE)
      const list: Row[] = (data ?? [])
        .filter((c: any) => pick(channels, c.call_channel) && pick(originSel, c.origin) && (statuses.length === 0 || statuses.includes(c.status)))
        .map((c: any) => {
          const client = Array.isArray(c.client) ? c.client[0] : c.client
          const sos: any[] = c.service_orders ?? []
          return {
            id: c.id, date: c.date,
            client: client?.name ?? c.contact_name ?? '—',
            city: c.call_city ?? client?.city ?? '',
            origin: c.origin, channel: c.call_channel, status: c.status,
            gross: sos.reduce((s, so) => s + Number(so.total_value || 0), 0),
            net: sos.reduce((s, so) => s + netOf(so), 0),
            service: c.service_category ?? '',
          }
        })
      setRows(list)
      setGeneratedFor({ ...range })
    } catch (e) {
      console.error(e)
      setError('Não foi possível gerar o relatório.')
    } finally { setLoading(false) }
  }

  const stats = useMemo(() => {
    if (!rows) return null
    const by = (key: (r: Row) => string) => {
      const m = new Map<string, { calls: number; gross: number; net: number }>()
      for (const r of rows) {
        const k = key(r)
        const cur = m.get(k) ?? { calls: 0, gross: 0, net: 0 }
        cur.calls++; cur.gross += r.gross; cur.net += r.net
        m.set(k, cur)
      }
      return Array.from(m.entries()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.calls - a.calls)
    }
    return {
      total: rows.length,
      approved: rows.filter(r => r.status === 'aprovado').length,
      gross: rows.reduce((s, r) => s + r.gross, 0),
      net: rows.reduce((s, r) => s + r.net, 0),
      byStatus: by(r => r.status),
      byOrigin: by(r => r.origin || NONE),
      byChannel: by(r => r.channel || NONE),
    }
  }, [rows])

  const originLabel = (v: string) => v === NONE ? 'Sem origem' : (origins.find(o => o.value === v)?.label ?? getOriginLabel(v))
  const channelLabel = (v: string) => v === NONE ? 'Sem canal' : chLabel(v, tenant)
  const statusLabel = (v: string) => STATUS_LABEL[v] ?? v
  const filtersText = [
    `Canal: ${channels.length ? channels.map(channelLabel).join(', ') : 'todos'}`,
    `Origem: ${originSel.length ? originSel.map(originLabel).join(', ') : 'todas'}`,
    `Status: ${statuses.length ? statuses.map(statusLabel).join(', ') : 'todos'}`,
  ]
  const periodText = generatedFor ? `${ptDate(generatedFor.start)} a ${ptDate(generatedFor.end)}` : ''
  const strip = (s: string) => s.replace(/[^\p{L}\p{N}\s,.:()/-]/gu, '').trim()

  async function exportPdf() {
    if (!rows || !stats) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const W = doc.internal.pageSize.getWidth()
    let y = 14
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
    doc.text(`${tenant?.name ?? ''} — Relatório de Chamados`, 12, y); y += 6
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text(`Período: ${periodText}`, 12, y); y += 4.5
    filtersText.forEach(t => { doc.text(strip(t), 12, y); y += 4.5 })
    y += 2
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text(`Chamados: ${stats.total}    Aprovados: ${stats.approved}    Faturamento: ${fmt(stats.gross)}    Líquido: ${fmt(stats.net)}`, 12, y); y += 7

    const block = (title: string, list: { key: string; calls: number; gross: number }[], label: (k: string) => string) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(title, 12, y); y += 5
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      list.forEach(i => {
        doc.text(strip(label(i.key)), 16, y); doc.text(`${i.calls} chamado${i.calls > 1 ? 's' : ''}`, 90, y); doc.text(fmt(i.gross), 130, y, { align: 'left' })
        y += 4.5
      })
      y += 3
    }
    block('Por status', stats.byStatus, statusLabel)
    block('Por origem', stats.byOrigin, originLabel)
    block('Por canal', stats.byChannel, channelLabel)

    const cols = [{ t: 'Data', x: 12 }, { t: 'Cliente', x: 34 }, { t: 'Cidade', x: 92 }, { t: 'Origem', x: 128 }, { t: 'Canal', x: 168 }, { t: 'Status', x: 200 }, { t: 'Valor', x: W - 12 }]
    const header = () => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
      cols.forEach((c, i) => doc.text(c.t, c.x, y, i === cols.length - 1 ? { align: 'right' } : undefined))
      y += 2; doc.line(12, y, W - 12, y); y += 4
      doc.setFont('helvetica', 'normal')
    }
    if (y > 170) { doc.addPage(); y = 14 }
    header()
    rows.forEach(r => {
      if (y > 195) { doc.addPage(); y = 14; header() }
      doc.text(ptDate(r.date), 12, y)
      doc.text(strip(r.client).slice(0, 32), 34, y)
      doc.text(strip(r.city).slice(0, 20), 92, y)
      doc.text(strip(r.origin ? originLabel(r.origin) : '—').slice(0, 22), 128, y)
      doc.text(strip(r.channel ? channelLabel(r.channel) : '—').slice(0, 18), 168, y)
      doc.text(statusLabel(r.status), 200, y)
      doc.text(r.gross > 0 ? fmt(r.gross) : '—', W - 12, y, { align: 'right' })
      y += 5
    })
    doc.save(`relatorio-chamados-${generatedFor?.start}-${generatedFor?.end}.pdf`)
  }

  function shareWhatsApp() {
    if (!stats) return
    const l: string[] = []
    l.push(`📊 *${(tenant?.name ?? '').toUpperCase()} — RELATÓRIO DE CHAMADOS*`)
    l.push(`📅 ${periodText}`)
    filtersText.forEach(t => l.push(`_${t}_`))
    l.push('─────────────────────')
    l.push(`*Chamados:* ${stats.total}`)
    l.push(`*Aprovados:* ${stats.approved}${stats.total ? ` (${Math.round(stats.approved / stats.total * 100)}%)` : ''}`)
    l.push(`*Faturamento:* ${fmt(stats.gross)}`)
    l.push('─────────────────────')
    l.push('*Por status*'); stats.byStatus.forEach(s => l.push(`• ${statusLabel(s.key)}: ${s.calls}`))
    l.push('*Por origem*'); stats.byOrigin.forEach(s => l.push(`• ${originLabel(s.key)}: ${s.calls}${s.gross ? ` — ${fmt(s.gross)}` : ''}`))
    l.push('*Por canal*'); stats.byChannel.forEach(s => l.push(`• ${channelLabel(s.key)}: ${s.calls}${s.gross ? ` — ${fmt(s.gross)}` : ''}`))
    window.open(`https://wa.me/?text=${encodeURIComponent(l.join('\n'))}`, '_blank')
  }

  const Breakdown = ({ title, list, label }: { title: string; list: { key: string; calls: number; gross: number }[]; label: (k: string) => string }) => (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <p className="px-4 py-2.5 border-b border-slate-100 text-sm font-semibold text-slate-700">{title}</p>
      {list.length === 0 ? <p className="px-4 py-4 text-sm text-slate-400">—</p> : (
        <div className="divide-y divide-slate-50">
          {list.map(i => (
            <div key={i.key} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
              <span className="text-slate-700 truncate">{label(i.key)}</span>
              <span className="flex-shrink-0 text-right">
                <span className="font-semibold text-slate-800">{i.calls}</span>
                {stats && stats.total > 0 && <span className="text-xs text-slate-400 ml-1">({Math.round(i.calls / stats.total * 100)}%)</span>}
                {i.gross > 0 && <span className="block text-xs text-emerald-600 font-medium">{fmt(i.gross)}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-slate-800 flex items-center gap-2"><FileBarChart className="w-5 h-5" style={{ color: 'var(--primary)' }} /> Montar relatório</p>
          <p className="text-xs text-slate-500 capitalize">Período: {range.label || `${ptDate(range.start)} a ${ptDate(range.end)}`}</p>
        </div>
        <Chips title="Canal" options={channelOptions} selected={channels} onChange={setChannels} />
        <Chips title="Origem" options={originOptions} selected={originSel} onChange={setOriginSel} />
        <Chips title="Status" options={REPORT_STATUSES} selected={statuses} onChange={setStatuses} />
        <p className="text-xs text-slate-400">Toque em mais de uma opção pra juntar. &quot;Todos&quot; = sem filtro.</p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={openSheet}
            className="flex items-center justify-center gap-2 btn-primary text-sm px-6 py-3">
            <Table2 className="w-4 h-4" />
            Gerar relatório (planilha)
          </button>
          <button type="button" onClick={generate} disabled={loading}
            className="flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-700">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileBarChart className="w-4 h-4" />}
            Ver resumo aqui
          </button>
        </div>
      </div>

      {/* Resultado */}
      {rows && stats && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-bold text-slate-800">Relatório · {periodText}</p>
              <p className="text-xs text-slate-500">{filtersText.join(' · ')}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={exportPdf} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-700">
                <FileDown className="w-4 h-4" /> PDF
              </button>
              <button type="button" onClick={shareWhatsApp} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-700">
                <MessageSquare className="w-4 h-4 text-green-500" /> WhatsApp
              </button>
              <button type="button" onClick={() => setRows(null)} title="Fechar" className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { l: 'Chamados', v: String(stats.total), c: 'text-slate-800' },
              { l: 'Aprovados', v: `${stats.approved}${stats.total ? ` · ${Math.round(stats.approved / stats.total * 100)}%` : ''}`, c: 'text-emerald-600' },
              { l: 'Faturamento', v: fmt(stats.gross), c: 'text-slate-800' },
              { l: 'Líquido', v: fmt(stats.net), c: 'text-emerald-700' },
            ].map(c => (
              <div key={c.l} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
                <p className="text-xs text-slate-500">{c.l}</p>
                <p className={`text-lg font-bold ${c.c}`}>{c.v}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Breakdown title="Por status" list={stats.byStatus} label={statusLabel} />
            <Breakdown title="Por origem" list={stats.byOrigin} label={originLabel} />
            <Breakdown title="Por canal" list={stats.byChannel} label={channelLabel} />
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <p className="px-4 py-2.5 border-b border-slate-100 text-sm font-semibold text-slate-700">Chamados ({rows.length})</p>
            {rows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">Nenhum chamado com esses filtros no período</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      {['Data', 'Cliente', 'Origem', 'Canal', 'Status', 'Valor'].map((h, i) => (
                        <th key={h} className={`px-3 py-2 font-semibold ${i === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">{ptDate(r.date)}</td>
                        <td className="px-3 py-2">
                          <a href={`/dashboard/chamados/${r.id}`} className="font-medium text-slate-800 hover:underline">{r.client}</a>
                          {r.city && <span className="block text-xs text-slate-400">{r.city}</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">{r.origin ? originLabel(r.origin) : '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">{r.channel ? channelLabel(r.channel) : '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{statusLabel(r.status)}</span></td>
                        <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-slate-800">{r.gross > 0 ? fmt(r.gross) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
