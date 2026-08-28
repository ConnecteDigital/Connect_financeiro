'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Eye, MapPin, Phone } from 'lucide-react'
import Link from 'next/link'
import { getClients } from '@/lib/db/clients'

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await getClients(search || undefined)
        setClients(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Banco de dados de clientes e histórico de serviços</p>
        </div>
        <Link href="/dashboard/clientes/novo"
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition btn-primary">
          <Plus className="w-4 h-4" />
          Novo Cliente
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar por nome ou cidade..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">Nenhum cliente cadastrado ainda.</p>
          <Link href="/dashboard/clientes/novo" className="text-[color:var(--primary)] text-sm font-medium mt-2 inline-block hover:underline">
            Cadastrar primeiro cliente →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs font-mono text-slate-400">{c.code}</span>
                  <h3 className="font-semibold text-slate-800 mt-0.5">{c.name}</h3>
                </div>
                <Link href={`/dashboard/clientes/${c.id}`}
                  className="flex items-center gap-1 text-xs text-[color:var(--primary)] hover:text-[color:var(--primary)] font-medium">
                  <Eye className="w-3.5 h-3.5" />
                  Ver
                </Link>
              </div>
              <div className="space-y-1.5 text-sm text-slate-500">
                {c.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{c.city}{c.state ? ` - ${c.state}` : ''}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{c.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

