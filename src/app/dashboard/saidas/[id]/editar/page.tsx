'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { updateExpense } from '@/lib/db/expenses'
import { getSuppliers } from '@/lib/db/suppliers'
import { getClients } from '@/lib/db/clients'
import { createClient } from '@/lib/supabase/client'

const categories = ['Frota', 'Pessoal', 'Marketing', 'Administrativo', 'Operacional', 'Impostos', 'Outros']

export default function EditarSaidaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [form, setForm] = useState({
    description: '', category: 'Operacional', amount: '',
    type: 'avulso', due_date: '', recurrence_day: '', notes: '',
    supplier_id: '', client_id: '',
  })
  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('expenses').select('*').eq('id', id).single(),
      getSuppliers(),
      getClients(),
    ]).then(([{ data: e }, s, c]) => {
      if (e) setForm({
        description: e.description ?? '',
        category: e.category ?? 'Operacional',
        amount: String(e.amount ?? ''),
        type: e.type ?? 'avulso',
        due_date: e.due_date ?? '',
        recurrence_day: e.recurrence_day ? String(e.recurrence_day) : '',
        notes: e.notes ?? '',
        supplier_id: e.supplier_id ?? '',
        client_id: e.client_id ?? '',
      })
      setSuppliers(s)
      setClients(c)
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await updateExpense(id, {
        ...form,
        amount: parseFloat(form.amount),
        recurrence_day: form.type === 'fixo' && form.recurrence_day ? parseInt(form.recurrence_day) : null,
        supplier_id: form.supplier_id || null,
        client_id: form.client_id || null,
      })
      router.push('/dashboard/saidas')
    } catch { setError('Erro ao salvar. Tente novamente.') }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="max-w-xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 bg-slate-100 rounded w-48" />
      <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded" />)}
      </div>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/saidas" className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Editar Saída</h1>
          <p className="text-slate-500 text-sm">Atualize os dados da despesa</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Descrição *</label>
          <input required value={form.description} onChange={e => set('description', e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoria</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Valor (R$) *</label>
            <input type="number" required min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>

        {/* Fornecedor */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Fornecedor</label>
          <select value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value="">— Nenhum —</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <p className="text-xs text-slate-400 mt-1">
            Não encontrou? <Link href="/dashboard/fornecedores/novo" className="text-orange-500 hover:underline">Cadastrar fornecedor</Link>
          </p>
        </div>

        {/* Cliente (mensalidade) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Cliente <span className="text-slate-400 font-normal">(para mensalidades)</span></label>
          <select value={form.client_id} onChange={e => set('client_id', e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value="">— Nenhum —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
          <div className="flex gap-2">
            {[{ v: 'avulso', l: 'Avulso (único)' }, { v: 'fixo', l: 'Fixo (recorrente)' }].map(t => (
              <button key={t.v} type="button" onClick={() => set('type', t.v)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${form.type === t.v ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {t.l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {form.type === 'fixo' ? 'Próximo vencimento' : 'Data de vencimento'} *
            </label>
            <input type="date" required value={form.due_date} onChange={e => set('due_date', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          {form.type === 'fixo' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Dia do vencimento mensal</label>
              <input type="number" min="1" max="31" value={form.recurrence_day} onChange={e => set('recurrence_day', e.target.value)}
                placeholder="Ex: 10"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Observações</label>
          <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">{error}</div>}

        <div className="flex gap-3 justify-end pt-2">
          <Link href="/dashboard/saidas" className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition">Cancelar</Link>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
