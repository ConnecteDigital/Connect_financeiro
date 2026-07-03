'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant-context'
import { Wallet, TrendingDown, TrendingUp, FileText, BarChart3, Plus, Loader2, Check, AlertCircle, Trash2 } from 'lucide-react'

type Tab = 'saidas' | 'entradas' | 'boletos' | 'saldo'

interface Expense {
  id: string
  description: string
  amount: number
  type: string
  category?: string
  status: string
  due_date: string
  paid_date?: string
  created_at: string
}

interface CashEntry {
  id: string
  description: string
  amount: number
  direction: string
  entry_type: string
  status: string
  due_date: string
  paid_date?: string
  boleto_code?: string
  boleto_bank?: string
  notes?: string
  created_at: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
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

export default function FinanceiroPage() {
  const { tenant } = useTenant()
  const [activeTab, setActiveTab] = useState<Tab>('saidas')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([])
  const [serviceOrdersReceita, setServiceOrdersReceita] = useState(0)
  const [loading, setLoading] = useState(true)

  // Saidas filters
  const [saidasTypeFilter, setSaidasTypeFilter] = useState('todos')
  const [saidasStatusFilter, setSaidasStatusFilter] = useState('todos')

  // New entry form state
  const [showSaidaForm, setShowSaidaForm] = useState(false)
  const [showEntradaForm, setShowEntradaForm] = useState(false)
  const [showBoletoForm, setShowBoletoForm] = useState(false)
  const [savingEntry, setSavingEntry] = useState(false)

  const [newSaida, setNewSaida] = useState({ description: '', amount: '', category: 'outros', type: 'avulso', due_date: new Date().toISOString().slice(0, 10), status: 'pendente' as string })
  const [newEntrada, setNewEntrada] = useState({ description: '', amount: '', entry_type: 'avulso', due_date: new Date().toISOString().slice(0, 10), status: 'pendente' as string })
  const [newBoleto, setNewBoleto] = useState({ description: '', amount: '', direction: 'saida', boleto_bank: '', boleto_code: '', due_date: new Date().toISOString().slice(0, 10) })

  useEffect(() => {
    if (!tenant) return
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant])

  async function loadData() {
    setLoading(true)
    try {
      const supabase = createClient()
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
      const [expRes, ceRes, soRes] = await Promise.all([
        supabase.from('expenses').select('*').order('created_at', { ascending: false }),
        supabase.from('cash_entries').select('*').order('created_at', { ascending: false }),
        // Receita de chamados aprovados (OS pagas/parciais no mês)
        supabase.from('service_orders').select('total_value, remaining_amount, payment_status, service_type, outsource_profit_pct, outsource_fuel_cost, outsource_meal_cost, outsource_truck_cost, outsource_other_cost').gte('date', monthStart).lte('date', monthEnd),
      ])
      if (expRes.data) setExpenses(expRes.data)
      if (ceRes.data) setCashEntries(ceRes.data)
      if (soRes.data) {
        const receita = soRes.data.reduce((s: number, o: {
          total_value: number; remaining_amount: number; payment_status: string
          service_type: string; outsource_profit_pct: number
          outsource_fuel_cost: number; outsource_meal_cost: number; outsource_truck_cost: number; outsource_other_cost: number
        }) => {
          const gross = o.payment_status === 'pago' ? (o.total_value || 0) : (o.total_value || 0) - (o.remaining_amount || 0)
          // Para terceirizado, a empresa só fica com a % definida (ex: 50%)
          const partnerCost = (o.service_type === 'terceirizado_saida')
            ? gross * (1 - (o.outsource_profit_pct ?? 50) / 100)
            : 0
          const operational = (o.outsource_fuel_cost || 0) + (o.outsource_meal_cost || 0) + (o.outsource_truck_cost || 0) + (o.outsource_other_cost || 0)
          return s + Math.max(0, gross - partnerCost - operational)
        }, 0)
        setServiceOrdersReceita(receita)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAddSaida() {
    if (!tenant || !newSaida.description.trim() || !newSaida.amount) return
    setSavingEntry(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from('expenses').insert({
        tenant_id: tenant.id,
        description: newSaida.description.trim(),
        amount: Number(newSaida.amount),
        category: newSaida.category,
        type: newSaida.type,
        status: newSaida.status,
        due_date: newSaida.due_date,
      }).select().single()
      if (data) {
        setExpenses(prev => [data, ...prev])
        setNewSaida({ description: '', amount: '', category: 'outros', type: 'variavel', due_date: new Date().toISOString().slice(0, 10), status: 'pendente' })
      }
    } finally {
      setSavingEntry(false)
    }
  }

  async function handleAddEntrada() {
    if (!tenant || !newEntrada.description.trim() || !newEntrada.amount) return
    setSavingEntry(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from('cash_entries').insert({
        tenant_id: tenant.id,
        description: newEntrada.description.trim(),
        amount: Number(newEntrada.amount),
        direction: 'entrada',
        entry_type: newEntrada.entry_type,
        status: newEntrada.status,
        due_date: newEntrada.due_date,
      }).select().single()
      if (data) {
        setCashEntries(prev => [data, ...prev])
        setNewEntrada({ description: '', amount: '', entry_type: 'avulso', due_date: new Date().toISOString().slice(0, 10), status: 'pendente' })
      }
    } finally {
      setSavingEntry(false)
    }
  }

  async function handleAddBoleto() {
    if (!tenant || !newBoleto.description.trim() || !newBoleto.amount) return
    setSavingEntry(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from('cash_entries').insert({
        tenant_id: tenant.id,
        description: newBoleto.description.trim(),
        amount: Number(newBoleto.amount),
        direction: newBoleto.direction,
        entry_type: 'boleto',
        status: 'pendente',
        due_date: newBoleto.due_date,
        boleto_bank: newBoleto.boleto_bank || null,
        boleto_code: newBoleto.boleto_code || null,
      }).select().single()
      if (data) {
        setCashEntries(prev => [data, ...prev])
        setNewBoleto({ description: '', amount: '', direction: 'saida', boleto_bank: '', boleto_code: '', due_date: new Date().toISOString().slice(0, 10) })
      }
    } finally {
      setSavingEntry(false)
    }
  }

  async function toggleExpenseStatus(exp: Expense) {
    const nextStatus = exp.status === 'pago' ? 'pendente' : 'pago'
    const supabase = createClient()
    await supabase.from('expenses').update({ status: nextStatus, paid_date: nextStatus === 'pago' ? new Date().toISOString().slice(0, 10) : null }).eq('id', exp.id)
    setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, status: nextStatus } : e))
  }

  async function deleteExpense(id: string) {
    if (!confirm('Excluir esta saída?')) return
    const supabase = createClient()
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  async function toggleCashEntryStatus(ce: CashEntry) {
    const nextStatus = ce.status === 'pago' ? 'pendente' : 'pago'
    const supabase = createClient()
    await supabase.from('cash_entries').update({ status: nextStatus, paid_date: nextStatus === 'pago' ? new Date().toISOString().slice(0, 10) : null }).eq('id', ce.id)
    setCashEntries(prev => prev.map(e => e.id === ce.id ? { ...e, status: nextStatus } : e))
  }

  async function deleteCashEntry(id: string) {
    if (!confirm('Excluir este registro?')) return
    const supabase = createClient()
    await supabase.from('cash_entries').delete().eq('id', id)
    setCashEntries(prev => prev.filter(e => e.id !== id))
  }

  const [saidasCategoryFilter, setSaidasCategoryFilter] = useState('todos')

  const CATEGORY_LABELS: Record<string, string> = {
    combustivel: 'Combustível', material: 'Material', alimentacao: 'Alimentação',
    salario: 'Salário', aluguel: 'Aluguel', manutencao: 'Manutenção', outros: 'Outros',
  }

  // Computed
  const filteredExpenses = expenses.filter(e => {
    const typeOk = saidasTypeFilter === 'todos' || e.type === saidasTypeFilter
    const statusOk = saidasStatusFilter === 'todos' || e.status === saidasStatusFilter
    const categoryOk = saidasCategoryFilter === 'todos' || e.category === saidasCategoryFilter
    return typeOk && statusOk && categoryOk
  })

  // Totais por categoria (sobre todas as despesas sem filtro de categoria)
  const categoryTotals = expenses.reduce((acc, e) => {
    const cat = e.category ?? 'outros'
    acc[cat] = (acc[cat] || 0) + Number(e.amount)
    return acc
  }, {} as Record<string, number>)

  const presentCategories = Object.entries(categoryTotals)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])

