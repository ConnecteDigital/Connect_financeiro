'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { getCall } from '@/lib/db/calls'
import { createServiceOrder, createServiceOrderAuxiliaries } from '@/lib/db/service-orders'
import { getTeams } from '@/lib/db/teams'
import { getAuxiliaries, createAuxiliary } from '@/lib/db/auxiliaries'
import { getServiceTypes } from '@/lib/db/service-types'
import { SERVICE_CONFIG, getServiceConfig } from '@/lib/service-config'
import { useTenant } from '@/lib/tenant-context'

type ServiceType = 'proprio' | 'terceirizado_saida' | 'terceirizado_entrada'
type PaymentStatus = 'pago' | 'pago_parcial' | 'pendente'

interface ServiceLine {
  category: string
  sub: string | null
  quantity: number
  unitPrice: number
  notes: string
}

const PAYMENT_METHODS = ['Dinheiro', 'Cartão', 'PIX', 'Boleto']
const AUX_TYPE_LABEL: Record<string, string> = { dono: 'Dono', tecnico: 'Técnico', auxiliar: 'Auxiliar' }

interface SelectedAuxiliary {
  auxiliary_id: string
  name: string
  type: string
  percentage: number
}

export default function NovaOSPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { tenant } = useTenant()
  const isMillenium = tenant?.call_form_config?.millenium_custom_os === true
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [teams, setTeams] = useState<any[]>([])
  const [auxiliaries, setAuxiliaries] = useState<any[]>([])
  const [categoryNames, setCategoryNames] = useState<string[]>([])

  // Call info (display only)
  const [callDate, setCallDate] = useState('')
  const [contactName, setContactName] = useState('')
  const [clientId, setClientId] = useState<string | null>(null)

  // Services
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([])

  // OS fields (no status, no material/fuel/other/levantamento)
  const [serviceType, setServiceType] = useState<ServiceType>('proprio')
  const [partnerPct, setPartnerPct] = useState(50)
  const [auxiliaryId, setAuxiliaryId] = useState('')
  const [selectedAuxiliaries, setSelectedAuxiliaries] = useState<SelectedAuxiliary[]>([])
  const [freeAuxName, setFreeAuxName] = useState('')
  const [freeAuxPct, setFreeAuxPct] = useState('')
  const [addingFreeAux, setAddingFreeAux] = useState(false)
  const [teamId, setTeamId] = useState('')
  const [teamName, setTeamName] = useState('')
  const [driver, setDriver] = useState('')
  const [nfNumber, setNfNumber] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentMethodsMulti, setPaymentMethodsMulti] = useState<string[]>([])
  const [cardType, setCardType] = useState('')
  const [cardFeePct, setCardFeePct] = useState(0)
  const [partnerName, setPartnerName] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pendente')
  const [amountPaid, setAmountPaid] = useState(0)
  const [remainingAmount, setRemainingAmount] = useState(0)
  const [remainingDueDate, setRemainingDueDate] = useState('')
  const [discount, setDiscount] = useState(0)
  const [taxes, setTaxes] = useState(0)
  const [equipmentRentalValue, setEquipmentRentalValue] = useState(0)

  useEffect(() => {
    Promise.all([getCall(id), getTeams(), getAuxiliaries(), getServiceTypes()])
      .then(([call, tms, auxs, sts]) => {
        setTeams(tms)
        setAuxiliaries(auxs)
        setCategoryNames(sts.map((s: any) => s.name))
        setCallDate(call.date)
        setContactName(call.contact_name ?? '')
        setClientId(call.client_id ?? null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const lineTotal = (l: ServiceLine) => l.quantity * l.unitPrice
  const subtotal = serviceLines.reduce((sum, l) => sum + lineTotal(l), 0)
  const bruto = subtotal + equipmentRentalValue - discount + taxes
  const isOutsourced = serviceType !== 'proprio'
  const liquidoParceria = isOutsourced ? bruto * partnerPct / 100 : bruto
  const selectedAux = auxiliaries.find(a => a.id === auxiliaryId)
  const auxValue = selectedAux ? bruto * Number(selectedAux.percentage) / 100 : 0
  const totalAuxValue = selectedAuxiliaries.reduce((s, a) => s + bruto * a.percentage / 100, 0)
  const liquidoFinal = isMillenium ? liquidoParceria - totalAuxValue : liquidoParceria - auxValue

  async function addFreeTextAuxiliary() {
    const name = freeAuxName.trim()
    const pct = Number(freeAuxPct) || 0
    if (!name) return
    setAddingFreeAux(true)
    try {
      const existing = auxiliaries.find(a => a.name.trim().toLowerCase() === name.toLowerCase())
      if (existing) {
        setSelectedAuxiliaries(prev => {
          const already = prev.some(s => s.auxiliary_id === existing.id)
          if (already) {
            return prev.map(s => s.auxiliary_id === existing.id ? { ...s, percentage: pct } : s)
          }
          return [...prev, { auxiliary_id: existing.id, name: existing.name, type: existing.type ?? 'tecnico', percentage: pct }]
        })
      } else {
        const created = await createAuxiliary(name, pct, 'tecnico')
        setAuxiliaries(prev => [...prev, created])
        setSelectedAuxiliaries(prev => [...prev, { auxiliary_id: created.id, name: created.name, type: created.type ?? 'tecnico', percentage: pct }])
      }
      setFreeAuxName('')
      setFreeAuxPct('')
    } finally {
      setAddingFreeAux(false)
    }
  }

  function removeAuxiliary(auxId: string) {
    setSelectedAuxiliaries(prev => prev.filter(a => a.auxiliary_id !== auxId))
  }

  function updateAuxPercentage(auxId: string, pct: number) {
    setSelectedAuxiliaries(prev => prev.map(a => a.auxiliary_id === auxId ? { ...a, percentage: pct } : a))
  }

  function toggleCategory(name: string) {
    const cfg = getServiceConfig(name, isMillenium)
    if (selectedCategories.includes(name)) {
      setSelectedCategories(prev => prev.filter(c => c !== name))
      setServiceLines(prev => prev.filter(l => l.category !== name))
    } else {
      setSelectedCategories(prev => [...prev, name])
      if (!cfg?.subOptions) {
        setServiceLines(prev => [...prev, { category: name, sub: null, quantity: 0, unitPrice: 0, notes: '' }])
      }
    }
  }

  function toggleSub(category: string, sub: string) {
    setServiceLines(prev => {
      const exists = prev.some(l => l.category === category && l.sub === sub)
      return exists
        ? prev.filter(l => !(l.category === category && l.sub === sub))
        : [...prev, { category, sub, quantity: 0, unitPrice: 0, notes: '' }]
    })
  }

  const updateLine = (category: string, sub: string | null, patch: Partial<ServiceLine>) =>
    setServiceLines(prev => prev.map(l => l.category === category && l.sub === sub ? { ...l, ...patch } : l))

  const serviceCategoryText = selectedCategories.map(cat => {
    const subs = serviceLines.filter(l => l.category === cat && l.sub).map(l => l.sub)
    return subs.length ? `${cat} (${subs.join(', ')})` : cat
  }).join(', ')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const validItems = serviceLines.map(l => ({
        quantity: l.quantity || 1,
        description: l.category + (l.sub ? ` — ${l.sub}` : ''),
        unit_price: l.unitPrice,
        category: l.category,
        sub_options: l.sub,
        notes: l.notes || null,
      }))

      const primaryAuxId = isMillenium ? (selectedAuxiliaries[0]?.auxiliary_id ?? null) : (auxiliaryId || null)
      const primaryAuxValue = isMillenium
        ? (selectedAuxiliaries[0] ? bruto * selectedAuxiliaries[0].percentage / 100 : 0)
        : auxValue

      const order = await createServiceOrder({
        call_id: id,
        date: callDate,
        client_id: clientId,
        team_id: isMillenium ? null : (teamId || null),
        team_name: isMillenium ? (teamName || null) : null,
        auxiliary_id: primaryAuxId,
        auxiliary_value: primaryAuxValue,
        driver: driver || null,
        nf_number: nfNumber || null,
        vehicle: vehicle || null,
        due_date: dueDate || null,
        service_type: serviceType,
        has_floor_plan: false,
        has_no_floor_plan: false,
        has_no_knowledge: false,
        has_hydraulic_plan: false,
        has_no_hydraulic_plan: false,
        has_guarantee: false,
        has_guarantee_60: false,
        has_guarantee_90: false,
        has_no_guarantee: false,
        equipment_rental_value: equipmentRentalValue,
        subtotal,
        discount,
        taxes,
        total_value: bruto,
        outsource_profit_pct: partnerPct,
        own_material_cost: 0,
        own_fuel_cost: 0,
        own_other_cost: 0,
        other_service_value: 0,
        payment_method: isMillenium
          ? (paymentMethodsMulti.length > 0 ? paymentMethodsMulti.join(', ') : null)
          : (paymentMethod || null),
        card_type: isMillenium ? (cardType || null) : null,
        card_fee_pct: isMillenium ? cardFeePct : 0,
        partner_name: isMillenium ? (partnerName || null) : null,
        payment_status: paymentStatus,
        amount_paid: amountPaid,
        remaining_amount: remainingAmount,
        remaining_due_date: remainingDueDate || null,
        conditions: null,
        observations: null,
      }, validItems)

      if (isMillenium && selectedAuxiliaries.length > 0) {
        await createServiceOrderAuxiliaries(
          order.id,
          selectedAuxiliaries.map(a => ({
            auxiliary_id: a.auxiliary_id,
            percentage: a.percentage,
            amount: bruto * a.percentage / 100,
          }))
        )
      }

      router.push(`/dashboard/chamados/${id}`)
    } catch (err: any) {
      console.error(err)
      setError('Erro ao salvar OS. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400'

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/chamados/${id}`} className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nova Ordem de Serviço</h1>
          {contactName && <p className="text-slate-500 text-sm">{contactName} · {callDate}</p>}
        </div>
      </div>

      {/* Tipo(s) de serviço */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">Tipo(s) de Serviço</h2>
        <div className="flex flex-wrap gap-2 mb-2">
          {categoryNames.map(name => (
            <button key={name} type="button" onClick={() => toggleCategory(name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${selectedCategories.includes(name) ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-200 text-slate-600 hover:border-orange-300'}`}>
              {name}
            </button>
          ))}
        </div>

        {selectedCategories.map(cat => {
          const cfg = getServiceConfig(cat, isMillenium)
          const catLines = serviceLines.filter(l => l.category === cat)
          return (
            <div key={cat} className="border border-orange-100 bg-orange-50/40 rounded-lg p-3 mt-2 space-y-3">
              <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{cat}</p>
              {cfg?.subOptions && (
                <div className="flex flex-wrap gap-2">
                  {cfg.subOptions.map(sub => {
                    const active = catLines.some(l => l.sub === sub)
                    return (
                      <button key={sub} type="button" onClick={() => toggleSub(cat, sub)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${active ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300'}`}>
                        {sub}
                      </button>
                    )
                  })}
                </div>
              )}
              {catLines.map(l => (
                <div key={l.sub ?? cat} className="bg-white border border-slate-100 rounded-lg p-3 space-y-2">
                  {l.sub && <p className="text-xs font-bold text-orange-600 uppercase">{l.sub}</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{cfg?.qtyLabel ?? 'Quantidade'}</label>
                      <input type="number" min="0" step="0.01" value={l.quantity || ''}
                        onChange={e => updateLine(l.category, l.sub, { quantity: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{cfg?.priceLabel ?? 'Valor (R$)'}</label>
                      <input type="number" min="0" step="0.01" value={l.unitPrice || ''}
                        onChange={e => updateLine(l.category, l.sub, { unitPrice: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Valor total</label>
                      <p className="px-3 py-2 text-sm font-bold text-orange-600 bg-slate-50 border border-slate-100 rounded-lg">
                        R$ {lineTotal(l).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <input type="text" value={l.notes}
                    onChange={e => updateLine(l.category, l.sub, { notes: e.target.value })}
                    placeholder={isMillenium && (cat === 'Sucção' || cat === 'Hidrojateamento') ? 'O que foi feito (ex: caixa de passagem, coluna, tubular)...' : 'Descrição deste serviço...'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Dados da OS */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">Ordem de Serviço</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Equipe</label>
            {isMillenium ? (
              <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)}
                placeholder="Digite o nome da equipe..." className={inputCls} />
            ) : (
              <select value={teamId} onChange={e => setTeamId(e.target.value)} className={inputCls}>
                <option value="">Selecione...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </div>
          {!isMillenium && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Auxiliar</label>
              <select value={auxiliaryId} onChange={e => setAuxiliaryId(e.target.value)} className={inputCls}>
                <option value="">Sem auxiliar</option>
                {auxiliaries.map(a => <option key={a.id} value={a.id}>{a.name} ({Number(a.percentage)}%)</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Motorista</label>
            <input type="text" value={driver} onChange={e => setDriver(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nº da NF</label>
            <input type="text" value={nfNumber} onChange={e => setNfNumber(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Veículo</label>
            <input type="text" value={vehicle} onChange={e => setVehicle(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Vencimento</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
          </div>
        </div>

        {isMillenium && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">Auxiliares / Técnicos / Comissões</label>
            {selectedAuxiliaries.length > 0 && (
              <div className="space-y-2">
                {selectedAuxiliaries.map(a => {
                  const amount = bruto * a.percentage / 100
                  return (
                    <div key={a.auxiliary_id} className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">{a.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-600">
                            {AUX_TYPE_LABEL[a.type] ?? 'Técnico'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" max="100" step="0.1"
                          value={a.percentage}
                          onChange={e => updateAuxPercentage(a.auxiliary_id, Number(e.target.value))}
                          className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
                        <span className="text-xs text-slate-500">%</span>
                        <span className="text-sm font-semibold text-orange-600 w-24 text-right">R$ {amount.toFixed(2)}</span>
                        <button type="button" onClick={() => removeAuxiliary(a.auxiliary_id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="text" value={freeAuxName} onChange={e => setFreeAuxName(e.target.value)}
                placeholder="Nome do técnico/auxiliar..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              <input type="number" min="0" max="100" step="0.1" value={freeAuxPct}
                onChange={e => setFreeAuxPct(e.target.value)}
                placeholder="%"
                className="w-20 px-2 py-2 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400" />
              <button type="button" onClick={addFreeTextAuxiliary} disabled={!freeAuxName.trim() || addingFreeAux}
                className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition">
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>
            {selectedAuxiliaries.length === 0 && (
              <p className="text-xs text-slate-400">Nenhum auxiliar adicionado</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Forma de Pagamento</label>
          {isMillenium ? (
            <>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button key={m} type="button"
                    onClick={() => setPaymentMethodsMulti(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${paymentMethodsMulti.includes(m) ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {m}
                  </button>
                ))}
              </div>
              {paymentMethodsMulti.length > 1 && (
                <p className="text-xs mt-1.5 text-orange-600 font-medium">{paymentMethodsMulti.join(' + ')}</p>
              )}
              {paymentMethodsMulti.includes('Cartão') && (
                <div className="mt-3 p-3 rounded-lg border border-orange-100 bg-orange-50/50 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Cartão: débito ou crédito?</label>
                  <div className="flex gap-2">
                    {[{ v: 'debito', l: 'Débito' }, { v: 'credito', l: 'Crédito' }].map(opt => (
                      <button key={opt.v} type="button" onClick={() => setCardType(opt.v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${cardType === opt.v ? 'text-white border-transparent bg-orange-500' : 'bg-white text-slate-500 border-slate-200'}`}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                  {cardType === 'credito' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">% de desconto da maquininha</label>
                      <input type="number" min="0" max="100" step="0.01" value={cardFeePct || ''}
                        onChange={e => setCardFeePct(Number(e.target.value))}
                        className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(m => (
                <button key={m} type="button" onClick={() => setPaymentMethod(paymentMethod === m ? '' : m)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${paymentMethod === m ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tipo de execução */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">Tipo de Execução</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'proprio', label: 'Serviço Próprio' },
            { value: 'terceirizado_saida', label: 'Terceirizado (passamos)' },
            { value: 'terceirizado_entrada', label: 'Recebido de parceiro' },
          ].map(s => (
            <button key={s.value} type="button" onClick={() => setServiceType(s.value as ServiceType)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${serviceType === s.value ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {s.label}
            </button>
          ))}
        </div>
        {isMillenium && serviceType !== 'proprio' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {serviceType === 'terceirizado_entrada' ? 'Recebido de quem?' : 'Passado para quem?'}
            </label>
            <input type="text" value={partnerName} onChange={e => setPartnerName(e.target.value)}
              placeholder="Ex: Alan..." className={inputCls} />
          </div>
        )}
        {isOutsourced && (
          <div className="border border-orange-100 bg-orange-50/50 rounded-lg p-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Porcentagem do serviço (%)
              <span className="text-slate-400 font-normal ml-1">(normalmente 50%)</span>
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              <input type="number" min="0" max="100" step="0.5" value={partnerPct || ''} onChange={e => setPartnerPct(Number(e.target.value))}
                className="w-28 px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
              <p className="text-sm text-slate-600">
                Valor bruto <span className="font-semibold">R$ {bruto.toFixed(2)}</span>
                {' → '}líquido ({partnerPct}%): <span className="font-bold text-emerald-600">R$ {liquidoParceria.toFixed(2)}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Resumo de valores */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-2">
        <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3 mb-2">Resumo de Valores</h2>
        <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal (serviços)</span><span className="font-medium">R$ {subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between text-sm items-center">
          <span className="text-slate-600">Locação Equip. e M.O. (R$)</span>
          <input type="number" min="0" step="0.01" value={equipmentRentalValue || ''} onChange={e => setEquipmentRentalValue(Number(e.target.value))}
            className="w-24 px-2 py-1 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div className="flex justify-between text-sm items-center">
          <span className="text-slate-600">Descontos (R$)</span>
          <input type="number" min="0" step="0.01" value={discount || ''} onChange={e => setDiscount(Number(e.target.value))}
            className="w-24 px-2 py-1 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div className="flex justify-between text-sm items-center">
          <span className="text-slate-600">Impostos (R$)</span>
          <input type="number" min="0" step="0.01" value={taxes || ''} onChange={e => setTaxes(Number(e.target.value))}
            className="w-24 px-2 py-1 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div className="flex justify-between text-base font-bold border-t border-slate-100 pt-2">
          <span className="text-slate-800">Valor Total (bruto)</span>
          <span className="text-orange-500">R$ {bruto.toFixed(2)}</span>
        </div>
        {isOutsourced && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Líquido da parceria ({partnerPct}%)</span>
            <span className="font-semibold text-emerald-600">R$ {liquidoParceria.toFixed(2)}</span>
          </div>
        )}
        {!isMillenium && selectedAux && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Auxiliar {selectedAux.name} ({Number(selectedAux.percentage)}%)</span>
            <span className="font-semibold text-red-500">− R$ {auxValue.toFixed(2)}</span>
          </div>
        )}
        {isMillenium && selectedAuxiliaries.map(a => {
          const amount = bruto * a.percentage / 100
          return (
            <div key={a.auxiliary_id} className="flex justify-between text-sm">
              <span className="text-slate-600">
                {AUX_TYPE_LABEL[a.type] ?? 'Técnico'} {a.name} ({a.percentage}%)
              </span>
              <span className="font-semibold text-red-500">− R$ {amount.toFixed(2)}</span>
            </div>
          )
        })}
        {(isOutsourced || (isMillenium ? selectedAuxiliaries.length > 0 : selectedAux)) && (
          <div className="flex justify-between text-base font-bold border-t border-slate-100 pt-2">
            <span className="text-slate-800">Valor Líquido</span>
            <span className="text-emerald-600">R$ {liquidoFinal.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Status de pagamento */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">Status de Pagamento</h2>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'pago', label: 'Pago' },
            { value: 'pago_parcial', label: 'Pago parcialmente' },
            { value: 'pendente', label: 'Pendente' },
          ].map(s => (
            <button key={s.value} type="button" onClick={() => setPaymentStatus(s.value as PaymentStatus)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${paymentStatus === s.value ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {s.label}
            </button>
          ))}
        </div>
        {paymentStatus === 'pago_parcial' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Valor Pago (R$)</label>
              <input type="number" min="0" step="0.01" value={amountPaid || ''} onChange={e => setAmountPaid(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Valor Restante (R$)</label>
              <input type="number" min="0" step="0.01" value={remainingAmount || ''} onChange={e => setRemainingAmount(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Data do Restante</label>
              <input type="date" value={remainingDueDate} onChange={e => setRemainingDueDate(e.target.value)} className={inputCls} />
            </div>
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="flex gap-3 justify-end pb-6">
        <Link href={`/dashboard/chamados/${id}`}
          className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
          Cancelar
        </Link>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar OS'}
        </button>
      </div>
    </form>
  )
}
