'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, MapPin, Phone, Mail, FileText, User, Clock, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { getClient } from '@/lib/db/clients'

const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const statusConfig: Record<string, { label: string; color: string }> = {
  agendado: { label: 'Agendado', color: 'bg-blue-100 text-blue-700' },
  aprovado: { label: 'Aprovado', color: 'bg-emerald-100 text-emerald-700' },
  nao_quis_visita: { label: 'Não quis visita', color: 'bg-slate-100 text-slate-600' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-600' },
}

export default function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getClient(id).then(setClient).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-48" />
        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-slate-100 rounded" />)}
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-slate-500">Cliente não encontrado.</p>
        <Link href="/dashboard/clientes" className="text-blue-600 text-sm mt-2 inline-block hover:underline">← Voltar</Link>
      </div>
    )
  }

  const calls = client.calls ?? []
  const totalRevenue = calls.reduce((s: number, c: any) =>
    s + (c.service_orders ?? []).reduce((ss: number, o: any) => ss + Number(o.total_value || 0), 0), 0)
  const approvedCalls = calls.filter((c: any) => c.status === 'aprovado')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/clientes" className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">{client.name}</h1>
            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{client.code}</span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">Cliente desde {new Date(client.created_at).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Chamados</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{calls.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Serviços</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{approvedCalls.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Receita Total</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{fmt(totalRevenue)}</p>
        </div>
      </div>

      {/* Dados do cliente */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Dados Cadastrais
          </h2>
          <Link href={`/dashboard/clientes/${id}/editar`}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            Editar
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {client.cpf_cnpj && <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">CPF / CNPJ</p>
            <p className="text-slate-700 mt-0.5">{client.cpf_cnpj}</p>
          </div>}
          {client.phone && <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide font-medium flex items-center gap-1">
              <Phone className="w-3 h-3" /> Telefone
            </p>
            <p className="text-slate-700 mt-0.5">{client.phone}</p>
          </div>}
          {client.email && <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide font-medium flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </p>
            <p className="text-slate-700 mt-0.5">{client.email}</p>
          </div>}
          {client.address && <div className="sm:col-span-2">
            <p className="text-slate-400 text-xs uppercase tracking-wide font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Endereço
            </p>
            <p className="text-slate-700 mt-0.5">
              {client.address}{client.neighborhood ? `, ${client.neighborhood}` : ''} — {client.city}{client.state ? `/${client.state}` : ''} {client.cep ? `· CEP ${client.cep}` : ''}
            </p>
          </div>}
        </div>
      </div>

      {/* Histórico de chamados */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
          <FileText className="w-4 h-4 text-blue-600" />
          <h2 className="font-semibold text-slate-800">Histórico de Chamados</h2>
        </div>

        {calls.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">Nenhum chamado registrado</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {calls.map((c: any) => {
              const so = c.service_orders?.[0]
              const cfg = statusConfig[c.status]
              return (
                <div key={c.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg?.color}`}>{cfg?.label}</span>
                        {so?.os_number && <span className="text-xs font-mono text-slate-400">{so.os_number}</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(c.date).toLocaleDateString('pt-BR')}
                        {c.notes ? ` · ${c.notes}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {so && (
                      <span className="text-sm font-semibold text-slate-700">{fmt(so.total_value)}</span>
                    )}
                    <Link href={`/dashboard/chamados/${c.id}`}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                      Ver →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