  const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const paidExpenses = filteredExpenses.filter(e => e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const pendingExpenses = filteredExpenses.filter(e => e.status === 'pendente').reduce((s, e) => s + Number(e.amount), 0)

  const entradas = cashEntries.filter(e => e.direction === 'entrada' && e.entry_type !== 'boleto')
  const boletosPagar = cashEntries.filter(e => e.entry_type === 'boleto' && e.direction === 'saida')
  const boletosReceber = cashEntries.filter(e => e.entry_type === 'boleto' && e.direction === 'entrada')

  // Saldo tab - current month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const entradasAvulsasMes = cashEntries.filter(e => e.direction === 'entrada' && e.due_date >= monthStart && e.due_date <= monthEnd && e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const entradasMes = serviceOrdersReceita + entradasAvulsasMes
  const saidasMes = expenses.filter(e => e.due_date >= monthStart && e.due_date <= monthEnd && e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const saldoLiquido = entradasMes - saidasMes
  const in7days = new Date()
  in7days.setDate(in7days.getDate() + 7)
  const in7daysStr = in7days.toISOString().slice(0, 10)
  const boletosVencer = cashEntries.filter(e => e.entry_type === 'boleto' && e.status === 'pendente' && e.due_date <= in7daysStr && e.due_date >= now.toISOString().slice(0, 10))

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'saidas', label: 'Saídas', icon: <TrendingDown className="w-4 h-4" /> },
    { key: 'entradas', label: 'Entradas', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'boletos', label: 'Boletos', icon: <FileText className="w-4 h-4" /> },
    { key: 'saldo', label: 'Saldo', icon: <BarChart3 className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(var(--primary-rgb),0.1)' }}>
          <Wallet className="w-5 h-5" style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Financeiro</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Gerencie saídas, entradas, boletos e saldo</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--surface-secondary)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={activeTab === t.key
              ? { background: 'var(--surface)', color: 'var(--primary)', boxShadow: 'var(--shadow-sm)' }
              : { color: 'var(--text-secondary)' }}>
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      ) : (
        <>
          {/* SAÍDAS TAB */}
          {activeTab === 'saidas' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Total', value: totalExpenses, color: 'var(--text-primary)' },
                  { label: 'Pago', value: paidExpenses, color: '#10b981' },
                  { label: 'Pendente', value: pendingExpenses, color: '#f59e0b' },
                ].map(card => (
                  <div key={card.label} className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{card.label}</p>
                    <p className="text-sm font-bold mt-1 leading-tight break-all" style={{ color: card.color }}>{fmt(card.value)}</p>
                  </div>
                ))}
              </div>

