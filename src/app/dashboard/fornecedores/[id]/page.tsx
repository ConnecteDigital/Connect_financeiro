'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Edit, Building2, Phone, Mail, User, Tag, FileText } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { getSupplier } from '@/lib/db/suppliers'

export default function FornecedorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [supplier, setSupplier] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSupplier(id).then(setSupplier).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="max-w-xl mx-auto p-6 animate-pulse space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded" />)}
    </div>
  )

  if (!supplier) return (
    <div className="max-w-xl mx-auto p-6 text-center text-slate-400">
      <p>Fornecedor não encontrado.</p>
      <Link href="/dashboard/fornecedores" className="text-[color:var(--primary)] text-sm font-medium mt-2 inline-block">
        Voltar para fornecedores
      </Link>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/fornecedores" className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{supplier.name}</h1>
            {supplier.category && <p className="text-slate-500 text-sm">{supplier.category}</p>}
          </div>
        </div>
        <Link href={`/dashboard/fornecedores/${id}/editar`}
          className="flex items-center gap-2 btn-primary text-sm px-4 py-2.5 rounded-lg">
          <Edit className="w-4 h-4" />
          Editar
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-50">
        <div className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-[color:var(--primary)]" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Nome / Razão Social</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{supplier.name}</p>
          </div>
        </div>

        {supplier.category && (
          <div className="flex items-center gap-3 p-4">
            <Tag className="w-5 h-5 text-slate-400 flex-shrink-0 ml-2.5" />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Categoria</p>
              <p className="text-sm text-slate-700 mt-0.5">{supplier.category}</p>
            </div>
          </div>
        )}

        {supplier.contact && (
          <div className="flex items-center gap-3 p-4">
            <User className="w-5 h-5 text-slate-400 flex-shrink-0 ml-2.5" />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Contato / Responsável</p>
              <p className="text-sm text-slate-700 mt-0.5">{supplier.contact}</p>
            </div>
          </div>
        )}

        {supplier.phone && (
          <div className="flex items-center gap-3 p-4">
            <Phone className="w-5 h-5 text-slate-400 flex-shrink-0 ml-2.5" />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Telefone</p>
              <p className="text-sm text-slate-700 mt-0.5">{supplier.phone}</p>
            </div>
          </div>
        )}

        {supplier.email && (
          <div className="flex items-center gap-3 p-4">
            <Mail className="w-5 h-5 text-slate-400 flex-shrink-0 ml-2.5" />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Email</p>
              <a href={`mailto:${supplier.email}`} className="text-sm text-[color:var(--primary)] mt-0.5 hover:underline block">{supplier.email}</a>
            </div>
          </div>
        )}

        {supplier.notes && (
          <div className="flex items-start gap-3 p-4">
            <FileText className="w-5 h-5 text-slate-400 flex-shrink-0 ml-2.5 mt-0.5" />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Observações</p>
              <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{supplier.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
