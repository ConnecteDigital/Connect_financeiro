'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Save, Loader2, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { getCall, updateCall } from '@/lib/db/calls'
import { createServiceOrder, updateServiceOrder } from '@/lib/db/service-orders'
import { getTeams } from '@/lib/db/teams'
import { getClients } from '@/lib/db/clients'
import { getServiceTypes } from '@/lib/db/service-types'
import { getAuxiliaries } from '@/lib/db/auxiliaries'
import { createClient } from '@/lib/supabase/client'
import { useCallOrigins } from '@/lib/use-call-origins'
import { SERVICE_CONFIG } from '@/lib/service-config'

type ServiceType = 'proprio' | 'terceirizado_saida' | 'terceirizado_entrada'
type PaymentStatus = 'pago' | 'pago_parcial' | 'pendente'

interface ServiceLine {
  category: string
  sub: string | null
  quantity: number
  unitPrice: number
  notes: string
}

const CALL_STATUSES = [
  { value: 'agendado', label: 'Agendado' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'nao_aprovou', label: 'Não aprovou' },
  { value: 'nao_quis_visita', label: 'Não quis visita' },
  { value: 'cancelado', label: 'Cancelado' },
]

const PAYMENT_METHODS = ['Dinheiro', 'Cartão', 'PIX', 'Boleto']

