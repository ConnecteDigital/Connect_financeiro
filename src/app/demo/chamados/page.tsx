'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PhoneCall, ChevronRight, Search } from 'lucide-react'
import { MOCK_CALLS } from '../data'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  aprovado:  { label: 'Aprovado',  color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  agendado:  { label: 'Agendado',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  aberto:    { label: 'Em aberto', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  orcamento: { label: 'Orçamento', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
}

const ORIGIN_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', telefone: 'Telefone', indicacao: 'Indicação',
  instagram: 'Instagram', site: 'Site',
}

export default function DemoChamados() {
  const [statusFilter, setStatusFilter] = useState('todos')
  const [search, setSearch] = useState('')

  const filtered = MOCK_CALLS.filter(c => {
    const statusOk = statusFilter === 'todos' || c.status === statusFilter
    const searchOk = !search || c.contact_name.toLowerCase().includes(search.toLowerCase()) || (c.os_number ?? '').toLowerCase().includes(search.toLowerCase())
    return statusOk && searchOk
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
          <PhoneCall className="w-5 h-5" style={{ color: '#3b82f6' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Chamados</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{MOCK_CALLS.length} chamados no período</p>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: 'aprovado', label: 'Aprovados', count: MOCK_CALLS.filter(c => c.status === 'aprovado').length, color: '#10b981' },
          { key: 'agendado', label: 'Agendados', count: MOCK_CALLS.filter(c => c.status === 'agendado').length, color: '#3b82f6' },
          { key: 'aberto',   label: 'Em aberto', count: MOCK_CALLS.filter(c => c.status === 'aberto').length,   color: '#f59e0b' },
        ].map(s => (
          <div key={s.key} className="rounded-2xl p-3 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.count}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        <input type="text" placeholder="Buscar cliente ou OS..." value={search} onChange={e => setSearch(e.target.value)}
          className="input-field pl-9 py-2 text-sm w-full" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { key: 'todos',    label: 'Todos' },
          { key: 'aprovado', label: 'Aprovados' },
          { key: 'agendado', label: 'Agendados' },
          { key: 'aberto',   label: 'Em aberto' },
        ].map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex-shrink-0"
            style={statusFilter === f.key
              ? { background: '#3b82f6', color: '#fff' }
              : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(call => {
          const s = STATUS_MAP[call.status] ?? STATUS_MAP.aberto
          return (
            <Link key={call.id} href={`/demo/chamados/${call.id}`}
              className="flex items-center gap-3 p-4 rounded-2xl transition hover:shadow-md"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{call.contact_name}</p>
                  {call.os_number && <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>{call.os_number}</span>}
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(call.date + 'T12:00:00').toLocaleDateString('pt-BR')} · {ORIGIN_LABELS[call.origin] ?? call.origin}
                  {call.call_city && ` · ${call.call_city}`}
                  {call.service_category && ` · ${call.service_category}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
