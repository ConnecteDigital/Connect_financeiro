'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Loader2, ArrowLeft } from 'lucide-react'
import { searchApprovedCalls, createCall } from '@/lib/db/calls'
import { createServiceOrder, syncOsAutoExpenses } from '@/lib/db/service-orders'
import { getAuxiliaries } from '@/lib/db/auxiliaries'
import { getStockItems, addServiceOrderParts, adjustStockQuantity } from '@/lib/db/stock'
import { formatAddress } from '@/lib/address'
import StockPartPicker from '@/components/StockPartPicker'

interface PartLine { stock_item_id: string; item_name: string; quantity: number; unit_value: number; total_value: number }

function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white'

// Retorno (garantia) da Rodrigues: escolhe um chamado aprovado e registra
// a volta do técnico. Não cobra serviço; só a peça, se o cliente pagar.
export default function RetornoModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [original, setOriginal] = useState<any>(null)

  const [auxiliaries, setAuxiliaries] = useState<any[]>([])
  const [stockItems, setStockItems] = useState<any[]>([])
  const [tecnicoId, setTecnicoId] = useState('')
  const [date, setDate] = useState(localToday)
  const [lines, setLines] = useState<PartLine[]>([])
  const [description, setDescription] = useState('')
  const [partsPaid, setPartsPaid] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getAuxiliaries(), getStockItems()])
      .then(([aux, stock]) => { setAuxiliaries(aux); setStockItems(stock) })
      .catch(console.error)
  }, [])

  useEffect(() => {
    const term = search.trim()
    if (term.length < 2) { setResults([]); return }
    const t = setTimeout(() => {
      setSearching(true)
      searchApprovedCalls(term)
        .then(setResults)
        .catch(console.error)
        .finally(() => setSearching(false))
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  function pick(c: any) {
    setOriginal(c)
    setTecnicoId(c.technician_id ?? c.service_orders?.[0]?.auxiliary_id ?? '')
    setLines([])
  }

  const tecnicos = auxiliaries.filter(a => a.type === 'tecnico')
  const availableStock = stockItems.filter(i => (i.auxiliary_id ?? null) === (tecnicoId || null))
  const partsTotal = lines.reduce((s, l) => s + l.total_value, 0)

  async function save() {
    if (!original) return
    setSaving(true)
    setError('')
    try {
      const tecnico = tecnicos.find(a => a.id === tecnicoId)
      const paid = lines.length > 0 ? partsPaid : null
      const call = await createCall({
        date,
        scheduled_date: date,
        status: 'retorno',
        return_of_call_id: original.id,
        return_parts_paid: paid,
        client_id: original.client_id ?? null,
        contact_name: original.contact_name ?? original.client?.name ?? null,
        contact_phone: original.contact_phone ?? original.client?.phone ?? null,
        origin: original.origin,
        service_category: original.service_category ?? null,
        call_address: original.call_address ?? null,
        call_city: original.call_city ?? null,
        call_neighborhood: original.call_neighborhood ?? null,
        address_number: original.address_number ?? null,
        address_complement: original.address_complement ?? null,
        address_reference: original.address_reference ?? null,
        appliance_type: original.appliance_type ?? null,
        device_brand: original.device_brand ?? null,
        technician_id: tecnicoId || null,
        driver: tecnico?.name ?? null,
        notes: description || null,
      })

      const total = paid ? partsTotal : 0
      const order = await createServiceOrder({
        call_id: call.id,
        date,
        client_id: original.client_id ?? null,
        auxiliary_id: tecnicoId || null,
        auxiliary_value: 0,
        service_type: 'proprio',
        subtotal: total,
        discount: 0,
        taxes: 0,
        total_value: total,
        parts_cost: partsTotal,
        payment_status: total === 0 || paid ? 'pago' : 'pendente',
        observations: description || null,
      }, [])

      if (lines.length > 0) {
        await addServiceOrderParts(order.id, lines)
        await Promise.all(lines.map(l => adjustStockQuantity(l.stock_item_id, -l.quantity)))
      }
      await syncOsAutoExpenses(order.id)
      router.push(`/dashboard/chamados/${call.id}`)
    } catch (err) {
      console.error(err)
      setError('Erro ao salvar o retorno. Tente novamente.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            {original && (
              <button type="button" onClick={() => setOriginal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-bold text-slate-900">Retorno</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!original ? (
          <div className="p-5 space-y-3">
            <p className="text-sm text-slate-500">Busque o chamado aprovado que o cliente está chamando de volta.</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" autoFocus value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Nome, telefone ou endereço..."
                className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              {searching && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-orange-400" />}
            </div>
            <div className="divide-y divide-slate-50">
              {search.trim().length >= 2 && !searching && results.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">Nenhum chamado aprovado encontrado</p>
              )}
              {results.map(c => (
                <button key={c.id} type="button" onClick={() => pick(c)}
                  className="w-full text-left py-3 hover:bg-slate-50 transition px-1 rounded-lg">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 truncate">{c.client?.name ?? c.contact_name ?? 'Sem identificação'}</p>
                    <span className="text-xs text-slate-400 flex-shrink-0">{new Date(c.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {[formatAddress({ address: c.call_address, number: c.address_number, neighborhood: c.call_neighborhood }), c.service_category].filter(Boolean).join(' · ')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-orange-50 border border-orange-100 px-3 py-2.5">
              <p className="text-sm font-semibold text-slate-800">{original.client?.name ?? original.contact_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {[original.service_category, `atendido em ${new Date(original.date + 'T12:00:00').toLocaleDateString('pt-BR')}`].filter(Boolean).join(' · ')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Técnico</label>
                <select value={tecnicoId} onChange={e => { setTecnicoId(e.target.value); setLines([]) }} className={inputCls}>
                  <option value="">Selecione...</option>
                  {tecnicos.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Data</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="border border-orange-100 bg-orange-50/40 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-orange-600">Peças usadas</p>
              {lines.map((l, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white border border-orange-100 rounded-lg px-2.5 py-1.5 text-xs">
                  <span className="text-slate-700">{l.quantity}x {l.item_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">R$ {l.total_value.toFixed(2)}</span>
                    <button type="button" onClick={() => setLines(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {availableStock.length > 0 ? (
                <StockPartPicker items={availableStock} onAdd={(item, quantity) => setLines(prev => [...prev, {
                  stock_item_id: item.id, item_name: item.name, quantity,
                  unit_value: Number(item.unit_value), total_value: quantity * Number(item.unit_value),
                }])} />
              ) : (
                <p className="text-xs text-slate-400">{tecnicoId ? 'Esse técnico não tem peças no estoque.' : 'A loja não tem peças no estoque.'}</p>
              )}
            </div>

            {lines.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">O cliente pagou a peça? <span className="text-slate-400 font-normal">(R$ {partsTotal.toFixed(2)})</span></label>
                <div className="flex gap-2">
                  {[{ v: true, l: 'Sim' }, { v: false, l: 'Não' }].map(opt => (
                    <button key={opt.l} type="button" onClick={() => setPartsPaid(opt.v)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${partsPaid === opt.v ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Descrição</label>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="O que o cliente reclamou e o que foi feito..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button type="button" onClick={save} disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60 transition flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar retorno
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
