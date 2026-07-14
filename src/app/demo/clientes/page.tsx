'use client'

import { useState } from 'react'
import { Users, Search, MapPin, Phone, Eye, UserPlus } from 'lucide-react'
import { MOCK_CLIENTS } from '../data'

export default function DemoClientes() {
  const [search, setSearch] = useState('')

  const filtered = MOCK_CLIENTS.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.city.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Clientes</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Banco de dados de clientes e histórico de serviços</p>
        </div>
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white opacity-40 cursor-not-allowed"
          style={{ background: '#2563eb' }}>
          <UserPlus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        <input
          type="text"
          placeholder="Buscar por nome ou cidade..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-9 py-2.5 text-sm w-full"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((client, i) => (
          <div key={client.id} className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-lg"
                style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
                CLI-{String(i + 1).padStart(3, '0')}
              </span>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{client.name}</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{client.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{client.phone}</span>
              </div>
            </div>
            <button
              disabled
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-medium opacity-50 cursor-not-allowed"
              style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              <Eye className="w-3.5 h-3.5" />
              Ver
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
