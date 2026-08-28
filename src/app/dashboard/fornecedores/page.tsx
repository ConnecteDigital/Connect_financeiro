'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Building2, Phone, Mail, Trash2, Edit } from 'lucide-react'
import Link from 'next/link'
import { getSuppliers, deleteSupplier } from '@/lib/db/suppliers'

export default function FornecedoresPage() {
  const [search, setSearch] = useState('')
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function load(s?: string) {
    setLoading(true)
    getSuppliers(s || undefined)
      .then(data => setSuppliers(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function handleSearch(v: string) {
    setSearch(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(v), 350)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remover o fornecedor "${name}"?`)) return
    await deleteSupplier(id)
    load(search || undefined)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fornecedores</h1>
          <p className="text-slate-500 text-sm mt-0.5">Empresas e parceiros cadastrados</p>
        </div>
        <Link href="/dashboard/fornecedores/novo"
          className="flex items-center gap-2 btn-primary text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
          <Plus className="w-4 h-4" />
          Novo Fornecedor
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Buscar fornecedor..." value={search}
          onChange={e => handleSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl border border-slate-100 animate-pulse" />)}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Nenhum fornecedor cadastrado</p>
          <Link href="/dashboard/fornecedores/novo" className="text-[color:var(--primary)] text-sm font-medium mt-2 inline-block">
            Cadastrar primeiro fornecedor
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
          {suppliers.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-[color:var(--primary)]" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {s.category && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{s.category}</span>}
                    {s.phone && <span className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                    {s.email && <span className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/dashboard/fornecedores/${s.id}/editar`}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                  <Edit className="w-4 h-4" />
                </Link>
                <button onClick={() => handleDelete(s.id, s.name)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
