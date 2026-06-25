'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, PhoneCall, TrendingUp, Clock, DollarSign,
  CheckCircle, XCircle, RefreshCw, BarChart3, AlertCircle,
} from 'lucide-react'

interface TenantDetail {
  tenant: {
    id: string
    slug: string
    name: string
    logo_url: string | null
    primary_color: string
  }
  stats: {
    total_calls: number
    approved_calls: number
    open_calls: number
    cancelled_calls: number
    gross_revenue: number
    pending_receivables: number
    total_expenses: number
    net_revenue: number
  }
  recent_calls: {
    id: string
    call_number: number | null
    contact_name: string | null
    service_category: string | null
    status: string
    date: string
    scheduled_date: string | null
    scheduled_time: string | null
    call_address: string | null
  }[]
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  aberto:         { label: 'Aberto',        color: '#2563eb', bg: '#eff6ff' },
  agendado:       { label: 'Agendado',      color: '#7c3aed', bg: '#f5f3ff' },
  aprovado:       { label: 'Aprovado',      color: '#16a34a', bg: '#f0fdf4' },
  cancelado:      { label: 'Cancelado',     color: '#dc2626', bg: '#fef2f2' },
  nao_aprovou:    { label: 'Não aprovou',   color: '#d97706', bg: '#fffbeb' },
  nao_quis_visita:{ label: 'Sem visita',    color: '#64748b', bg: '#f8fafc' },
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-slate-400">{icon}</div>
        <span className="text-xs text-slate-500 font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold break-all" style={{ color: color || '#0f172a' }}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function TenantViewContent({ slug }: { slug: string }) {
  const router = useRouter()
  const [data, setData] = useState<TenantDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/master/tenant/${slug}`)
      if (res.status === 403) { router.replace('/dashboard'); return }
      if (res.status === 404) { setError('Cliente não encontrado'); return }
      if (!res.ok) throw new Error('Erro ao carregar')
      setData(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [slug])

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-slate-500">
      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Carregando...
    </div>
  )

  if (error || !data) return (
    <div className="flex items-center justify-center h-screen text-red-500 gap-2">
      <AlertCircle className="w-5 h-5" /> {error || 'Erro desconhecido'}
    </div>
  )

  const { tenant, stats, recent_calls } = data
  const color = tenant.primary_color || '#f97316'
  const convRate = stats.total_calls > 0
    ? Math.round((stats.approved_calls / stats.total_calls) * 100)
    : 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Back */}
      <Link href="/dashboard/master" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Painel Master
      </Link>

      {/* Tenant header */}
      <div className="rounded-2xl overflow-hidden mb-5 shadow-sm">
        <div className="px-5 py-4 flex items-center gap-3" style={{ background: color }}>
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {tenant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logo_url} alt={tenant.name} className="w-10 h-10 object-contain" />
            ) : (
              <span className="text-white font-bold text-xl">{tenant.name[0]}</span>
            )}
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">{tenant.name}</p>
            <p className="text-white/70 text-sm">{tenant.slug}</p>
          </div>
        </div>

        {/* Revenue summary */}
        <div className="bg-slate-50 px-5 py-3 flex items-center justify-between border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Faturamento este mês</p>
            <p className="text-lg font-bold" style={{ color }}>{fmt(stats.gross_revenue)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Conversão</p>
            <p className="text-lg font-bold text-slate-800">{convRate}%</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard icon={<PhoneCall className="w-4 h-4" />} label="Chamados" value={stats.total_calls} sub="este mês" />
        <StatCard icon={<CheckCircle className="w-4 h-4" />} label="Aprovados" value={stats.approved_calls} sub={`${convRate}% do total`} color="#16a34a" />
        <StatCard icon={<Clock className="w-4 h-4" />} label="Em aberto" value={stats.open_calls} sub="aguardando" color="#d97706" />
        <StatCard icon={<XCircle className="w-4 h-4" />} label="Cancelados" value={stats.cancelled_calls} color="#dc2626" />
        <StatCard icon={<DollarSign className="w-4 h-4" />} label="A receber" value={fmt(stats.pending_receivables)} color="#d97706" />
        <StatCard icon={<BarChart3 className="w-4 h-4" />} label="Receita líquida" value={fmt(stats.net_revenue)} color={stats.net_revenue >= 0 ? '#16a34a' : '#dc2626'} />
      </div>

      {/* Recent calls */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-700">Últimos chamados</h2>
        </div>
        {recent_calls.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">Nenhum chamado</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent_calls.map(call => {
              const st = STATUS_LABELS[call.status] ?? { label: call.status, color: '#64748b', bg: '#f8fafc' }
              const dateStr = (call.scheduled_date || call.date)
                ? new Date((call.scheduled_date || call.date) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                : ''
              return (
                <li key={call.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="text-xs font-bold text-slate-300 w-8 pt-0.5 shrink-0">
                    #{call.call_number ?? '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {call.contact_name || 'Cliente'}
                    </p>
                    {call.service_category && (
                      <p className="text-xs text-slate-500 truncate">{call.service_category}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: st.color, background: st.bg }}>
                      {st.label}
                    </span>
                    {dateStr && <span className="text-xs text-slate-400">{dateStr}</span>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function TenantViewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  return <TenantViewContent slug={slug} />
}
