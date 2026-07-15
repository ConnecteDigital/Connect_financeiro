'use client'

import { useState } from 'react'
import { Building2, Phone, Search, Pencil, Trash2, Plus } from 'lucide-react'
import { MOCK_SUPPLIERS } from '../data'

export default function DemoFornecedores() {
  const [search, setSearch] = useState('')

  const filtered = MOCK_SUPPLIERS.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Fornecedores</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Empresas e parceiros cadastrados</p>
        </div>
        <button disabled
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white opacity-40 cursor-not-allowed"
          style={{ background: '#2563eb' }}>
          <Plus className="w-4 h-4" />
          Novo Fornecedor
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        <input type="text" placeholder="Buscar fornecedor..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-9 py-2.5 text-sm w-full" />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {filtered.map((s, i) => (
          <div key={s.id} className="flex items-center justify-between p-4"
            style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(37,99,235,0.1)' }}>
                <Building2 className="w-5 h-5" style={{ color: '#2563eb' }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {s.category && (
                    <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
                      {s.category}
                    </span>
                  )}
                  {s.phone && (
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                      <Phone className="w-3 h-3" />{s.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-30">
              <button disabled className="w-8 h-8 rounded-lg flex items-center justify-center cursor-not-allowed"
                style={{ background: 'var(--surface-secondary)' }}>
                <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
              </button>
              <button disabled className="w-8 h-8 rounded-lg flex items-center justify-center cursor-not-allowed"
                style={{ background: 'var(--surface-secondary)' }}>
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
