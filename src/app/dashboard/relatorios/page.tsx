'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Download, TrendingUp, MapPin, Globe, Tag, Loader2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { getReportData } from '@/lib/db/reports'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import DateRangePicker, { DateRange } from '@/components/DateRangePicker'

const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const SERVICE_CATEGORIES = [
  'Desentupimento de ralo, vaso, esgoto, cano, pia, rede',
  'Limpeza de caixa de gordura',
  'Limpa fossa',
  'Outros',
]

async function exportPDF(data: any, range: DateRange) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const s = data?.summary
  const margin = 14
  let y = 20

  const line = () => { doc.setDrawColor(226, 232, 240); doc.line(margin, y, 196, y); y += 6 }
  const title = (text: string, size = 14) => {
    doc.setFontSize(size); doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'bold')
    doc.text(text, margin, y); y += size * 0.5 + 4
  }
  const row = (label: string, value: string, color?: [number, number, number]) => {
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105)
    doc.text(label, margin, y)
    if (color) doc.setTextColor(...color)
    doc.setFont('helvetica', 'bold')
    doc.text(value, 196, y, { align: 'right' })
    doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal')
    y += 7
  }

  // Header
  doc.setFontSize(22); doc.setTextColor(37, 99, 235); doc.setFont('helvetica', 'bold')
  doc.text('Líder Financeiro', margin, y); y += 8
  doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal')
  doc.text(`Relatório: ${range.label}`, margin, y); y += 5
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, y); y += 8
  line()

  // Resumo de chamados
  title('Resumo de Chamados', 13); y += 2
  row('Total de chamados recebidos:', String(s?.totalCalls ?? 0))
  row('Aprovados (serviço realizado):', String(s?.approvedCalls ?? 0), [5, 150, 105])
  row('Agendados:', String(s?.scheduledCalls ?? 0), [37, 99, 235])
  row('Não quis visita:', String(s?.noVisitCalls ?? 0), [100, 116, 139])
  row('Cancelados:', String(s?.cancelledCalls ?? 0), [220, 38, 38])

  const approvalRate = s?.totalCalls > 0 ? Math.round((s.approvedCalls / s.totalCalls) * 100) : 0
  row('Taxa de aprovação:', `${approvalRate}%`, approvalRate >= 50 ? [5, 150, 105] : [220, 38, 38])
  y += 2; line()

  // Resumo financeiro
  title('Resumo Financeiro', 13); y += 2
  row('Receita bruta:', fmt(s?.grossRevenue ?? 0), [37, 99, 235])
  row('Custos operacionais (terceirizados):', `- ${fmt(s?.outsourceCosts ?? 0)}`, [220, 38, 38])
  row('Despesas do período:', `- ${fmt(s?.totalExpenses ?? 0)}`, [220, 38, 38])
  row('Receita líquida:', fmt(s?.netRevenue ?? 0), [5, 150, 105])
  row('Recebido:', fmt(s?.paidRevenue ?? 0), [5, 150, 105])
  row('A receber:', fmt(s?.pendingRevenue ?? 0), [217, 119, 6])
  y += 2; line()

  // Por origem
  if (data?.byOrigin?.length) {
    title('Chamados por Origem', 13); y += 2
    data.byOrigin.forEach((o: any) => {
      row(`${o.name}:`, `${o.calls} chamados Â· ${fmt(o.revenue)}`)
    })
    y += 2; line()
  }

  // Por categoria
  if (data?.byCategory?.length) {
    title('Por Tipo de Serviço', 13); y += 2
    data.byCategory.forEach((c: any) => {
      row(`${c.category}:`, `${c.calls} chamados Â· ${fmt(c.revenue)}`)
    })
    y += 2; line()
  }

  // Por cidade
  if (data?.byCity?.length) {
    if (y > 230) { doc.addPage(); y = 20 }
    title('Ranking por Cidade', 13); y += 2
    data.byCity.slice(0, 8).forEach((c: any, i: number) => {
      row(`${i + 1}. ${c.city}:`, `${c.calls} OS Â· ${fmt(c.revenue)}`)
    })
  }

  doc.setFontSize(8); doc.setTextColor(148, 163, 184); doc.setFont('helvetica', 'normal')
  doc.text('Desentupidora Líder Â· Sistema Líder Financeiro', margin, 287)

  doc.save(`relatorio-lider-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

const today = new Date()
const defaultRange: DateRange = {
  start: format(startOfMonth(today), 'yyyy-MM-dd'),
  end: format(endOfMonth(today), 'yyyy-MM-dd'),
  label: format(today, "MMMM 'de' yyyy", { locale: ptBR }),
}

export default function RelatoriosPage() {
  const [range, setRange] = useState<DateRange>(defaultRange)
  const [originFilter, setOriginFilter] = useState('todos')
  const [categoryFilter, setCategoryFilter] = useState('todos')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getReportData(range.start, range.end, {
        origin: originFilter !== 'todos' ? originFilter : undefined,
        serviceCategory: categoryFilter !== 'todos' ? categoryFilter : undefined,
      })
      setData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [range, originFilter, categoryFilter])

  useEffect(() => { load() }, [load])

  const s = data?.summary
  const isEmpty = !loading && !s?.totalCalls

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Relatórios</h1>
          <p className="text-slate-500 text-sm mt-0.5">Análise completa do desempenho financeiro e operacional</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={range} onChange={setRange} />
          <button onClick={() => data && exportPDF(data, range)} disabled={!data || loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Filtros - compacto no mobile */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 space-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Origem</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { v: 'todos', l: 'Todos' },
              { v: 'site_lider', l: 'Líder' },
              { v: 'site_poa', l: 'POA' },
              { v: 'indicacao', l: 'Indicacao' },
              { v: 'terceirizado', l: 'Terceirizado' },
            ].map(o => (
              <button key={o.v} onClick={() => setOriginFilter(o.v)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${originFilter === o.v ? 'bg-orange-500 text-white border-orange-500' : 'text-slate-500 border-slate-200 hover:border-orange-300'}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Tipo de Servico</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {['todos', ...SERVICE_CATEGORIES].map(c => (
              <button key={c} onClick={() => setCategoryFilter(c)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${categoryFilter === c ? 'bg-orange-500 text-white border-orange-500' : 'text-slate-500 border-slate-200 hover:border-orange-300'}`}>
                {c === 'todos' ? 'Todos' : c.length > 20 ? c.slice(0,18)+'...' : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : isEmpty ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-16 text-center">
          <BarChart3 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum dado para o período selecionado</p>
        </div>
      ) : (
        <>
          {/* Cards de status dos chamados */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total', value: s?.totalCalls ?? 0, color: 'text-slate-700', icon: BarChart3 },
              { label: 'Aprovados', value: s?.approvedCalls ?? 0, color: 'text-emerald-600', icon: CheckCircle },
              { label: 'Agendados', value: s?.scheduledCalls ?? 0, color: 'text-orange-500', icon: Clock },
              { label: 'Não quis', value: s?.noVisitCalls ?? 0, color: 'text-slate-500', icon: XCircle },
              { label: 'Cancelados', value: s?.cancelledCalls ?? 0, color: 'text-red-500', icon: XCircle },
              { label: 'Aprovação', value: `${s?.totalCalls > 0 ? Math.round((s.approvedCalls / s.totalCalls) * 100) : 0}%`, color: 'text-emerald-600', icon: CheckCircle },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{c.label}</p>
                <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Cards financeiros */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Receita Bruta', value: fmt(s?.grossRevenue ?? 0), color: 'text-orange-500' },
              { label: 'Receita Líquida', value: fmt(s?.netRevenue ?? 0), color: 'text-emerald-600' },
              { label: 'Recebido', value: fmt(s?.paidRevenue ?? 0), color: 'text-emerald-600' },
              { label: 'A Receber', value: fmt(s?.pendingRevenue ?? 0), color: 'text-amber-600' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{c.label}</p>
                <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Revenue chart */}
          {data?.revenueByWeek?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-slate-800">Receita por Semana</h3>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.revenueByWeek} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={v => `R$${(Number(v)/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']} />
                  <Bar dataKey="bruto" name="Bruto" fill="#bfdbfe" radius={[4,4,0,0]} />
                  <Bar dataKey="liquido" name="Líquido" fill="#2563eb" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por Origem */}
            {data?.byOrigin?.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-slate-800">Por Origem</h3>
                </div>
                <div className="space-y-3">
                  {data.byOrigin.map((o: any) => (
                    <div key={o.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: o.color }} />
                          <span className="font-medium text-slate-700">{o.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400">{o.calls} chamados</span>
                          <span className="font-semibold text-slate-800">{fmt(o.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min((o.calls / (s?.totalCalls || 1)) * 100, 100)}%`, background: o.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Por Categoria */}
            {data?.byCategory?.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-slate-800">Por Tipo de Serviço</h3>
                </div>
                <div className="space-y-3">
                  {data.byCategory.map((c: any) => (
                    <div key={c.category}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{c.category}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400">{c.calls} OS</span>
                          <span className="font-semibold text-slate-800">{fmt(c.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min((c.calls / (s?.totalCalls || 1)) * 100, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Por Cidade */}
          {data?.byCity?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-slate-800">Ranking por Cidade</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-slate-100">
                      <th className="text-xs font-semibold text-slate-500 uppercase pb-3 pr-4">#</th>
                      <th className="text-xs font-semibold text-slate-500 uppercase pb-3 pr-4">Cidade</th>
                      <th className="text-xs font-semibold text-slate-500 uppercase pb-3 pr-4">OS</th>
                      <th className="text-xs font-semibold text-slate-500 uppercase pb-3">Receita</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.byCity.map((c: any, i: number) => (
                      <tr key={c.city} className="hover:bg-slate-50 transition">
                        <td className="py-3 pr-4">
                          <span className={`text-sm font-bold ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-300'}`}>#{i+1}</span>
                        </td>
                        <td className="py-3 pr-4 font-medium text-slate-800 text-sm">{c.city}</td>
                        <td className="py-3 pr-4 text-sm text-slate-600">{c.calls}</td>
                        <td className="py-3 text-sm font-semibold text-slate-800">{fmt(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

