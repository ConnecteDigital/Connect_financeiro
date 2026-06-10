'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Save, Loader2, CalendarDays, CheckSquare } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { getCall, updateCall } from '@/lib/db/calls'
import { createServiceOrder, updateServiceOrder } from '@/lib/db/service-orders'
import { getTeams } from '@/lib/db/teams'
import { getClients } from '@/lib/db/clients'
import { getServiceTypes } from '@/lib/db/service-types'
import { createClient } from '@/lib/supabase/client'
import { useCallOrigins } from '@/lib/use-call-origins'
import { SERVICE_CONFIG } from '@/lib/service-config'

type ServiceType = 'proprio' | 'terceirizado_saida' | 'terceirizado_entrada'
type PaymentStatus = 'pago' | 'pago_parcial' | 'pendente'
type BillingSystem = 'metro_linear' | 'metro_linear_sem_hidraulica' | 'metro_cubico' | 'litros' | 'carga' | 'valor_fechado' | 'metro_quadrado'

interface OsService {
  category: string
  selected: boolean
  subs: string[]
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

export default function EditarChamadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const { origins: callOrigins } = useCallOrigins()

  // Chamado
  const [callDate, setCallDate] = useState('')
  const [origin, setOrigin] = useState('')
  const [callStatus, setCallStatus] = useState('agendado')
  const [callNotes, setCallNotes] = useState('')
  const [clientId, setClientId] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [callAddress, setCallAddress] = useState('')
  const [callCity, setCallCity] = useState('')
  const [callNeighborhood, setCallNeighborhood] = useState('')
  const [isApproved, setIsApproved] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)
  const [existingSoId, setExistingSoId] = useState<string | null>(null)

  // OS
  const [serviceType, setServiceType] = useState<ServiceType>('proprio')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pendente')
  const [billingSystem, setBillingSystem] = useState<BillingSystem | ''>('')
  const [services, setServices] = useState<OsService[]>([])
  const [discount, setDiscount] = useState(0)
  const [taxes, setTaxes] = useState(0)
  const [equipmentRentalPct, setEquipmentRentalPct] = useState(0)
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
  // Custos terceirizado
  const [fuelCost, setFuelCost] = useState(0)
  const [mealCost, setMealCost] = useState(0)
  const [truckCost, setTruckCost] = useState(0)
  const [otherCost, setOtherCost] = useState(0)

  useEffect(() => {
    Promise.all([getCall(id), getClients(), getTeams(), getServiceTypes()]).then(([call, cls, tms, sts]) => {
      setClients(cls)
      setTeams(tms)
      const typeNames: string[] = sts.map((st: any) => st.name)

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

      // Tipo(s) de serviço do chamado: valores antigos podem conter vírgula no
      // próprio nome, então só separamos se todas as partes forem tipos conhecidos
      const options = [...typeNames]
      const selected: string[] = []
      if (call.service_category) {
        const parts = call.service_category.split(', ')
        if (parts.every((p: string) => typeNames.includes(p))) {
          selected.push(...parts)
        } else {
          selected.push(call.service_category)
          if (!options.includes(call.service_category)) options.push(call.service_category)
        }
      }
      setCategoryOptions(options)
      setSelectedCategories(selected)

      // Tipos de serviço realizado (itens da OS)
      const svcList: OsService[] = typeNames.map(name => ({ category: name, selected: false, subs: [], quantity: 0, unitPrice: 0, notes: '' }))

      // Preencher OS se existir
      const so = call.service_orders?.[0]
      if (so) {
        setExistingSoId(so.id)
        setServiceType(so.service_type)
        setPaymentStatus(so.payment_status)
        setBillingSystem(so.billing_system ?? '')
        setDiscount(Number(so.discount ?? 0))
        setTaxes(Number(so.taxes ?? 0))
        setEquipmentRentalPct(Number(so.equipment_rental_pct ?? 0))
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
        setFuelCost(Number(so.outsource_fuel_cost ?? 0))
        setMealCost(Number(so.outsource_meal_cost ?? 0))
        setTruckCost(Number(so.outsource_truck_cost ?? 0))
        setOtherCost(Number(so.outsource_other_cost ?? 0))

        // Itens existentes: itens novos têm a categoria gravada; itens antigos
        // (avulsos) entram como linha extra para não perder nada ao salvar
        for (const item of so.items ?? []) {
          const category = item.category ?? item.description
          const match = svcList.find(s => s.category === category)
          if (match) {
            match.selected = true
            match.quantity = Number(item.quantity)
            match.unitPrice = Number(item.unit_price)
            match.subs = item.sub_options ? String(item.sub_options).split(', ') : []
            match.notes = item.notes ?? ''
          } else {
            svcList.push({
              category,
              selected: true,
              subs: item.sub_options ? String(item.sub_options).split(', ') : [],
              quantity: Number(item.quantity),
              unitPrice: Number(item.unit_price),
              notes: item.notes ?? '',
            })
          }
        }
      }
      setServices(svcList)
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const serviceTotal = (s: OsService) => s.quantity * s.unitPrice
  const subtotal = services.filter(s => s.selected).reduce((sum, s) => sum + serviceTotal(s), 0)
  const total = subtotal + equipmentRentalValue - discount + taxes

  const toggleCategory = (name: string) =>
    setSelectedCategories(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name])

  const toggleService = (category: string) =>
    setServices(prev => prev.map(s => s.category === category ? { ...s, selected: !s.selected } : s))

  const updateService = (category: string, patch: Partial<OsService>) =>
    setServices(prev => prev.map(s => s.category === category ? { ...s, ...patch } : s))

  const toggleServiceSub = (category: string, sub: string) =>
    setServices(prev => prev.map(s => s.category === category
      ? { ...s, subs: s.subs.includes(sub) ? s.subs.filter(x => x !== sub) : [...s.subs, sub] }
      : s))

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
        service_category: selectedCategories.join(', ') || null,
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
          driver: driver || null,
          nf_number: nfNumber || null,
          vehicle: vehicle || null,
          due_date: dueDate || null,
          service_type: serviceType,
          billing_system: billingSystem || null,
          has_floor_plan: hasFloorPlan,
          has_no_floor_plan: hasNoFloorPlan,
          has_no_knowledge: hasNoKnowledge,
          has_hydraulic_plan: hasHydraulicPlan,
          has_no_hydraulic_plan: hasNoHydraulicPlan,
          has_guarantee: hasGuarantee,
          has_guarantee_60: hasGuarantee60,
          has_guarantee_90: hasGuarantee90,
          has_no_guarantee: hasNoGuarantee,
          equipment_rental_pct: equipmentRentalPct,
          equipment_rental_value: equipmentRentalValue,
          subtotal,
          discount,
          taxes,
          total_value: total,
          own_material_cost: materialCost,
          own_fuel_cost: ownFuelCost,
          own_other_cost: ownOtherCost,
          other_service_value: otherServiceValue,
          outsource_fuel_cost: fuelCost,
          outsource_meal_cost: mealCost,
          outsource_truck_cost: truckCost,
          outsource_other_cost: otherCost,
          payment_method: paymentMethod || null,
          payment_status: paymentStatus,
          amount_paid: amountPaid,
          remaining_amount: remainingAmount,
          remaining_due_date: remainingDueDate || null,
          conditions: conditions || null,
          observations: observations || null,
        }

        const validItems = services.filter(s => s.selected).map(s => ({
          quantity: s.quantity || 1,
          description: s.category + (s.subs.length ? ` — ${s.subs.join(', ')}` : ''),
          unit_price: s.unitPrice,
          category: s.category,
          sub_options: s.subs.join(', ') || null,
          notes: s.notes || null,
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

        {/* Tipo(s) de serviço */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Tipo(s) de Serviço</label>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map(name => (
              <button key={name} type="button" onClick={() => toggleCategory(name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${selectedCategories.includes(name) ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-200 text-slate-600 hover:border-orange-300'}`}>
                {name}
              </button>
            ))}
          </div>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Forma de Pagamento</label>
                <input type="text" placeholder="Dinheiro, PIX, Cartão..." value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
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
                      <input type="number" min="0" step="0.01" value={f.val} onChange={e => f.set(Number(e.target.value))}
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
                    <input type="number" min="0" step="0.01" value={otherServiceValue} onChange={e => setOtherServiceValue(Number(e.target.value))}
                      className="w-36 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Gasolina (R$)', val: fuelCost, set: setFuelCost },
                  { label: 'Almoço (R$)', val: mealCost, set: setMealCost },
                  { label: 'Aluguel Caminhão (R$)', val: truckCost, set: setTruckCost },
                  { label: 'Outros (R$)', val: otherCost, set: setOtherCost },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                    <input type="number" min="0" step="0.01" value={f.val} onChange={e => f.set(Number(e.target.value))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tipos de serviço realizado */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-orange-500" />
              Tipo(s) de Serviço Realizado
            </h2>
            <div className="space-y-2">
              {services.map(s => {
                const cfg = SERVICE_CONFIG[s.category]
                return (
                  <div key={s.category} className={`rounded-lg transition ${s.selected ? 'border border-orange-200 bg-orange-50/40 p-3' : ''}`}>
                    <label className="flex items-center gap-2.5 cursor-pointer py-1">
                      <input type="checkbox" checked={s.selected} onChange={() => toggleService(s.category)}
                        className="w-4 h-4 rounded text-orange-500" />
                      <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{s.category}</span>
                    </label>
                    {s.selected && (
                      <div className="mt-2 space-y-3 pl-6">
                        {cfg?.subOptions && (
                          <div className="flex flex-wrap gap-2">
                            {cfg.subOptions.map(sub => (
                              <button key={sub} type="button" onClick={() => toggleServiceSub(s.category, sub)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${s.subs.includes(sub) ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300'}`}>
                                {sub}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">{cfg?.qtyLabel ?? 'Quantidade'}</label>
                            <input type="number" min="0" step="0.01" value={s.quantity}
                              onChange={e => updateService(s.category, { quantity: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">{cfg?.priceLabel ?? 'Valor (R$)'}</label>
                            <input type="number" min="0" step="0.01" value={s.unitPrice}
                              onChange={e => updateService(s.category, { unitPrice: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Valor total</label>
                            <p className="px-3 py-2 text-sm font-bold text-orange-600 bg-white border border-slate-100 rounded-lg">
                              R$ {serviceTotal(s).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                          <input type="text" value={s.notes}
                            onChange={e => updateService(s.category, { notes: e.target.value })}
                            placeholder="Detalhes deste serviço..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Locação Equip. e M.O. (%)</label>
                <input type="number" min="0" value={equipmentRentalPct} onChange={e => setEquipmentRentalPct(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Valor (R$)</label>
                <input type="number" min="0" step="0.01" value={equipmentRentalValue} onChange={e => setEquipmentRentalValue(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-600">Descontos (R$)</span>
                <input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(Number(e.target.value))}
                  className="w-24 px-2 py-1 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-600">Impostos (R$)</span>
                <input type="number" min="0" step="0.01" value={taxes} onChange={e => setTaxes(Number(e.target.value))}
                  className="w-24 px-2 py-1 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="flex justify-between text-base font-bold border-t border-slate-100 pt-2">
                <span className="text-slate-800">Valor Total</span>
                <span className="text-orange-500">R$ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Levantamento */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">Levantamento e Cobrança</h2>
            <div className="flex flex-wrap gap-2">
              {(['metro_linear','metro_cubico','litros','carga','valor_fechado','metro_quadrado'] as BillingSystem[]).map(b => {
                const labels: Record<string,string> = { metro_linear:'Metro Linear', metro_cubico:'Metro Cúbico', litros:'Litros', carga:'Carga', valor_fechado:'Valor Fechado', metro_quadrado:'Metro Quadrado' }
                return (
                  <button key={b} type="button" onClick={() => setBillingSystem(billingSystem === b ? '' : b)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${billingSystem === b ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-200 text-slate-600 hover:border-orange-300'}`}>
                    {labels[b]}
                  </button>
                )
              })}
            </div>
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
                  <input type="number" min="0" step="0.01" value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Valor Restante (R$)</label>
                  <input type="number" min="0" step="0.01" value={remainingAmount} onChange={e => setRemainingAmount(Number(e.target.value))}
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