export default function EditarChamadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [auxiliaries, setAuxiliaries] = useState<any[]>([])
  const [categoryNames, setCategoryNames] = useState<string[]>([])
  const { origins: callOrigins } = useCallOrigins()

  // Chamado
  const [callDate, setCallDate] = useState('')
  const [origin, setOrigin] = useState('')
  const [callStatus, setCallStatus] = useState('agendado')
  const [callNotes, setCallNotes] = useState('')
  const [clientId, setClientId] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [callAddress, setCallAddress] = useState('')
  const [callCity, setCallCity] = useState('')
  const [callNeighborhood, setCallNeighborhood] = useState('')
  const [isApproved, setIsApproved] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)
  const [existingSoId, setExistingSoId] = useState<string | null>(null)

  // Serviços — seção única
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([])

  // OS
  const [serviceType, setServiceType] = useState<ServiceType>('proprio')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pendente')
  const [partnerPct, setPartnerPct] = useState(50)
  const [auxiliaryId, setAuxiliaryId] = useState('')
  const [discount, setDiscount] = useState(0)
  const [taxes, setTaxes] = useState(0)
  const [equipmentRentalValue, setEquipmentRentalValue] = useState(0)
  const [hasFloorPlan, setHasFloorPlan] = useState(false)
  const [hasNoFloorPlan, setHasNoFloorPlan] = useState(false)
  const [hasNoKnowledge, setHasNoKnowledge] = useState(false)
  const [hasHydraulicPlan, setHasHydraulicPlan] = useState(false)
  const [hasNoHydraulicPlan, setHasNoHydraulicPlan] = useState(false)
  const [hasGuarantee, setHasGuarantee] = useState(false)
  const [hasGuarantee60, setHasGuarantee60] = useState(false)
  const [hasGuarantee90, setHasGuarantee90] = useState(false)
  const [hasNoGuarantee, setHasNoGuarantee] = useState(false)
  const [teamId, setTeamId] = useState('')
  const [driver, setDriver] = useState('')
  const [nfNumber, setNfNumber] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [amountPaid, setAmountPaid] = useState(0)
  const [remainingAmount, setRemainingAmount] = useState(0)
  const [remainingDueDate, setRemainingDueDate] = useState('')
  const [conditions, setConditions] = useState('')
  const [observations, setObservations] = useState('')
  // Custos serviço próprio
  const [materialCost, setMaterialCost] = useState(0)
  const [ownFuelCost, setOwnFuelCost] = useState(0)
  const [ownOtherCost, setOwnOtherCost] = useState(0)
  const [otherServiceValue, setOtherServiceValue] = useState(0)

  useEffect(() => {
    Promise.all([getCall(id), getClients(), getTeams(), getServiceTypes(), getAuxiliaries()]).then(([call, cls, tms, sts, auxs]) => {
      setClients(cls)
      setTeams(tms)
      setAuxiliaries(auxs)
      const typeNames: string[] = sts.map((st: any) => st.name)
      setCategoryNames(typeNames)

      // Preencher dados do chamado
      setCallDate(call.date)
      setOrigin(call.origin)
      setCallStatus(call.status)
      setCallNotes(call.notes ?? '')
      setClientId(call.client_id ?? '')
      setContactName(call.contact_name ?? '')
      setContactPhone(call.contact_phone ?? '')
      setScheduledDate(call.scheduled_date ?? '')
      setScheduledTime(call.scheduled_time ? String(call.scheduled_time).slice(0,5) : '')
      setCallAddress(call.call_address ?? '')
      setCallCity(call.call_city ?? '')
      setCallNeighborhood(call.call_neighborhood ?? '')
      setIsApproved(call.status === 'aprovado')
      setIsScheduled(call.status === 'agendado')

      const selected: string[] = []
      const lines: ServiceLine[] = []
      const so = call.service_orders?.[0]

      // Preencher OS se existir
      if (so) {
        setExistingSoId(so.id)
        setServiceType(so.service_type)
        setPaymentStatus(so.payment_status)
        setPartnerPct(Number(so.outsource_profit_pct ?? 50))
        setAuxiliaryId(so.auxiliary_id ?? '')
        setDiscount(Number(so.discount ?? 0))
        setTaxes(Number(so.taxes ?? 0))
        setEquipmentRentalValue(Number(so.equipment_rental_value ?? 0))
        setHasFloorPlan(so.has_floor_plan ?? false)
        setHasNoFloorPlan(so.has_no_floor_plan ?? false)
        setHasNoKnowledge(so.has_no_knowledge ?? false)
        setHasHydraulicPlan(so.has_hydraulic_plan ?? false)
        setHasNoHydraulicPlan(so.has_no_hydraulic_plan ?? false)
        setHasGuarantee(so.has_guarantee ?? false)
        setHasGuarantee60(so.has_guarantee_60 ?? false)
        setHasGuarantee90(so.has_guarantee_90 ?? false)
        setHasNoGuarantee(so.has_no_guarantee ?? false)
        setTeamId(so.team_id ?? '')
        setDriver(so.driver ?? '')
        setNfNumber(so.nf_number ?? '')
        setVehicle(so.vehicle ?? '')
        setDueDate(so.due_date ?? '')
        setPaymentMethod(so.payment_method ?? '')
        setAmountPaid(Number(so.amount_paid ?? 0))
        setRemainingAmount(Number(so.remaining_amount ?? 0))
        setRemainingDueDate(so.remaining_due_date ?? '')
        setConditions(so.conditions ?? '')
        setObservations(so.observations ?? '')
        setMaterialCost(Number(so.own_material_cost ?? 0))
        setOwnFuelCost(Number(so.own_fuel_cost ?? 0))
        setOwnOtherCost(Number(so.own_other_cost ?? 0))
        setOtherServiceValue(Number(so.other_service_value ?? 0))

        // Itens viram linhas de serviço (itens antigos sem categoria entram como categoria própria)
        for (const item of so.items ?? []) {
          const category = item.category ?? item.description
          const sub = item.sub_options || null
          if (!selected.includes(category)) selected.push(category)
          lines.push({
            category,
            sub,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
            notes: item.notes ?? '',
          })
        }
      }

      // Categorias do chamado sem item correspondente (ex: chamado não aprovado)
      if (call.service_category) {
        for (const cat of typeNames) {
          if (selected.includes(cat)) continue
          const idx = call.service_category.indexOf(cat)
          if (idx === -1) continue
          selected.push(cat)
          // sub-opções entre parênteses logo após o nome, ex: "Desobstrução (Vaso, Esgoto)"
          const after = call.service_category.slice(idx + cat.length)
          const m = after.match(/^\s*\(([^)]*)\)/)
          if (m) {
            for (const sub of m[1].split(', ')) {
              lines.push({ category: cat, sub, quantity: 0, unitPrice: 0, notes: '' })
            }
          } else if (!SERVICE_CONFIG[cat]?.subOptions) {
            lines.push({ category: cat, sub: null, quantity: 0, unitPrice: 0, notes: '' })
          }
        }
        // Nada reconhecido: mantém o texto antigo como categoria avulsa
        if (selected.length === 0) {
          selected.push(call.service_category)
          lines.push({ category: call.service_category, sub: null, quantity: 0, unitPrice: 0, notes: '' })
        }
      }

      setSelectedCategories(selected)
      setServiceLines(lines)
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  // ── Serviços ──
  const lineTotal = (l: ServiceLine) => l.quantity * l.unitPrice
  const subtotal = serviceLines.reduce((sum, l) => sum + lineTotal(l), 0)
  const bruto = subtotal + equipmentRentalValue - discount + taxes
  const isOutsourced = serviceType !== 'proprio'
  const liquidoParceria = isOutsourced ? bruto * partnerPct / 100 : bruto
  const selectedAux = auxiliaries.find(a => a.id === auxiliaryId)
  const auxValue = selectedAux ? bruto * Number(selectedAux.percentage) / 100 : 0
  const liquidoFinal = liquidoParceria - auxValue

  function toggleCategory(name: string) {
    const cfg = SERVICE_CONFIG[name]
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

  function handleStatusChange(status: string) {
    setCallStatus(status)
    setIsApproved(status === 'aprovado')
    setIsScheduled(status === 'agendado')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      // 1. Atualizar chamado
      await updateCall(id, {
        date: callDate,
        client_id: clientId || null,
        contact_name: contactName || null,
        contact_phone: contactPhone || null,
        origin,
        status: callStatus,
        notes: callNotes || null,
        service_category: serviceCategoryText || null,
        scheduled_date: scheduledDate || null,
        scheduled_time: scheduledTime || null,
        call_address: callAddress || null,
        call_city: callCity || null,
        call_neighborhood: callNeighborhood || null,
      })

      // 2. Se aprovado, criar ou atualizar OS
      if (isApproved) {
        const orderData = {
          call_id: id,
          date: callDate,
          client_id: clientId || null,
          team_id: teamId || null,
          auxiliary_id: auxiliaryId || null,
          auxiliary_value: auxValue,
          driver: driver || null,
          nf_number: nfNumber || null,
          vehicle: vehicle || null,
          due_date: dueDate || null,
          service_type: serviceType,
          has_floor_plan: hasFloorPlan,
          has_no_floor_plan: hasNoFloorPlan,
          has_no_knowledge: hasNoKnowledge,
          has_hydraulic_plan: hasHydraulicPlan,
          has_no_hydraulic_plan: hasNoHydraulicPlan,
          has_guarantee: hasGuarantee,
          has_guarantee_60: hasGuarantee60,
          has_guarantee_90: hasGuarantee90,
          has_no_guarantee: hasNoGuarantee,
          equipment_rental_value: equipmentRentalValue,
          subtotal,
          discount,
          taxes,
          total_value: bruto,
          outsource_profit_pct: partnerPct,
          own_material_cost: materialCost,
          own_fuel_cost: ownFuelCost,
          own_other_cost: ownOtherCost,
          other_service_value: otherServiceValue,
          payment_method: paymentMethod || null,
          payment_status: paymentStatus,
          amount_paid: amountPaid,
          remaining_amount: remainingAmount,
          remaining_due_date: remainingDueDate || null,
          conditions: conditions || null,
          observations: observations || null,
        }

        const validItems = serviceLines.map(l => ({
          quantity: l.quantity || 1,
          description: l.category + (l.sub ? ` — ${l.sub}` : ''),
          unit_price: l.unitPrice,
          category: l.category,
          sub_options: l.sub,
          notes: l.notes || null,
        }))

        if (existingSoId) {
          // Atualizar OS existente
          await updateServiceOrder(existingSoId, orderData)
          // Atualizar itens
          const supabase = createClient()
          await supabase.from('service_order_items').delete().eq('service_order_id', existingSoId)
          if (validItems.length) {
            await supabase.from('service_order_items').insert(
              validItems.map(i => ({ ...i, service_order_id: existingSoId }))
            )
          }
        } else {
          // Criar nova OS
          await createServiceOrder(orderData, validItems)
        }
      }

      router.push(`/dashboard/chamados/${id}`)
    } catch (err: any) {
      console.error(err)
      setError('Erro ao salvar. Verifique os dados e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

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
          <h1 className="text-2xl font-bold text-slate-800">Editar Chamado</h1>
          <p className="text-slate-500 text-sm">Atualize as informações do chamado</p>
        </div>
      </div>

      {/* Dados do chamado */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">Informações do Chamado</h2>

        {/* Origem */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Origem *</label>
          <div className="flex flex-wrap gap-2">
            {callOrigins.map(o => (
              <button key={o.value} type="button" onClick={() => setOrigin(o.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${origin === o.value ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Status *</label>
          <div className="flex flex-wrap gap-2">
            {CALL_STATUSES.map(s => (
              <button key={s.value} type="button" onClick={() => handleStatusChange(s.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${callStatus === s.value ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {s.label}
              </button>
            ))}
          </div>
          {callStatus === 'aprovado' && !existingSoId && (
            <p className="text-xs text-emerald-600 mt-2 font-medium">✨ Preencha os dados da OS abaixo para finalizar o serviço</p>
          )}
        </div>

        {/* Data do chamado */}
        <div className="sm:max-w-xs">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Data do Chamado *</label>
          <input type="date" required value={callDate} onChange={e => setCallDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>

        {/* Contato + telefone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nome do Contato
              <span className="text-slate-400 font-normal ml-1">(quem ligou)</span>
            </label>
            <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
              placeholder="Ex: João Silva"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefone</label>
            <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
              placeholder="(51) 99999-9999"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>

        {/* Cliente cadastrado */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Cliente cadastrado <span className="text-slate-400 font-normal">(opcional)</span></label>
          <select value={clientId} onChange={e => setClientId(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value="">— Não vincular —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.city ? ` - ${c.city}` : ''}</option>)}
          </select>
        </div>

        {/* Cidade e bairro — sempre disponíveis, mesmo sem aprovação ou visita */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Cidade</label>
            <input type="text" value={callCity} onChange={e => setCallCity(e.target.value)}
              placeholder="Ex: Porto Alegre"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bairro</label>
            <input type="text" value={callNeighborhood} onChange={e => setCallNeighborhood(e.target.value)}
              placeholder="Ex: Centro"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>

        {/* Campos de agendamento */}
        {isScheduled && (
          <div className="border border-orange-100 bg-orange-50/50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-orange-600 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              Detalhes do Agendamento
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Data do Serviço</label>
                <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Horário</label>
                <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Endereço do Serviço</label>
                <input type="text" value={callAddress} onChange={e => setCallAddress(e.target.value)}
                  placeholder="Rua, número, bairro, cidade"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
              </div>
            </div>
          </div>
        )}

        {/* Tipo(s) de serviço — seção única */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Tipo(s) de Serviço</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {[...categoryNames, ...selectedCategories.filter(c => !categoryNames.includes(c))].map(name => (
              <button key={name} type="button" onClick={() => toggleCategory(name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${selectedCategories.includes(name) ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-200 text-slate-600 hover:border-orange-300'}`}>
                {name}
              </button>
            ))}
          </div>

          {selectedCategories.map(cat => {
            const cfg = SERVICE_CONFIG[cat]
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

                {/* Valores por serviço — só no chamado aprovado */}
                {isApproved && catLines.map(l => (
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
                      placeholder="Descrição deste serviço..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Observações</label>
          <textarea rows={2} value={callNotes} onChange={e => setCallNotes(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
        </div>
      </div>

      {/* OS — só quando aprovado */}
      {isApproved && (
        <>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">
              Ordem de Serviço {existingSoId && <span className="text-orange-500 font-mono text-sm ml-1">(editando OS existente)</span>}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Equipe</label>
                <select value={teamId} onChange={e => setTeamId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">Selecione...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Auxiliar</label>
                <select value={auxiliaryId} onChange={e => setAuxiliaryId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">Sem auxiliar</option>
                  {auxiliaries.map(a => <option key={a.id} value={a.id}>{a.name} ({Number(a.percentage)}%)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Motorista</label>
                <input type="text" value={driver} onChange={e => setDriver(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nº da NF</label>
                <input type="text" value={nfNumber} onChange={e => setNfNumber(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Veículo</label>
                <input type="text" value={vehicle} onChange={e => setVehicle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Vencimento</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Forma de Pagamento</label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button key={m} type="button" onClick={() => setPaymentMethod(paymentMethod === m ? '' : m)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${paymentMethod === m ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {m}
                  </button>
                ))}
                {paymentMethod && !PAYMENT_METHODS.includes(paymentMethod) && (
                  <span className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white">{paymentMethod}</span>
                )}
              </div>
            </div>
          </div>

          {/* Tipo de execução + custos */}
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
            {serviceType === 'proprio' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Material (R$)', val: materialCost, set: setMaterialCost },
                    { label: 'Combustível (R$)', val: ownFuelCost, set: setOwnFuelCost },
                    { label: 'Outros Custos (R$)', val: ownOtherCost, set: setOwnOtherCost },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                      <input type="number" min="0" step="0.01" value={f.val || ''} onChange={e => f.set(Number(e.target.value))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Contratou algum outro serviço?
                    <span className="text-slate-400 font-normal ml-1">(valor pago a terceiro)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">R$</span>
                    <input type="number" min="0" step="0.01" value={otherServiceValue || ''} onChange={e => setOtherServiceValue(Number(e.target.value))}
                      className="w-36 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                </div>
              </>
            ) : (
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
            {selectedAux && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Auxiliar {selectedAux.name} ({Number(selectedAux.percentage)}%)</span>
                <span className="font-semibold text-red-500">− R$ {auxValue.toFixed(2)}</span>
              </div>
            )}
            {(isOutsourced || selectedAux) && (
              <div className="flex justify-between text-base font-bold border-t border-slate-100 pt-2">
                <span className="text-slate-800">Valor Líquido</span>
                <span className="text-emerald-600">R$ {liquidoFinal.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Levantamento */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">Levantamento</h2>
            <div className="space-y-3">
              {[
                { title: 'Planta baixa', options: [
                  { label: 'Com planta baixa', val: hasFloorPlan, set: setHasFloorPlan },
                  { label: 'Sem planta baixa', val: hasNoFloorPlan, set: setHasNoFloorPlan },
                  { label: 'Sem conhecimento', val: hasNoKnowledge, set: setHasNoKnowledge },
                ]},
                { title: 'Planta hidráulica', options: [
                  { label: 'Com planta hidráulica', val: hasHydraulicPlan, set: setHasHydraulicPlan },
                  { label: 'Sem planta hidráulica', val: hasNoHydraulicPlan, set: setHasNoHydraulicPlan },
                ]},
                { title: 'Garantia', options: [
                  { label: 'Garantia 30 dias', val: hasGuarantee, set: setHasGuarantee },
                  { label: 'Garantia 60 dias', val: hasGuarantee60, set: setHasGuarantee60 },
                  { label: 'Garantia 90 dias', val: hasGuarantee90, set: setHasGuarantee90 },
                  { label: 'Sem garantia', val: hasNoGuarantee, set: setHasNoGuarantee },
                ]},
              ].map(group => (
                <div key={group.title}>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5">{group.title}</p>
                  <div className="flex flex-wrap gap-4">
                    {group.options.map(({ label, val, set }) => (
                      <label key={label} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="w-4 h-4 rounded text-orange-500" />
                        <span className="text-sm text-slate-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Condições de Pagamento</label>
              <input type="text" value={conditions} onChange={e => setConditions(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Observações da OS</label>
              <textarea rows={2} value={observations} onChange={e => setObservations(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
            </div>
          </div>

          {/* Pagamento */}
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
                  <input type="number" min="0" step="0.01" value={amountPaid || ''} onChange={e => setAmountPaid(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Valor Restante (R$)</label>
                  <input type="number" min="0" step="0.01" value={remainingAmount || ''} onChange={e => setRemainingAmount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Data do Restante</label>
                  <input type="date" value={remainingDueDate} onChange={e => setRemainingDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="flex gap-3 justify-end pb-6">
        <Link href={`/dashboard/chamados/${id}`}
          className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
          Cancelar
        </Link>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </form>
  )
}
