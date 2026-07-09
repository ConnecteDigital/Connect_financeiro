'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant-context'
import { Wallet, TrendingDown, TrendingUp, FileText, BarChart3, Plus, Loader2, Check, AlertCircle, Trash2, Search, Pencil, X, Download } from 'lucide-react'
import DateRangePicker, { DateRange } from '@/components/DateRangePicker'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
  supplier?: { id: string; name: string } | null
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

const defaultRange = (): DateRange => {
  const d = new Date()
  return {
    start: format(startOfMonth(d), 'yyyy-MM-dd'),
    end: format(endOfMonth(d), 'yyyy-MM-dd'),
    label: format(d, "MMMM 'de' yyyy", { locale: ptBR }),
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  combustivel: 'Combustível', material: 'Material', alimentacao: 'Alimentação',
  salario: 'Salário', aluguel: 'Aluguel', manutencao: 'Manutenção', outros: 'Outros',
  Pessoal: 'Pessoal', Operacional: 'Operacional',
}

const STATIC_CATEGORIES = ['combustivel', 'material', 'alimentacao', 'salario', 'aluguel', 'manutencao', 'outros']

export default function FinanceiroPage() {
  const { tenant } = useTenant()
  const [activeTab, setActiveTab] = useState<Tab>('saidas')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([])
  const [serviceOrdersReceita, setServiceOrdersReceita] = useState(0)
  const [loading, setLoading] = useState(true)
  const reportRef = useRef<HTMLDivElement>(null)

  // Global categories (independent of date filter)
  const [allCategories, setAllCategories] = useState<string[]>(STATIC_CATEGORIES)

  // Date range (shared)
  const [range, setRange] = useState<DateRange>(defaultRange)

  // Saidas filters
  const [saidasCategoryFilter, setSaidasCategoryFilter] = useState('todos')
  const [saidasStatusFilter, setSaidasStatusFilter] = useState('todos')
  const [saidasSupplierFilter, setSaidasSupplierFilter] = useState('todos')
  const [saidasSearch, setSaidasSearch] = useState('')

  // Entradas filters
  const [entradasStatusFilter, setEntradasStatusFilter] = useState('todos')
  const [entradasSearch, setEntradasSearch] = useState('')

  // Suppliers list for filter
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])

  // New entry form state
  const [showSaidaForm, setShowSaidaForm] = useState(false)
  const [showEntradaForm, setShowEntradaForm] = useState(false)
  const [showBoletoForm, setShowBoletoForm] = useState(false)
  const [savingEntry, setSavingEntry] = useState(false)

  const [newSaida, setNewSaida] = useState({ description: '', amount: '', category: 'outros', type: 'avulso', due_date: new Date().toISOString().slice(0, 10), status: 'pendente' as string })
  const [newEntrada, setNewEntrada] = useState({ description: '', amount: '', entry_type: 'avulso', due_date: new Date().toISOString().slice(0, 10), status: 'pendente' as string })
  const [newBoleto, setNewBoleto] = useState({ description: '', amount: '', direction: 'saida', boleto_bank: '', boleto_code: '', due_date: new Date().toISOString().slice(0, 10) })

  // Edit modals
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editExpenseForm, setEditExpenseForm] = useState({ description: '', amount: '', category: 'outros', type: 'avulso', due_date: '', status: 'pendente' })
  const [editingCashEntry, setEditingCashEntry] = useState<CashEntry | null>(null)
  const [editCashEntryForm, setEditCashEntryForm] = useState({ description: '', amount: '', entry_type: 'avulso', due_date: '', status: 'pendente' })
  const [savingEdit, setSavingEdit] = useState(false)

  // Load all categories globally (no date filter)
  useEffect(() => {
    if (!tenant) return
    const supabase = createClient()
    supabase.from('expenses').select('category').then(({ data }) => {
      if (!data) return
      const cats = new Set<string>(STATIC_CATEGORIES)
      data.forEach(r => { if (r.category) cats.add(r.category) })
      setAllCategories(Array.from(cats).sort())
    })
  }, [tenant])

  const loadData = useCallback(async () => {
    if (!tenant) return
    setLoading(true)
    try {
      const supabase = createClient()
      const monthStart = range.start
      const monthEnd = range.end

      let expQuery = supabase.from('expenses').select('*, supplier:suppliers(id,name)').gte('due_date', monthStart).lte('due_date', monthEnd).order('due_date', { ascending: false })
      if (saidasSupplierFilter !== 'todos') expQuery = expQuery.eq('supplier_id', saidasSupplierFilter)

      const [expRes, ceRes, soRes, suppRes] = await Promise.all([
        expQuery,
        supabase.from('cash_entries').select('*').gte('due_date', monthStart).lte('due_date', monthEnd).order('due_date', { ascending: false }),
        supabase.from('service_orders').select('total_value, remaining_amount, payment_status, service_type, outsource_profit_pct, outsource_fuel_cost, outsource_meal_cost, outsource_truck_cost, outsource_other_cost').gte('date', monthStart).lte('date', monthEnd),
        supabase.from('suppliers').select('id,name').order('name'),
      ])
      if (expRes.data) setExpenses(expRes.data)
      if (ceRes.data) setCashEntries(ceRes.data)
      if (suppRes.data) setSuppliers(suppRes.data)
      if (soRes.data) {
        const receita = soRes.data.reduce((s: number, o: {
          total_value: number; remaining_amount: number; payment_status: string
          service_type: string; outsource_profit_pct: number
          outsource_fuel_cost: number; outsource_meal_cost: number; outsource_truck_cost: number; outsource_other_cost: number
        }) => {
          const gross = o.payment_status === 'pago' ? (o.total_value || 0) : (o.total_value || 0) - (o.remaining_amount || 0)
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
  }, [tenant, range, saidasSupplierFilter])

  useEffect(() => { loadData() }, [loadData])

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
        setNewSaida({ description: '', amount: '', category: 'outros', type: 'avulso', due_date: new Date().toISOString().slice(0, 10), status: 'pendente' })
        setShowSaidaForm(false)
        // Refresh global categories to include newly added one
        if (newSaida.category && !allCategories.includes(newSaida.category)) {
          setAllCategories(prev => [...prev, newSaida.category].sort())
        }
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
        setShowEntradaForm(false)
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
        setShowBoletoForm(false)
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

  function openEditExpense(exp: Expense) {
    setEditingExpense(exp)
    setEditExpenseForm({
      description: exp.description,
      amount: String(exp.amount),
      category: exp.category ?? 'outros',
      type: exp.type,
      due_date: exp.due_date,
      status: exp.status,
    })
  }

  async function handleSaveEditExpense() {
    if (!editingExpense) return
    setSavingEdit(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from('expenses').update({
        description: editExpenseForm.description.trim(),
        amount: Number(editExpenseForm.amount),
        category: editExpenseForm.category,
        type: editExpenseForm.type,
        due_date: editExpenseForm.due_date,
        status: editExpenseForm.status,
      }).eq('id', editingExpense.id).select().single()
      if (data) {
        setExpenses(prev => prev.map(e => e.id === editingExpense.id ? { ...e, ...data } : e))
      }
      setEditingExpense(null)
    } finally {
      setSavingEdit(false)
    }
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

  function openEditCashEntry(ce: CashEntry) {
    setEditingCashEntry(ce)
    setEditCashEntryForm({
      description: ce.description,
      amount: String(ce.amount),
      entry_type: ce.entry_type,
      due_date: ce.due_date,
      status: ce.status,
    })
  }

  async function handleSaveEditCashEntry() {
    if (!editingCashEntry) return
    setSavingEdit(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from('cash_entries').update({
        description: editCashEntryForm.description.trim(),
        amount: Number(editCashEntryForm.amount),
        entry_type: editCashEntryForm.entry_type,
        due_date: editCashEntryForm.due_date,
        status: editCashEntryForm.status,
      }).eq('id', editingCashEntry.id).select().single()
      if (data) {
        setCashEntries(prev => prev.map(e => e.id === editingCashEntry.id ? { ...e, ...data } : e))
      }
      setEditingCashEntry(null)
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleExportPDF(type: 'saidas' | 'entradas') {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    let y = 15

    // Header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(type === 'saidas' ? 'Relatório de Saídas' : 'Relatório de Entradas', pageW / 2, y, { align: 'center' })
    y += 7
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Período: ${range.start.split('-').reverse().join('/')} a ${range.end.split('-').reverse().join('/')}`, pageW / 2, y, { align: 'center' })
    y += 10

    if (type === 'saidas') {
      // Category breakdown
      const catMap: Record<string, number> = {}
      filteredExpenses.forEach(e => {
        const cat = e.category ?? 'outros'
        catMap[cat] = (catMap[cat] || 0) + Number(e.amount)
      })
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Resumo por Categoria', 14, y); y += 6
      Object.entries(catMap).sort((a, b) => b[1] - a[1]).forEach(([cat, val]) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(`${CATEGORY_LABELS[cat] ?? cat}`, 18, y)
        doc.text(fmt(val), pageW - 14, y, { align: 'right' })
        y += 5
      })
      y += 3

      // Summary line
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(`Total: ${fmt(totalExpenses)}   Pago: ${fmt(paidExpenses)}   Pendente: ${fmt(pendingExpenses)}`, 14, y); y += 8

      // List
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Detalhamento', 14, y); y += 6

      filteredExpenses.forEach(exp => {
        if (y > 270) { doc.addPage(); y = 15 }
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(exp.description.slice(0, 55), 14, y)
        doc.text(new Date(exp.due_date + 'T12:00:00').toLocaleDateString('pt-BR'), pageW - 50, y)
        doc.text(exp.status === 'pago' ? 'Pago' : 'Pendente', pageW - 30, y)
        doc.text(fmt(Number(exp.amount)), pageW - 14, y, { align: 'right' })
        y += 5
      })
    } else {
      // Entradas
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`Total: ${fmt(totalEntradas)}   Recebido: ${fmt(paidEntradas)}   Pendente: ${fmt(pendingEntradas)}`, 14, y); y += 8

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Detalhamento', 14, y); y += 6

      entradas.forEach(ce => {
        if (y > 270) { doc.addPage(); y = 15 }
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(ce.description.slice(0, 55), 14, y)
        doc.text(new Date(ce.due_date + 'T12:00:00').toLocaleDateString('pt-BR'), pageW - 50, y)
        doc.text(ce.status === 'pago' ? 'Recebido' : 'Pendente', pageW - 30, y)
        doc.text(fmt(Number(ce.amount)), pageW - 14, y, { align: 'right' })
        y += 5
      })
    }

    doc.save(`relatorio-${type}-${range.start}-${range.end}.pdf`)
  }

  // Computed
  const filteredExpenses = expenses.filter(e => {
    const statusOk = saidasStatusFilter === 'todos' || e.status === saidasStatusFilter
    const categoryOk = saidasCategoryFilter === 'todos' || e.category === saidasCategoryFilter
    const searchOk = !saidasSearch || e.description.toLowerCase().includes(saidasSearch.toLowerCase())
    return statusOk && categoryOk && searchOk
  })

  const categoryTotals = expenses.reduce((acc, e) => {
    const cat = e.category ?? 'outros'
    acc[cat] = (acc[cat] || 0) + Number(e.amount)
    return acc
  }, {} as Record<string, number>)

  const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const paidExpenses = filteredExpenses.filter(e => e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const pendingExpenses = filteredExpenses.filter(e => e.status === 'pendente').reduce((s, e) => s + Number(e.amount), 0)

  const entradas = cashEntries.filter(e => {
    if (e.direction !== 'entrada' || e.entry_type === 'boleto') return false
    const statusOk = entradasStatusFilter === 'todos' || e.status === entradasStatusFilter
    const searchOk = !entradasSearch || e.description.toLowerCase().includes(entradasSearch.toLowerCase())
    return statusOk && searchOk
  })
  const totalEntradas = entradas.reduce((s, e) => s + Number(e.amount), 0)
  const paidEntradas = entradas.filter(e => e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const pendingEntradas = entradas.filter(e => e.status !== 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const boletosPagar = cashEntries.filter(e => e.entry_type === 'boleto' && e.direction === 'saida')
  const boletosReceber = cashEntries.filter(e => e.entry_type === 'boleto' && e.direction === 'entrada')

  // Saldo tab
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

  const modalBase = 'fixed inset-0 z-50 flex items-center justify-center p-4'
  const modalOverlay = 'absolute inset-0 bg-black/40'
  const modalCard = 'relative w-full max-w-md rounded-2xl p-5 space-y-4 shadow-2xl'

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(var(--primary-rgb),0.1)' }}>
            <Wallet className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Financeiro</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Gerencie saídas, entradas, boletos e saldo</p>
          </div>
        </div>
        <DateRangePicker value={range} onChange={setRange} variant="card" />
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

              {/* Add button + PDF */}
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{filteredExpenses.length} saídas</p>
                <div className="flex gap-2">
                  <button onClick={() => handleExportPDF('saidas')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--surface)' }}>
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                  <button onClick={() => setShowSaidaForm(v => !v)}
                    className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Nova Saída
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <input type="text" placeholder="Buscar descrição..." value={saidasSearch}
                  onChange={e => setSaidasSearch(e.target.value)}
                  className="input-field pl-9 py-2 text-sm w-full" />
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
                        {allCategories.map(cat => (
                          <option key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</option>
                        ))}
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

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select value={saidasCategoryFilter} onChange={e => setSaidasCategoryFilter(e.target.value)}
                  className="input-field py-2 text-sm">
                  <option value="todos">Todas as categorias</option>
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</option>
                  ))}
                </select>
                <select value={saidasStatusFilter} onChange={e => setSaidasStatusFilter(e.target.value)}
                  className="input-field py-2 text-sm">
                  <option value="todos">Todos os status</option>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>
                <select value={saidasSupplierFilter} onChange={e => setSaidasSupplierFilter(e.target.value)}
                  className="input-field py-2 text-sm">
                  <option value="todos">Todos os fornecedores</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Category breakdown */}
              {Object.keys(categoryTotals).length > 0 && (
                <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Por categoria (período)</p>
                  {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{CATEGORY_LABELS[cat] ?? cat}</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(val)}</span>
                    </div>
                  ))}
                </div>
              )}

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
                          {exp.category && <span className="ml-2 opacity-70">{CATEGORY_LABELS[exp.category] ?? exp.category}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <p className="text-sm font-bold mr-1" style={{ color: 'var(--text-primary)' }}>{fmt(Number(exp.amount))}</p>
                        <button onClick={() => openEditExpense(exp)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:bg-blue-50"
                          title="Editar">
                          <Pencil className="w-4 h-4 text-blue-400" />
                        </button>
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
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{entradas.length} entradas</p>
                <div className="flex gap-2">
                  <button onClick={() => handleExportPDF('entradas')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--surface)' }}>
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                  <button onClick={() => setShowEntradaForm(v => !v)}
                    className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Entrada avulsa
                  </button>
                </div>
              </div>

              {/* Extra filters: search + status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                  <input type="text" placeholder="Buscar descrição..." value={entradasSearch}
                    onChange={e => setEntradasSearch(e.target.value)}
                    className="input-field pl-9 py-2 text-sm w-full" />
                </div>
                <div className="flex gap-1.5">
                  {(['todos', 'pendente', 'pago'] as const).map(f => (
                    <button key={f} onClick={() => setEntradasStatusFilter(f)}
                      className="flex-1 px-3 py-2 rounded-xl text-xs font-medium transition"
                      style={entradasStatusFilter === f
                        ? { background: 'var(--primary)', color: '#fff' }
                        : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
                      {f === 'todos' ? 'Todos' : f === 'pago' ? 'Recebido' : 'Pendente'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Total', value: totalEntradas, color: 'var(--text-primary)' },
                  { label: 'Recebido', value: paidEntradas, color: '#10b981' },
                  { label: 'Pendente', value: pendingEntradas, color: '#f59e0b' },
                ].map(card => (
                  <div key={card.label} className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{card.label}</p>
                    <p className="text-sm font-bold mt-1 leading-tight break-all" style={{ color: card.color }}>{fmt(card.value)}</p>
                  </div>
                ))}
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
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <p className="text-sm font-bold text-emerald-600 mr-1">{fmt(Number(ce.amount))}</p>
                        <button onClick={() => openEditCashEntry(ce)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:bg-blue-50"
                          title="Editar">
                          <Pencil className="w-4 h-4 text-blue-400" />
                        </button>
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

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className={modalBase}>
          <div className={modalOverlay} onClick={() => setEditingExpense(null)} />
          <div className={modalCard} style={{ background: 'var(--surface)', zIndex: 1 }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Editar Saída</h3>
              <button onClick={() => setEditingExpense(null)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100">
                <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Descrição*</label>
                <input type="text" value={editExpenseForm.description} onChange={e => setEditExpenseForm(p => ({ ...p, description: e.target.value }))}
                  className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Valor*</label>
                <input type="number" step="0.01" value={editExpenseForm.amount} onChange={e => setEditExpenseForm(p => ({ ...p, amount: e.target.value }))}
                  className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Vencimento</label>
                <input type="date" value={editExpenseForm.due_date} onChange={e => setEditExpenseForm(p => ({ ...p, due_date: e.target.value }))}
                  className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Categoria</label>
                <select value={editExpenseForm.category} onChange={e => setEditExpenseForm(p => ({ ...p, category: e.target.value }))}
                  className="input-field py-2.5 text-sm">
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Tipo</label>
                <select value={editExpenseForm.type} onChange={e => setEditExpenseForm(p => ({ ...p, type: e.target.value }))}
                  className="input-field py-2.5 text-sm">
                  <option value="avulso">Avulso</option>
                  <option value="fixo">Fixo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
                <select value={editExpenseForm.status} onChange={e => setEditExpenseForm(p => ({ ...p, status: e.target.value }))}
                  className="input-field py-2.5 text-sm">
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setEditingExpense(null)} className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>Cancelar</button>
              <button onClick={handleSaveEditExpense} disabled={savingEdit || !editExpenseForm.description.trim() || !editExpenseForm.amount}
                className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2">
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Cash Entry Modal */}
      {editingCashEntry && (
        <div className={modalBase}>
          <div className={modalOverlay} onClick={() => setEditingCashEntry(null)} />
          <div className={modalCard} style={{ background: 'var(--surface)', zIndex: 1 }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Editar Entrada</h3>
              <button onClick={() => setEditingCashEntry(null)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100">
                <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Descrição*</label>
                <input type="text" value={editCashEntryForm.description} onChange={e => setEditCashEntryForm(p => ({ ...p, description: e.target.value }))}
                  className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Valor*</label>
                <input type="number" step="0.01" value={editCashEntryForm.amount} onChange={e => setEditCashEntryForm(p => ({ ...p, amount: e.target.value }))}
                  className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Data</label>
                <input type="date" value={editCashEntryForm.due_date} onChange={e => setEditCashEntryForm(p => ({ ...p, due_date: e.target.value }))}
                  className="input-field py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Tipo</label>
                <select value={editCashEntryForm.entry_type} onChange={e => setEditCashEntryForm(p => ({ ...p, entry_type: e.target.value }))}
                  className="input-field py-2.5 text-sm">
                  <option value="avulso">Avulso</option>
                  <option value="venda">Venda</option>
                  <option value="servico">Serviço</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
                <select value={editCashEntryForm.status} onChange={e => setEditCashEntryForm(p => ({ ...p, status: e.target.value }))}
                  className="input-field py-2.5 text-sm">
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setEditingCashEntry(null)} className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>Cancelar</button>
              <button onClick={handleSaveEditCashEntry} disabled={savingEdit || !editCashEntryForm.description.trim() || !editCashEntryForm.amount}
                className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2">
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
