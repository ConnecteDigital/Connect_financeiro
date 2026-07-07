'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Download, TrendingUp, MapPin, Globe, Tag, Loader2, CheckCircle, XCircle, Clock, TrendingDown, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getReportData, getExpensesReport, getCashEntriesReport } from '@/lib/db/reports'
import { getClients } from '@/lib/db/clients'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import DateRangePicker, { DateRange } from '@/components/DateRangePicker'
import { useCallOrigins } from '@/lib/use-call-origins'
import { useTenant } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/client'
import { SERVICE_CATEGORIES } from '@/lib/service-config'

const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const EXPENSE_CATEGORIES = ['aluguel', 'agua', 'luz', 'internet', 'telefone', 'combustivel', 'manutencao', 'salario', 'impostos', 'material', 'outros']

const today = new Date()
const defaultRange: DateRange = {
  start: format(startOfMonth(today), 'yyyy-MM-dd'),
  end: format(endOfMonth(today), 'yyyy-MM-dd'),
  label: format(today, "MMMM 'de' yyyy", { locale: ptBR }),
}

type MainTab = 'chamados' | 'saidas' | 'entradas'

export default function RelatoriosPage() {
  const [mainTab, setMainTab] = useState<MainTab>('chamados')
  const [range, setRange] = useState<DateRange>(defaultRange)

  // Chamados filters
  const [originFilter, setOriginFilter] = useState('todos')
  const [categoryFilter, setCategoryFilter] = useState('todos')

  // Saídas filters
  const [saidaCategory, setSaidaCategory] = useState('todos')
  const [saidaSupplier, setSaidaSupplier] = useState('todos')
  const [saidaStatus, setSaidaStatus] = useState('todos')

  // Entradas filters
  const [entradaClient, setEntradaClient] = useState('todos')
  const [entradaStatus, setEntradaStatus] = useState('todos')

  const [data, setData] = useState<any>(null)
  const [expData, setExpData] = useState<any>(null)
  const [ceData, setCeData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])

  const { origins: tenantOrigins } = useCallOrigins()
  const { tenant } = useTenant()

  // Load suppliers once
  useEffect(() => {
    const supabase = createClient()
    supabase.from('suppliers').select('id,name').then(({ data }) => setSuppliers(data ?? []))
    getClients().then(setClients).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (mainTab === 'chamados') {
        const result = await getReportData(range.start, range.end, {
          origin: originFilter !== 'todos' ? originFilter : undefined,
          serviceCategory: categoryFilter !== 'todos' ? categoryFilter : undefined,
        })
        setData(result)
      } else if (mainTab === 'saidas') {
        const result = await getExpensesReport(range.start, range.end, {
          category: saidaCategory !== 'todos' ? saidaCategory : undefined,
          supplierId: saidaSupplier !== 'todos' ? saidaSupplier : undefined,
          status: saidaStatus !== 'todos' ? saidaStatus : undefined,
        })
        setExpData(result)
      } else {
        const result = await getCashEntriesReport(range.start, range.end, {
          clientId: entradaClient !== 'todos' ? entradaClient : undefined,
          status: entradaStatus !== 'todos' ? entradaStatus : undefined,
        })
        setCeData(result)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [range, mainTab, originFilter, categoryFilter, saidaCategory, saidaSupplier, saidaStatus, entradaClient, entradaStatus])

  useEffect(() => { load() }, [load])

  const s = data?.summary

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Relatórios</h1>
          <p className="text-slate-500 text-sm mt-0.5">Análise completa do desempenho financeiro e operacional</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} variant="card" />
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { key: 'chamados', label: 'Chamados', icon: BarChart3 },
          { key: 'saidas', label: 'Saídas', icon: ArrowDownCircle },
          { key: 'entradas', label: 'Entradas', icon: ArrowUpCircle },
        ] as { key: MainTab; label: string; icon: any }[]).map(t => (
          <button key={t.key} onClick={() => setMainTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${mainTab === t.key ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CHAMADOS TAB ── */}
      {mainTab === 'chamados' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Origem</p>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {[{ v: 'todos', l: 'Todos' }, ...tenantOrigins.map(o => ({ v: o.value, l: o.label }))].map(o => (
                  <button key={o.v} onClick={() => setOriginFilter(o.v)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${originFilter === o.v ? 'bg-orange-500 text-white border-orange-500' : 'text-slate-500 border-slate-200 hover:border-orange-300'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Tipo de Serviço</p>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {['todos', ...SERVICE_CATEGORIES].map(c => (
                  <button key={c} onClick={() => setCategoryFilter(c)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${categoryFilter === c ? 'bg-orange-500 text-white border-orange-500' : 'text-slate-500 border-slate-200 hover:border-orange-300'}`}>
                    {c === 'todos' ? 'Todos' : c.length > 20 ? c.slice(0, 18) + '...' : c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? <LoadingSpinner /> : !s?.totalCalls ? <EmptyState /> : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { label: 'Total', value: s?.totalCalls ?? 0, color: 'text-slate-700' },
                  { label: 'Aprovados', value: s?.approvedCalls ?? 0, color: 'text-emerald-600' },
                  { label: 'Agendados', value: s?.scheduledCalls ?? 0, color: 'text-orange-500' },
                  { label: 'Não quis', value: s?.noVisitCalls ?? 0, color: 'text-slate-500' },
                  { label: 'Não aprovou', value: s?.notApprovedCalls ?? 0, color: 'text-amber-600' },
                  { label: 'Cancelados', value: s?.cancelledCalls ?? 0, color: 'text-red-500' },
                  { label: 'Aprovação', value: `${s?.totalCalls > 0 ? Math.round((s.approvedCalls / s.totalCalls) * 100) : 0}%`, color: 'text-emerald-600' },
                ].map(c => (
                  <div key={c.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{c.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                  </div>
                ))}
              </div>

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
                      <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={v => `R$${(Number(v) / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']} />
                      <Bar dataKey="bruto" name="Bruto" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="liquido" name="Líquido" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                              <span className={`text-sm font-bold ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-300'}`}>#{i + 1}</span>
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
        </>
      )}

      {/* ── SAÍDAS TAB ── */}
      {mainTab === 'saidas' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Categoria</label>
                <select value={saidaCategory} onChange={e => setSaidaCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="todos">Todas as categorias</option>
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Fornecedor</label>
                <select value={saidaSupplier} onChange={e => setSaidaSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="todos">Todos os fornecedores</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Status</label>
                <select value={saidaStatus} onChange={e => setSaidaStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="todos">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? <LoadingSpinner /> : !expData ? null : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{fmt(expData.total)}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Pago</p>
                  <p className="text-xl font-bold text-red-500 mt-1">{fmt(expData.paid)}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Pendente</p>
                  <p className="text-xl font-bold text-amber-500 mt-1">{fmt(expData.pending)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Por categoria */}
                {expData.byCategory?.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                    <h3 className="font-semibold text-slate-800 mb-4">Por Categoria</h3>
                    <div className="space-y-2">
                      {expData.byCategory.map((c: any) => (
                        <div key={c.cat} className="flex items-center justify-between text-sm py-1 border-b border-slate-50">
                          <span className="text-slate-700 capitalize">{c.cat}</span>
                          <span className="font-semibold text-slate-800">{fmt(c.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Por fornecedor */}
                {expData.bySupplier?.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                    <h3 className="font-semibold text-slate-800 mb-4">Por Fornecedor</h3>
                    <div className="space-y-2">
                      {expData.bySupplier.map((s: any) => (
                        <div key={s.name} className="flex items-center justify-between text-sm py-1 border-b border-slate-50">
                          <span className="text-slate-700">{s.name}</span>
                          <span className="font-semibold text-slate-800">{fmt(s.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Transactions list */}
              {expData.expenses?.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-semibold text-slate-800 mb-4">Lançamentos</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-slate-100">
                          <th className="text-xs font-semibold text-slate-500 uppercase pb-3 pr-4">Data</th>
                          <th className="text-xs font-semibold text-slate-500 uppercase pb-3 pr-4">Descrição</th>
                          <th className="text-xs font-semibold text-slate-500 uppercase pb-3 pr-4">Categoria</th>
                          <th className="text-xs font-semibold text-slate-500 uppercase pb-3 pr-4">Fornecedor</th>
                          <th className="text-xs font-semibold text-slate-500 uppercase pb-3 pr-4">Status</th>
                          <th className="text-xs font-semibold text-slate-500 uppercase pb-3 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {expData.expenses.map((e: any) => (
                          <tr key={e.id} className="hover:bg-slate-50">
                            <td className="py-2.5 pr-4 text-slate-500 whitespace-nowrap">
                              {e.due_date ? new Date(e.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                            </td>
                            <td className="py-2.5 pr-4 text-slate-800 font-medium">{e.description}</td>
                            <td className="py-2.5 pr-4 text-slate-500 capitalize">{e.category || '—'}</td>
                            <td className="py-2.5 pr-4 text-slate-500">{e.supplier?.name || '—'}</td>
                            <td className="py-2.5 pr-4">
                              <StatusBadge status={e.status} />
                            </td>
                            <td className="py-2.5 text-right font-semibold text-red-600">{fmt(e.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {expData.expenses?.length === 0 && (
                <EmptyState label="Nenhuma saída encontrada para o período e filtros selecionados" />
              )}
            </>
          )}
        </>
      )}

      {/* ── ENTRADAS TAB ── */}
      {mainTab === 'entradas' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Cliente</label>
                <select value={entradaClient} onChange={e => setEntradaClient(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="todos">Todos os clientes</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Status</label>
                <select value={entradaStatus} onChange={e => setEntradaStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="todos">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? <LoadingSpinner /> : !ceData ? null : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{fmt(ceData.total)}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Recebido</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{fmt(ceData.paid)}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">A Receber</p>
                  <p className="text-xl font-bold text-amber-500 mt-1">{fmt(ceData.pending)}</p>
                </div>
              </div>

              {/* Por cliente */}
              {ceData.byClient?.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-semibold text-slate-800 mb-4">Por Cliente</h3>
                  <div className="space-y-2">
                    {ceData.byClient.map((c: any) => (
                      <div key={c.name} className="flex items-center justify-between text-sm py-1 border-b border-slate-50">
                        <span className="text-slate-700">{c.name}</span>
                        <span className="font-semibold text-emerald-600">{fmt(c.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions list */}
              {ceData.entries?.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-semibold text-slate-800 mb-4">Lançamentos</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-slate-100">
                          <th className="text-xs font-semibold text-slate-500 uppercase pb-3 pr-4">Data</th>
                          <th className="text-xs font-semibold text-slate-500 uppercase pb-3 pr-4">Descrição</th>
                          <th className="text-xs font-semibold text-slate-500 uppercase pb-3 pr-4">Cliente</th>
                          <th className="text-xs font-semibold text-slate-500 uppercase pb-3 pr-4">Status</th>
                          <th className="text-xs font-semibold text-slate-500 uppercase pb-3 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {ceData.entries.map((e: any) => (
                          <tr key={e.id} className="hover:bg-slate-50">
                            <td className="py-2.5 pr-4 text-slate-500 whitespace-nowrap">
                              {e.due_date ? new Date(e.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                            </td>
                            <td className="py-2.5 pr-4 text-slate-800 font-medium">{e.description}</td>
                            <td className="py-2.5 pr-4 text-slate-500">{e.client?.name || '—'}</td>
                            <td className="py-2.5 pr-4">
                              <StatusBadge status={e.status} />
                            </td>
                            <td className="py-2.5 text-right font-semibold text-emerald-600">{fmt(e.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {ceData.entries?.length === 0 && (
                <EmptyState label="Nenhuma entrada encontrada para o período e filtros selecionados" />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  )
}

function EmptyState({ label }: { label?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-16 text-center">
      <BarChart3 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
      <p className="text-slate-500 font-medium">{label ?? 'Nenhum dado para o período selecionado'}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    pago: { label: 'Pago', bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
    pendente: { label: 'Pendente', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    cancelado: { label: 'Cancelado', bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
  }
  const s = map[status] ?? map.pendente
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>{s.label}</span>
  )
}
