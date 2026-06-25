'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PhoneCall, TrendingUp, Clock, DollarSign,
  CheckCircle, Building2, RefreshCw, ChevronRight,
} from 'lucide-react'

interface TenantStats {
  tenant: {
    id: string
    slug: string
    name: string
    logo_url: string | null
    primary_color: string
    active: boolean
  }
  stats: {
    total_calls: number
    approved_calls: number
    open_calls: number
    gross_revenue: number
    pending_receivables: number
  }
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function TenantCard({ item, onSwitch }: { item: TenantStats; onSwitch: () => void }) {
  const { tenant, stats } = item
  const color = tenant.primary_color || '#f97316'
  const convRate = stats.total_calls > 0
    ? Math.round((stats.approved_calls / stats.total_calls) * 100)
    : 0

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: color }}>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logo_url} alt={tenant.name} className="w-8 h-8 object-contain" />
          ) : (
            <span className="text-white font-bold text-lg">{tenant.name[0]}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">{tenant.name}</p>
          <p className="text-white/70 text-xs">{tenant.slug}</p>
        </div>
        <button
          onClick={onSwitch}
          className="flex items-center gap-1 bg-white/20 hover:bg-white/30 transition rounded-xl px-3 py-1.5"
        >
          <span className="text-white text-xs font-semibold">Acessar</span>
          <ChevronRight className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Chamados</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{stats.total_calls}</p>
          <p className="text-xs text-slate-400 mt-0.5">este mês</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs text-slate-500 font-medium">Aprovados</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">{stats.approved_calls}</p>
          <p className="text-xs text-slate-400 mt-0.5">{convRate}% conversão</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs text-slate-500 font-medium">Em aberto</span>
          </div>
          <p className="text-xl font-bold text-amber-600">{stats.open_calls}</p>
          <p className="text-xs text-slate-400 mt-0.5">aguardando</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">A receber</span>
          </div>
          <p className="text-base font-bold text-slate-700 break-all">{fmt(stats.pending_receivables)}</p>
        </div>
      </div>

      {/* Revenue footer */}
      <div className="px-4 pb-4">
        <div className="rounded-xl px-4 py-2.5 flex items-center justify-between"
          style={{ background: `${color}18` }}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color }} />
            <span className="text-sm font-semibold text-slate-700">Faturamento</span>
          </div>
          <span className="text-sm font-bold" style={{ color }}>{fmt(stats.gross_revenue)}</span>
        </div>
      </div>
    </div>
  )
}

export default function MasterDashboard() {
  const router = useRouter()
  const [data, setData] = useState<TenantStats[]>([])
  const [month, setMonth] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch('/api/master/summary')
      if (res.status === 403) {
        router.replace('/dashboard')
        return
      }
      if (!res.ok) throw new Error('Erro ao carregar dados')
      const json = await res.json()
      setData(json.summaries)
      setMonth(json.month)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  // Totals
  const totals = data.reduce((acc, item) => ({
    calls: acc.calls + item.stats.total_calls,
    approved: acc.approved + item.stats.approved_calls,
    open: acc.open + item.stats.open_calls,
    revenue: acc.revenue + item.stats.gross_revenue,
    pending: acc.pending + item.stats.pending_receivables,
  }), { calls: 0, approved: 0, open: 0, revenue: 0, pending: 0 })

  const monthLabel = month
    ? new Date(month + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : ''

  function handleSwitch(slug: string) {
    router.push(`/dashboard/master/view/${slug}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Carregando...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        {error}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-slate-400" />
            <h1 className="text-xl font-bold text-slate-800">Painel Master</h1>
          </div>
          {monthLabel && (
            <p className="text-sm text-slate-500 capitalize">{monthLabel}</p>
          )}
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Totals bar */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 mb-6">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Consolidado — {data.length} clientes
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Faturamento</p>
            <p className="text-white text-lg font-bold break-all">{fmt(totals.revenue)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">A receber</p>
            <p className="text-amber-400 text-lg font-bold break-all">{fmt(totals.pending)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Chamados</p>
            <p className="text-white text-lg font-bold">{totals.calls}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Em aberto</p>
            <p className="text-amber-400 text-lg font-bold">{totals.open}</p>
          </div>
        </div>
      </div>

      {/* Tenant cards */}
      <div className="flex flex-col gap-4">
        {data.map(item => (
          <TenantCard
            key={item.tenant.id}
            item={item}
            onSwitch={() => handleSwitch(item.tenant.slug)}
          />
        ))}
      </div>
    </div>
  )
}
