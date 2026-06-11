'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, CheckCircle, XCircle, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { getCalls } from '@/lib/db/calls'
import { getOriginLabel } from '@/lib/use-call-origins'

type Status = 'todos' | 'agendado' | 'aprovado' | 'nao_quis_visita' | 'cancelado'

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  agendado:        { label: 'Agendado',    color: 'bg-blue-50 text-blue-700 border-blue-200',        icon: Clock },
  aprovado:        { label: 'Aprovado',    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  nao_quis_visita: { label: 'Nao quis',   color: 'bg-zinc-100 text-zinc-600 border-zinc-200',        icon: XCircle },
  cancelado:       { label: 'Cancelado',  color: 'bg-red-50 text-red-600 border-red-200',            icon: XCircle },
}

const paymentConfig: Record<string, { label: string; color: string }> = {
  pago:        { label: 'Pago',    color: 'text-emerald-600' },
  pago_parcial:{ label: 'Parcial', color: 'text-amber-600' },
  pendente:    { label: 'Pendente',color: 'text-red-500' },
}


const filters: { value: Status; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'agendado', label: 'Agendado' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'nao_quis_visita', label: 'Nao quis' },
  { value: 'cancelado', label: 'Cancelado' },
]

export default function ChamadosPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<Status>('todos')
  const [calls, setCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 350)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCalls({ status: statusFilter, search: debouncedSearch })
      setCalls(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [statusFilter, debouncedSearch])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Chamados</h1>
          <p className="text-zinc-500 text-sm mt-0.5 hidden sm:block">Gerencie chamados e ordens de servico</p>
        </div>
        <Link href="/dashboard/chamados/novo"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Chamado</span>
          <span className="sm:hidden">Novo</span>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input type="text" placeholder="Buscar cliente ou contato..."
          value={search} onChange={e => handleSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm" />
      </div>

      {/* Filters - horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
        {filters.map(f => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)}
            className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition"
            style={statusFilter === f.value
              ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }
              : { background: '#fff', color: '#52525b', borderColor: '#e4e4e7' }
            }>
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-100 p-4 flex items-start gap-3">
              <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="skeleton h-4 w-40 rounded-lg" />
                <div className="skeleton h-3 w-24 rounded-lg" />
                <div className="skeleton h-3 w-16 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : calls.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center">
          <p className="text-zinc-400 text-sm">Nenhum chamado encontrado</p>
          <Link href="/dashboard/chamados/novo" className="text-orange-500 text-sm font-medium mt-2 inline-block">
            Registrar novo chamado
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {calls.map(c => {
            const so = c.service_orders?.[0]
            const cfg = statusConfig[c.status]
            const StatusIcon = cfg?.icon || Clock
            const pay = so ? paymentConfig[so.payment_status] : null
            const iconBg = c.status === 'aprovado' ? 'bg-emerald-50' : c.status === 'agendado' ? 'bg-blue-50' : c.status === 'cancelado' ? 'bg-red-50' : 'bg-zinc-50'
            const iconColor = c.status === 'aprovado' ? 'text-emerald-500' : c.status === 'agendado' ? 'text-blue-500' : c.status === 'cancelado' ? 'text-red-500' : 'text-zinc-400'

            return (
              <Link key={c.id} href={`/dashboard/chamados/${c.id}`}
                className="flex items-start gap-3 bg-white rounded-2xl border border-zinc-100 p-4 hover:border-orange-200 hover:shadow-sm transition active:scale-[0.99]">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                  <StatusIcon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-zinc-900 text-sm truncate">
                      {c.client?.name ?? c.contact_name ?? 'Sem identificacao'}
                    </p>
                    <ChevronRight className="w-4 h-4 text-zinc-300 flex-shrink-0" />
                  </div>
                  {c.service_category && <p className="text-xs text-zinc-500 mt-0.5">{c.service_category}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cfg?.color}`}>{cfg?.label}</span>
                    <span className="text-xs text-zinc-400">{new Date(c.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    <span className="text-xs text-zinc-400">{getOriginLabel(c.origin)}</span>
                  </div>
                  {so && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-50">
                      <span className={`text-xs font-semibold ${pay?.color}`}>{pay?.label}</span>
                      <span className="text-sm font-bold text-zinc-800">
                        R$ {Number(so.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
