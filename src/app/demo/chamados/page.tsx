'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, CheckCircle, XCircle, Clock, ChevronRight, Plus } from 'lucide-react'
import { MOCK_CALLS } from '../data'

const statusConfig: Record<string, { label: string; color: string; border: string; bg: string; icon: React.ElementType }> = {
  agendado:  { label: 'Agendado',    color: 'text-blue-700',    border: 'border-blue-200',   bg: 'bg-blue-50',    icon: Clock },
  aprovado:  { label: 'Aprovado',    color: 'text-emerald-700', border: 'border-emerald-200',bg: 'bg-emerald-50', icon: CheckCircle },
  aberto:    { label: 'Em aberto',   color: 'text-amber-700',   border: 'border-amber-200',  bg: 'bg-amber-50',   icon: Clock },
  nao_aprovou:    { label: 'Não aprovou', color: 'text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50', icon: XCircle },
  nao_quis_visita:{ label: 'Não quis',   color: 'text-zinc-600',  border: 'border-zinc-200',  bg: 'bg-zinc-100',  icon: XCircle },
  cancelado: { label: 'Cancelado',   color: 'text-red-600',     border: 'border-red-200',   bg: 'bg-red-50',     icon: XCircle },
}

const ORIGIN_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', telefone: 'Telefone', indicacao: 'Indicação',
  instagram: 'Instagram', site: 'Site',
}

const PAYMENT_CONFIG: Record<string, { label: string; color: string }> = {
  pago:        { label: 'Pago',     color: 'text-emerald-600' },
  pago_parcial:{ label: 'Parcial',  color: 'text-amber-600' },
  pendente:    { label: 'Pendente', color: 'text-red-500' },
}

const filters = [
  { value: 'todos',    label: 'Todos' },
  { value: 'agendado', label: 'Agendado' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'aberto',   label: 'Em aberto' },
]

// origin counts
const originCounts = MOCK_CALLS.reduce((acc, c) => {
  acc[c.origin] = (acc[c.origin] || 0) + 1; return acc
}, {} as Record<string, number>)

export default function DemoChamados() {
  const [statusFilter, setStatusFilter] = useState('todos')
  const [originFilter, setOriginFilter] = useState('todos')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => MOCK_CALLS.filter(c => {
    const statusOk = statusFilter === 'todos' || c.status === statusFilter
    const originOk = originFilter === 'todos' || c.origin === originFilter
    const searchOk = !search
      || c.contact_name.toLowerCase().includes(search.toLowerCase())
      || (c.os_number ?? '').toLowerCase().includes(search.toLowerCase())
    return statusOk && originOk && searchOk
  }), [statusFilter, originFilter, search])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Chamados</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Gerencie chamados e ordens de serviço</p>
        </div>
        <Link href="/demo/chamados/novo"
          className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: '#2563eb' }}>
          <Plus className="w-4 h-4" />
          Novo Chamado
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        <input type="text" placeholder="Buscar cliente, contato ou código OS..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-9 py-2.5 text-sm w-full" />
      </div>

      {/* Status filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {filters.map(f => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex-shrink-0"
            style={statusFilter === f.value
              ? { background: 'var(--primary)', color: '#fff' }
              : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Origin filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setOriginFilter('todos')}
          className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex-shrink-0"
          style={originFilter === 'todos'
            ? { background: '#18181b', color: '#fff' }
            : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          Todas origens ({MOCK_CALLS.length})
        </button>
        {Object.entries(originCounts).map(([origin, count]) => (
          <button key={origin} onClick={() => setOriginFilter(origin)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex-shrink-0"
            style={originFilter === origin
              ? { background: '#18181b', color: '#fff' }
              : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            {ORIGIN_LABELS[origin] ?? origin} ({count})
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(call => {
          const s = statusConfig[call.status] ?? statusConfig.aberto
          const Icon = s.icon
          const isApproved = call.status === 'aprovado'
          const payConf = call.payment_status ? PAYMENT_CONFIG[call.payment_status] : null

          return (
            <Link key={call.id} href={`/demo/chamados/${call.id}`}
              className="flex items-start gap-3 p-4 rounded-2xl transition hover:shadow-md"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {/* Status icon */}
              <div className="mt-0.5 flex-shrink-0">
                <Icon className={`w-5 h-5 ${isApproved ? 'text-emerald-500' : call.status === 'agendado' ? 'text-blue-400' : 'text-zinc-400'}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{call.contact_name}</p>
                    {call.service_category && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{call.service_category}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-tertiary)' }} />
                </div>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${s.bg} ${s.color} ${s.border}`}>
                    {s.label}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(call.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {ORIGIN_LABELS[call.origin] ?? call.origin}
                  </span>
                </div>

                {isApproved && call.total_value && (
                  <div className="flex items-center justify-between mt-1.5">
                    {payConf && (
                      <span className={`text-xs font-semibold ${payConf.color}`}>{payConf.label}</span>
                    )}
                    <span className="text-sm font-bold ml-auto" style={{ color: 'var(--text-primary)' }}>
                      R$ {call.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
