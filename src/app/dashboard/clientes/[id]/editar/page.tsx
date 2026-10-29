'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { getClient, updateClient } from '@/lib/db/clients'
import { lookupCep } from '@/lib/cep'
import { useTenant } from '@/lib/tenant-context'

export default function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { tenant } = useTenant()
  const isRodrigues = tenant?.call_form_config?.rodrigues_custom === true
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState(false)
  const [form, setForm] = useState({
    name: '', cpf_cnpj: '', inscr_est: '', address: '',
    neighborhood: '', city: '', state: '', cep: '', phone: '', email: '',
  })

  useEffect(() => {
    getClient(id).then(client => {
      setForm({
        name: client.name ?? '',
        cpf_cnpj: client.cpf_cnpj ?? '',
        inscr_est: client.inscr_est ?? '',
        address: client.address ?? '',
        neighborhood: client.neighborhood ?? '',
        city: client.city ?? '',
        state: client.state ?? '',
        cep: client.cep ?? '',
        phone: client.phone ?? '',
        email: client.email ?? '',
      })
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  async function handleCepChange(value: string) {
    set('cep', value)
    setCepError(false)
    const digits = value.replace(/\D/g, '')
    if (!isRodrigues || digits.length !== 8) return
    setCepLoading(true)
    try {
      const result = await lookupCep(digits)
      if (result) {
        setForm(f => ({ ...f, address: result.address, neighborhood: result.neighborhood, city: result.city, state: result.state }))
      } else {
        setCepError(true)
      }
    } catch {
      setCepError(true)
    } finally {
      setCepLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await updateClient(id, form)
      router.push(`/dashboard/clientes/${id}`)
    } catch {
      setError('Erro ao salvar cliente. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-48" />
        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/clientes/${id}`} className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Editar Cliente</h1>
          <p className="text-slate-500 text-sm">Atualize os dados cadastrais do cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome completo / Razão Social *</label>
            <input type="text" required value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">CPF / CNPJ</label>
            <input type="text" value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Inscrição Estadual</label>
            <input type="text" value={form.inscr_est} onChange={e => set('inscr_est', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          {isRodrigues && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">CEP</label>
              <div className="relative">
                <input type="text" value={form.cep} onChange={e => handleCepChange(e.target.value)}
                  placeholder="00000-000" maxLength={9}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                {cepLoading && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-orange-400" />}
              </div>
              {cepError && <p className="text-xs text-red-500 mt-1">CEP não encontrado — preencha o endereço manualmente.</p>}
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Endereço</label>
            <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
              placeholder={isRodrigues ? 'Rua, número...' : undefined}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bairro</label>
            <input type="text" value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          {!isRodrigues && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">CEP</label>
              <input type="text" value={form.cep} onChange={e => set('cep', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Cidade</label>
            <input type="text" value={form.city} onChange={e => set('city', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Estado</label>
            <input type="text" maxLength={2} placeholder="RS" value={form.state} onChange={e => set('state', e.target.value.toUpperCase())}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefone</label>
            <input type="text" value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">{error}</div>}

        <div className="flex gap-3 justify-end pt-2">
          <Link href={`/dashboard/clientes/${id}`}
            className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
            Cancelar
          </Link>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
