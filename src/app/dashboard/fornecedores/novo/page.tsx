'use client'

import { useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupplier } from '@/lib/db/suppliers'

const categories = ['Materiais', 'Serviços', 'Tecnologia', 'Frota', 'Marketing', 'Outros']

export default function NovoFornecedorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', category: '', contact: '', phone: '', email: '', notes: '' })
  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await createSupplier(form)
      router.push('/dashboard/fornecedores')
    } catch { setError('Erro ao salvar. Tente novamente.') }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/fornecedores" className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Novo Fornecedor</h1>
          <p className="text-slate-500 text-sm">Cadastre um fornecedor ou parceiro</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome / Razão Social *</label>
          <input required value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="Ex: Google, Loja de Ferramentas..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoria</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">Selecione...</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Contato / Responsável</label>
            <input value={form.contact} onChange={e => set('contact', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Observações</label>
          <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">{error}</div>}
        <div className="flex gap-3 justify-end pt-2">
          <Link href="/dashboard/fornecedores" className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition">Cancelar</Link>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar Fornecedor'}
          </button>
        </div>
      </form>
    </div>
  )
}
