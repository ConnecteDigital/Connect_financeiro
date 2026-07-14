'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import { MOCK_QUOTES } from '../data'

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pendente: { label: 'Pendente', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  aprovado: { label: 'Aprovado', bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  recusado: { label: 'Recusado', bg: 'rgba(239,68,68,0.1)',  color: '#ef4444' },
}

export default function DemoOrcamentos() {
  const [filter, setFilter] = useState('todos')

  const filtered = MOCK_QUOTES.filter(q => filter === 'todos' || q.status === filter)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.1)' }}>
          <FileText className="w-5 h-5" style={{ color: '#2563eb' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Orçamentos</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Gerencie propostas e orçamentos para clientes</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['todos', 'pendente', 'aprovado', 'recusado'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition"
            style={filter === f
              ? { background: '#2563eb', color: '#fff' }
              : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
            {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(q => {
          const s = STATUS_MAP[q.status] ?? STATUS_MAP.pendente
          return (
            <div key={q.id} className="block rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold" style={{ color: '#2563eb' }}>{q.quote_number}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                  </div>
                  <p className="text-sm font-semibold mt-1 truncate" style={{ color: 'var(--text-primary)' }}>{q.client_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(q.created_at).toLocaleDateString('pt-BR')}
                    {q.valid_until && <span className="ml-2">· Válido até {new Date(q.valid_until + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                  </p>
                </div>
                <p className="text-base font-bold flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{fmt(q.total)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