              {/* Add button */}
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{filteredExpenses.length} saídas</p>
                <button onClick={() => setShowSaidaForm(v => !v)}
                  className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Nova Saída
                </button>
              </div>

              {showSaidaForm && (
                <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--primary)' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Nova Saída</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Descrição*</label>
                      <input type="text" value={newSaida.description} onChange={e => setNewSaida(p => ({ ...p, description: e.target.value }))}
                        className="input-field py-2.5 text-sm" placeholder="Ex: Combustível, Aluguel..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Valor*</label>
                      <input type="number" step="0.01" value={newSaida.amount} onChange={e => setNewSaida(p => ({ ...p, amount: e.target.value }))}
                        className="input-field py-2.5 text-sm" placeholder="0,00" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Vencimento</label>
                      <input type="date" value={newSaida.due_date} onChange={e => setNewSaida(p => ({ ...p, due_date: e.target.value }))}
                        className="input-field py-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Categoria</label>
                      <select value={newSaida.category} onChange={e => setNewSaida(p => ({ ...p, category: e.target.value }))}
                        className="input-field py-2.5 text-sm">
                        <option value="combustivel">Combustível</option>
                        <option value="material">Material</option>
                        <option value="alimentacao">Alimentação</option>
                        <option value="salario">Salário</option>
                        <option value="aluguel">Aluguel</option>
                        <option value="manutencao">Manutenção</option>
                        <option value="outros">Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Tipo</label>
                      <select value={newSaida.type} onChange={e => setNewSaida(p => ({ ...p, type: e.target.value }))}
                        className="input-field py-2.5 text-sm">
                        <option value="avulso">Avulso</option>
                        <option value="fixo">Fixo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
                      <select value={newSaida.status} onChange={e => setNewSaida(p => ({ ...p, status: e.target.value }))}
                        className="input-field py-2.5 text-sm">
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowSaidaForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>Cancelar</button>
                    <button onClick={handleAddSaida} disabled={savingEntry || !newSaida.description.trim() || !newSaida.amount}
                      className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2">
                      {savingEntry ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Salvar
                    </button>
                  </div>
                </div>
              )}

