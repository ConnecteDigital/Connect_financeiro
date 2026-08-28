'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { FileText, Plus, Loader2 } from 'lucide-react'
import { useTenant } from '@/lib/tenant-context'

interface Quote {
  id: string
  quote_number: string | null
  client_name: string
  total: number
  status: string
  created_at: string
  valid_until: string | null
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    pendente: { label: 'Pendente', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    aprovado: { label: 'Aprovado', bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
    recusado: { label: 'Recusado', bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
    expirado: { label: 'Expirado', bg: 'rgba(113,113,122,0.12)', color: '#71717a' },
  }
  const s = map[status] ?? map.pendente
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
  )
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export default function OrcamentosPage() {
  const { tenant } = useTenant()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todos')

  useEffect(() => {
    if (!tenant?.id) return
    const supabase = createClient()
    supabase.from('quotes').select('id, quote_number, client_name, total, status, created_at, valid_until')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setQuotes(data)
        setLoading(false)
      })
  }, [tenant?.id])

  const filtered = quotes.filter(q => filter === 'todos' || q.status === filter)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(var(--primary-rgb),0.1)' }}>
            <FileText className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Orçamentos</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Gerencie propostas e orçamentos para clientes</p>
          </div>
        </div>
        <Link href="/dashboard/orcamentos/novo" className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Orçamento</span>
          <span className="sm:hidden">Novo</span>
        </Link>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {['todos', 'pendente', 'aprovado', 'recusado'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition"
            style={filter === f
              ? { background: 'var(--primary)', color: '#fff' }
              : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
            {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum orçamento encontrado</p>
              <Link href="/dashboard/orcamentos/novo" className="mt-3 inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--primary)' }}>
                <Plus className="w-4 h-4" /> Criar primeiro orçamento
              </Link>
            </div>
          )}
          {filtered.map(q => (
            <Link key={q.id} href={`/dashboard/orcamentos/${q.id}`}
              className="block rounded-2xl p-4 transition hover:scale-[1.005]"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--primary)' }}>
                      {q.quote_number ?? 'Rascunho'}
                    </span>
                    <StatusBadge status={q.status} />
                  </div>
                  <p className="text-sm font-semibold mt-1 truncate" style={{ color: 'var(--text-primary)' }}>{q.client_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(q.created_at).toLocaleDateString('pt-BR')}
                    {q.valid_until && <span className="ml-2">· Válido até {new Date(q.valid_until + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                  </p>
                </div>
                <p className="text-base font-bold flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{fmt(Number(q.total))}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
