'use client'

import { useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createExpense } from '@/lib/db/expenses'

const categories = [
  'Frota', 'Pessoal', 'Marketing', 'Administrativo', 'Operacional', 'Impostos', 'Outros'
]

export default function NovaSaidaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    description: '',
    category: 'Operacional',
    amount: '',
    type: 'avulso',
    due_date: new Date().toISOString().split('T')[0],
    recurrence_day: '',
    notes: '',
  })

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await createExpense({
        ...form,
        amount: parseFloat(form.amount),
        recurrence_day: form.type === 'fixo' && form.recurrence_day ? parseInt(form.recurrence_day) : null,
      })
      router.push('/dashboard/saidas')
    } catch {
      setError('Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/saidas" className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lançar Saída</h1>
          <p className="text-slate-500 text-sm">Registre uma nova despesa</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Descrição *</label>
          <input type="text" required value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Ex: Gasolina, Parcela Caminhão..."
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
              {form.type === 'fixo' ? 'Data do próximo vencimento' : 'Data de vencimento'} *
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
          <Link href="/dashboard/saidas"
            className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar Saída'}
          </button>
        </div>
      </form>
    </div>
  )
}