              {/* Resumo por categoria */}
              {presentCategories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                  {presentCategories.map(([cat, total]) => (
                    <button key={cat} onClick={() => setSaidasCategoryFilter(saidasCategoryFilter === cat ? 'todos' : cat)}
                      className="flex-shrink-0 flex flex-col items-start px-3 py-2 rounded-xl text-left transition"
                      style={saidasCategoryFilter === cat
                        ? { background: 'var(--primary)', color: '#fff' }
                        : { background: 'var(--surface-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                      <span className="text-sm font-bold mt-0.5">{fmt(total)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {['todos', 'fixo', 'avulso'].map(f => (
                  <button key={f} onClick={() => setSaidasTypeFilter(f)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition"
                    style={saidasTypeFilter === f
                      ? { background: 'var(--primary)', color: '#fff' }
                      : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
                    {f === 'todos' ? 'Todos' : f === 'fixo' ? 'Fixo' : 'Avulso'}
                  </button>
                ))}
                <div className="w-px self-stretch" style={{ background: 'var(--border)' }} />
                {['todos', 'pago', 'pendente'].map(f => (
                  <button key={f} onClick={() => setSaidasStatusFilter(f)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition"
                    style={saidasStatusFilter === f
                      ? { background: 'var(--primary)', color: '#fff' }
                      : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
                    {f === 'todos' ? 'Todos' : f === 'pago' ? 'Pago' : 'Pendente'}
                  </button>
                ))}
                {saidasCategoryFilter !== 'todos' && (
                  <button onClick={() => setSaidasCategoryFilter('todos')}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition"
                    style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
                    × {CATEGORY_LABELS[saidasCategoryFilter] ?? saidasCategoryFilter}
                  </button>
                )}
              </div>

              {/* List */}
              <div className="space-y-2">
                {filteredExpenses.length === 0 && (
                  <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>Nenhuma saída encontrada</div>
                )}
                {filteredExpenses.map(exp => (
                  <div key={exp.id} className="rounded-2xl p-4"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{exp.description}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          Venc: {new Date(exp.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          {exp.type && <span className="ml-2 capitalize opacity-70">{exp.type}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(Number(exp.amount))}</p>
                        <button onClick={() => deleteExpense(exp.id)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:bg-red-50"
                          title="Excluir">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => toggleExpenseStatus(exp)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                        style={exp.status === 'pago'
                          ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' }
                          : { background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                        <Check className="w-3.5 h-3.5" />
                        {exp.status === 'pago' ? 'Pago — clique para pendente' : 'Pendente — clique para pago'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ENTRADAS TAB */}
          {activeTab === 'entradas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{entradas.length} entradas</p>
                <button onClick={() => setShowEntradaForm(v => !v)}
                  className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Entrada avulsa
                </button>
              </div>

              {showEntradaForm && (
                <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--primary)' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Nova Entrada</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Descrição*</label>
                      <input type="text" value={newEntrada.description} onChange={e => setNewEntrada(p => ({ ...p, description: e.target.value }))}
                        className="input-field py-2.5 text-sm" placeholder="Ex: Recebimento de serviço..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Valor*</label>
                      <input type="number" step="0.01" value={newEntrada.amount} onChange={e => setNewEntrada(p => ({ ...p, amount: e.target.value }))}
                        className="input-field py-2.5 text-sm" placeholder="0,00" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Data</label>
                      <input type="date" value={newEntrada.due_date} onChange={e => setNewEntrada(p => ({ ...p, due_date: e.target.value }))}
                        className="input-field py-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Tipo</label>
                      <select value={newEntrada.entry_type} onChange={e => setNewEntrada(p => ({ ...p, entry_type: e.target.value }))}
                        className="input-field py-2.5 text-sm">
                        <option value="avulso">Avulso</option>
                        <option value="venda">Venda</option>
                        <option value="servico">Serviço</option>
                        <option value="outros">Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
                      <select value={newEntrada.status} onChange={e => setNewEntrada(p => ({ ...p, status: e.target.value }))}
                        className="input-field py-2.5 text-sm">
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowEntradaForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>Cancelar</button>
                    <button onClick={handleAddEntrada} disabled={savingEntry || !newEntrada.description.trim() || !newEntrada.amount}
                      className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2">
                      {savingEntry ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Salvar
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {entradas.length === 0 && (
                  <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>Nenhuma entrada cadastrada</div>
                )}
                {entradas.map(ce => (
                  <div key={ce.id} className="rounded-2xl p-4"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{ce.description}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {new Date(ce.due_date + 'T12:00:00').toLocaleDateString('pt-BR')} · {ce.entry_type}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <p className="text-sm font-bold text-emerald-600">{fmt(Number(ce.amount))}</p>
                        <button onClick={() => deleteCashEntry(ce.id)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:bg-red-50"
                          title="Excluir">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button onClick={() => toggleCashEntryStatus(ce)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                        style={ce.status === 'pago'
                          ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' }
                          : { background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                        <Check className="w-3.5 h-3.5" />
                        {ce.status === 'pago' ? 'Recebido — clique para pendente' : 'Pendente — clique para recebido'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOLETOS TAB */}
          {activeTab === 'boletos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{boletosPagar.length + boletosReceber.length} boletos</p>
                <button onClick={() => setShowBoletoForm(v => !v)}
                  className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Boleto
                </button>
              </div>

              {showBoletoForm && (
                <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--primary)' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Novo Boleto</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Descrição*</label>
                      <input type="text" value={newBoleto.description} onChange={e => setNewBoleto(p => ({ ...p, description: e.target.value }))}
                        className="input-field py-2.5 text-sm" placeholder="Ex: Aluguel, Fornecedor..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Valor*</label>
                      <input type="number" step="0.01" value={newBoleto.amount} onChange={e => setNewBoleto(p => ({ ...p, amount: e.target.value }))}
                        className="input-field py-2.5 text-sm" placeholder="0,00" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Direção</label>
                      <select value={newBoleto.direction} onChange={e => setNewBoleto(p => ({ ...p, direction: e.target.value }))}
                        className="input-field py-2.5 text-sm">
                        <option value="saida">A Pagar</option>
                        <option value="entrada">A Receber</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Banco</label>
                      <input type="text" value={newBoleto.boleto_bank} onChange={e => setNewBoleto(p => ({ ...p, boleto_bank: e.target.value }))}
                        className="input-field py-2.5 text-sm" placeholder="Ex: Bradesco, Itaú..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Vencimento</label>
                      <input type="date" value={newBoleto.due_date} onChange={e => setNewBoleto(p => ({ ...p, due_date: e.target.value }))}
                        className="input-field py-2.5 text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Código de Barras</label>
                      <input type="text" value={newBoleto.boleto_code} onChange={e => setNewBoleto(p => ({ ...p, boleto_code: e.target.value }))}
                        className="input-field py-2.5 text-sm" placeholder="000..." />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowBoletoForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>Cancelar</button>
                    <button onClick={handleAddBoleto} disabled={savingEntry || !newBoleto.description.trim() || !newBoleto.amount}
                      className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2">
                      {savingEntry ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Salvar
                    </button>
                  </div>
                </div>
              )}

              {/* Boletos a Pagar */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <TrendingDown className="w-4 h-4 text-red-500" /> Boletos a Pagar
                </h3>
                <div className="space-y-2">
                  {boletosPagar.length === 0 && <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>Nenhum boleto a pagar</p>}
                  {boletosPagar.map(ce => (
                    <div key={ce.id} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{ce.description}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            Venc: {new Date(ce.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            {ce.boleto_bank && <span className="ml-2">{ce.boleto_bank}</span>}
                          </p>
                          {ce.boleto_code && <p className="text-xs mt-0.5 font-mono truncate" style={{ color: 'var(--text-tertiary)' }}>{ce.boleto_code}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <p className="text-sm font-bold text-red-500">{fmt(Number(ce.amount))}</p>
                          <button onClick={() => deleteCashEntry(ce.id)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:bg-red-50"
                            title="Excluir">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <button onClick={() => toggleCashEntryStatus(ce)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                          style={ce.status === 'pago'
                            ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' }
                            : { background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                          <Check className="w-3.5 h-3.5" />
                          {ce.status === 'pago' ? 'Pago — clique para pendente' : 'Pendente — clique para pago'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Boletos a Receber */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Boletos a Receber
                </h3>
                <div className="space-y-2">
                  {boletosReceber.length === 0 && <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>Nenhum boleto a receber</p>}
                  {boletosReceber.map(ce => (
                    <div key={ce.id} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{ce.description}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            Venc: {new Date(ce.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            {ce.boleto_bank && <span className="ml-2">{ce.boleto_bank}</span>}
                          </p>
                          {ce.boleto_code && <p className="text-xs mt-0.5 font-mono truncate" style={{ color: 'var(--text-tertiary)' }}>{ce.boleto_code}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <p className="text-sm font-bold text-emerald-600">{fmt(Number(ce.amount))}</p>
                          <button onClick={() => deleteCashEntry(ce.id)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:bg-red-50"
                            title="Excluir">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <button onClick={() => toggleCashEntryStatus(ce)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                          style={ce.status === 'pago'
                            ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' }
                            : { background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                          <Check className="w-3.5 h-3.5" />
                          {ce.status === 'pago' ? 'Recebido — clique para pendente' : 'Pendente — clique para recebido'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SALDO TAB */}
          {activeTab === 'saldo' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Entradas do Mês</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600 break-all">{fmt(entradasMes)}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Chamados: {fmt(serviceOrdersReceita)} · Avulsas: {fmt(entradasAvulsasMes)}</p>
                </div>
                <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="w-5 h-5 text-red-500" />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Saídas do Mês</p>
                  </div>
                  <p className="text-2xl font-bold text-red-500 break-all">{fmt(saidasMes)}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Despesas pagas em {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="rounded-2xl p-5 sm:col-span-2" style={{
                  background: saldoLiquido >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${saldoLiquido >= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                }}>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-5 h-5" style={{ color: saldoLiquido >= 0 ? '#10b981' : '#ef4444' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Saldo Líquido do Mês</p>
                  </div>
                  <p className="text-3xl font-bold break-all" style={{ color: saldoLiquido >= 0 ? '#10b981' : '#ef4444' }}>{fmt(saldoLiquido)}</p>
                </div>
                <div className="rounded-2xl p-5 sm:col-span-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Boletos a Vencer (próximos 7 dias)</p>
                  </div>
                  {boletosVencer.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Nenhum boleto vencendo nos próximos 7 dias</p>
                  ) : (
                    <div className="space-y-2">
                      {boletosVencer.map(b => (
                        <div key={b.id} className="flex items-center justify-between py-1.5">
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{b.description}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Venc: {new Date(b.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                          </div>
                          <p className="text-sm font-semibold" style={{ color: b.direction === 'saida' ? '#ef4444' : '#10b981' }}>{fmt(Number(b.amount))}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
