'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant-context'
import { Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Item {
  description: string
  quantity: number
  unit_price: number
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export default function EditarOrcamentoPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const { tenant } = useTenant()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Client fields
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientCpf, setClientCpf] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [clientCity, setClientCity] = useState('')
  const [origin, setOrigin] = useState('')
  const [validUntil, setValidUntil] = useState('')

  // Service fields
  const [items, setItems] = useState<Item[]>([{ description: '', quantity: 1, unit_price: 0 }])
  const [discount, setDiscount] = useState('')
  const [taxes, setTaxes] = useState('')
  const [notes, setNotes] = useState('')

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0)
  const total = subtotal - Number(discount || 0) + Number(taxes || 0)

  useEffect(() => {
    if (!id) return
    const supabase = createClient()
    async function load() {
      const { data } = await supabase.from('quotes').select('*').eq('id', id).single()
      if (data) {
        setClientName(data.client_name ?? '')
        setClientPhone(data.client_phone ?? '')
        setClientCpf(data.client_cpf ?? '')
        setClientAddress(data.client_address ?? '')
        setClientCity(data.client_city ?? '')
        setOrigin(data.origin ?? '')
        setValidUntil(data.valid_until ?? '')
        setItems(data.items && data.items.length > 0 ? data.items : [{ description: '', quantity: 1, unit_price: 0 }])
        setDiscount(data.discount != null ? String(data.discount) : '')
        setTaxes(data.taxes != null ? String(data.taxes) : '')
        setNotes(data.notes ?? '')
      }
      setLoading(false)
    }
    load()
  }, [id])

  function addItem() {
    setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0 }])
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof Item, value: string | number) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  async function handleSave() {
    if (!clientName.trim()) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('quotes').update({
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || null,
        client_cpf: clientCpf.trim() || null,
        client_address: clientAddress.trim() || null,
        client_city: clientCity.trim() || null,
        origin: origin || null,
        valid_until: validUntil || null,
        items: items.filter(it => it.description.trim()),
        subtotal,
        discount: Number(discount || 0),
        taxes: Number(taxes || 0),
        total,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', id)

      if (error) {
        console.error(error)
        alert('Erro ao salvar orçamento: ' + error.message)
        return
      }
      router.push(`/dashboard/orcamentos/${id}`)
    } finally {
      setSaving(false)
    }
  }

  const origins = tenant?.call_origins ?? []

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/orcamentos/${id}`} className="w-9 h-9 rounded-xl flex items-center justify-center transition"
          style={{ background: 'var(--surface-secondary)' }}>
          <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Editar Orçamento</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Atualize os dados do cliente e dos serviços</p>
        </div>
      </div>

      {/* Section 1: Client */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Dados do Cliente</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome *</label>
            <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
              className="input-field py-2.5 text-sm" placeholder="Nome completo do cliente" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Telefone</label>
            <input type="text" value={clientPhone} onChange={e => setClientPhone(e.target.value)}
              className="input-field py-2.5 text-sm" placeholder="(51) 9 9999-9999" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>CPF / CNPJ</label>
            <input type="text" value={clientCpf} onChange={e => setClientCpf(e.target.value)}
              className="input-field py-2.5 text-sm" placeholder="000.000.000-00" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Endereço</label>
            <input type="text" value={clientAddress} onChange={e => setClientAddress(e.target.value)}
              className="input-field py-2.5 text-sm" placeholder="Rua, número, complemento" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Cidade</label>
            <input type="text" value={clientCity} onChange={e => setClientCity(e.target.value)}
              className="input-field py-2.5 text-sm" placeholder="Porto Alegre" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Origem</label>
            <select value={origin} onChange={e => setOrigin(e.target.value)} className="input-field py-2.5 text-sm">
              <option value="">Selecionar...</option>
              {origins.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Válido até</label>
            <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
              className="input-field py-2.5 text-sm" />
          </div>
        </div>
      </div>

      {/* Section 2: Services */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Serviços / Itens</h2>
          <button onClick={addItem} className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl transition"
            style={{ background: 'rgba(var(--primary-rgb),0.1)', color: 'var(--primary)' }}>
            <Plus className="w-4 h-4" /> Adicionar item
          </button>
        </div>

        <div className="space-y-3">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium px-1" style={{ color: 'var(--text-tertiary)' }}>
            <span className="col-span-6">Descrição</span>
            <span className="col-span-2 text-center">Qtd</span>
            <span className="col-span-2 text-right">Val. Unit.</span>
            <span className="col-span-2 text-right">Subtotal</span>
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12 sm:col-span-6">
                <input type="text" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                  className="input-field py-2 text-sm" placeholder="Descrição do serviço..." />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <input type="number" min="1" step="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                  className="input-field py-2 text-sm text-center" />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <input type="number" min="0" step="0.01" value={item.unit_price || ''} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                  className="input-field py-2 text-sm text-right" placeholder="0,00" />
              </div>
              <div className="col-span-4 sm:col-span-1 text-right">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {fmt(item.quantity * item.unit_price)}
                </span>
              </div>
              <div className="col-span-1">
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="w-8 h-8 rounded-lg flex items-center justify-center transition text-red-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>Desconto (R$)</label>
            <input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)}
              className="input-field py-2 text-sm text-right w-32" placeholder="0,00" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>Impostos (R$)</label>
            <input type="number" min="0" step="0.01" value={taxes} onChange={e => setTaxes(e.target.value)}
              className="input-field py-2 text-sm text-right w-32" placeholder="0,00" />
          </div>
          <div className="flex items-center justify-between py-3 px-4 rounded-2xl"
            style={{ background: 'rgba(var(--primary-rgb),0.08)' }}>
            <span className="text-base font-bold" style={{ color: 'var(--primary)' }}>Total</span>
            <span className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>{fmt(total)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Observações</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            className="input-field py-2.5 text-sm resize-none" placeholder="Condições, prazo de execução, garantias..." />
        </div>
      </div>

      <div className="flex gap-3 justify-end pb-6">
        <Link href={`/dashboard/orcamentos/${id}`} className="px-5 py-2.5 rounded-xl text-sm font-medium transition"
          style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
          Cancelar
        </Link>
        <button onClick={handleSave} disabled={saving || !clientName.trim()}
          className="btn-primary text-sm px-6 py-2.5 flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Salvar Alterações
        </button>
      </div>
    </div>
  )
}
