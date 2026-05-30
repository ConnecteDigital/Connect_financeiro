'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { getCall, updateCall } from '@/lib/db/calls'
import { createServiceOrder, updateServiceOrder } from '@/lib/db/service-orders'
import { getTeams } from '@/lib/db/teams'
import { getClients } from '@/lib/db/clients'
import { createClient } from '@/lib/supabase/client'

type ServiceType = 'proprio' | 'terceirizado_saida' | 'terceirizado_entrada'
type PaymentStatus = 'pago' | 'pago_parcial' | 'pendente'
type BillingSystem = 'metro_linear' | 'metro_linear_sem_hidraulica' | 'metro_cubico' | 'litros' | 'carga' | 'valor_fechado' | 'metro_quadrado'

interface Item { id: string; quantity: number; description: string; unit_price: number }

export default function EditarChamadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])

  const SERVICE_CATEGORIES = [
    'Desentupimento de ralo, vaso, esgoto, cano, pia, rede',
    'Limpeza de caixa de gordura',
    'Limpa fossa',
    'Outros',
  ]

  // Chamado
  const [callDate, setCallDate] = useState('')
  const [origin, setOrigin] = useState('site_lider')
  const [callStatus, setCallStatus] = useState('agendado')
  const [callNotes, setCallNotes] = useState('')
  const [clientId, setClientId] = useState('')
  const [contactName, setContactName] = useState('')
  const [serviceCategory, setServiceCategory] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [callAddress, setCallAddress] = useState('')
  const [isApproved, setIsApproved] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)
  const [existingSoId, setExistingSoId] = useState<string | null>(null)

  // OS
  const [serviceType, setServiceType] = useState<ServiceType>('proprio')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pendente')
  const [billingSystem, setBillingSystem] = useState<BillingSystem | ''>('')
  const [items, setItems] = useState<Item[]>([{ id: '1', quantity: 1, description: '', unit_price: 0 }])
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
  const [fuelCost, setFuelCost] = useState(0)
  const [mealCost, setMealCost] = useState(0)
  const [truckCost, setTruckCost] = useState(0)
  const [otherCost, setOtherCost] = useState(0)

  useEffect(() => {
    Promise.all([getCall(id), getClients(), getTeams()]).then(([call, cls, tms]) => {
      setClients(cls)
      setTeams(tms)
      // Preencher dados do chamado
      setCallDate(call.date)
      setOrigin(call.origin)
      setCallStatus(call.status)
      setCallNotes(call.notes ?? '')
      setClientId(call.client_id ?? '')
      setContactName(call.contact_name ?? '')
      setServiceCategory(call.service_category ?? '')
      setScheduledTime(call.scheduled_time ? String(call.scheduled_time).slice(0,5) : '')
      setCallAddress(call.call_address ?? '')
      setIsApproved(call.status === 'aprovado')
      setIsScheduled(call.status === 'agendado')

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
        setFuelCost(Number(so.outsource_fuel_cost ?? 0))
        setMealCost(Number(so.outsource_meal_cost ?? 0))
        setTruckCost(Number(so.outsource_truck_cost ?? 0))
        setOtherCost(Number(so.outsource_other_cost ?? 0))

        if (so.items?.length) {
          setItems(so.items.map((item: any) => ({
            id: item.id,
            quantity: Number(item.quantity),
            description: item.description,
            unit_price: Number(item.unit_price),
          })))
        }
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const total = subtotal + equipmentRentalValue - discount + taxes

  const addItem = () => setItems(prev => [...prev, { id: Date.now().toString(), quantity: 1, description: '', unit_price: 0 }])
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id))
  const updateItem = (id: string, field: keyof Item, value: string | number) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))

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
        origin,
        status: callStatus,
        notes: callNotes || null,
        service_category: serviceCategory || null,
        scheduled_time: scheduledTime || null,
        call_address: callAddress || null,
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
          has_no_guarantee: hasNoGuarantee,
          equipment_rental_pct: equipmentRentalPct,
          equipment_rental_value: equipmentRentalValue,
          subtotal,
          discount,
          taxes,
          total_value: total,
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

        if (existingSoId) {
          // Atualizar OS existente
          await updateServiceOrder(existingSoId, orderData)
          // Atualizar itens
          const supabase = createClient()
          await supabase.from('service_order_items').delete().eq('service_order_id', existingSoId)
          const validItems = items.filter(i => i.description.trim())
          if (validItems.length) {
            await supabase.from('service_order_items').insert(
              validItems.map(i => ({
                service_order_id: existingSoId,
                quantity: i.quantity,
                description: i.description,
                unit_price: i.unit_price,
              }))
            )
          }
        } else {
          // Criar nova OS
          const validItems = items.filter(i => i.description.trim()).map(i => ({
            quantity: i.quantity,
            description: i.description,
            unit_price: i.unit_price,
          }))
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
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Data *</label>
            <input type="date" required value={callDate} onChange={e => setCallDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Origem *</label>
            <select value={origin} onChange={e => setOrigin(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="site_lider">Site Líder</option>
              <option value="site_praja">Site Pra Já</option>
              <option value="indicacao">Indicação</option>
              <option value="terceirizado">Terceirizado</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Status *</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'agendado', label: 'Agendado' },
              { value: 'aprovado', label: 'Aprovado' },
              { value: 'nao_quis_visita', label: 'Nao quis visita' },
              { value: 'cancelado', label: 'Cancelado' },
            ].map(s => (
              <button key={s.value} type="button" onClick={() => handleStatusChange(s.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${callStatus === s.value ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {s.label}
              </button>
            ))}
          </div>
          {callStatus === 'aprovado' && !existingSoId && (
            <p className="text-xs text-emerald-600 mt-2 font-medium">✨ Preencha os dados da OS abaixo para finalizar o serviço</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome do Contato</label>
          <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
            placeholder="Quem ligou"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de Serviço</label>
          <select value={serviceCategory} onChange={e => setServiceCategory(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Selecionar tipo —</option>
            {SERVICE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Cliente cadastrado <span className="text-slate-400 font-normal">(opcional)</span></label>
          <select value={clientId} onChange={e => setClientId(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Não vincular —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.city ? ` - ${c.city}` : ''}</option>)}
          </select>
        </div>

        {isScheduled && (
          <div className="border border-blue-100 bg-blue-50/50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-700">Detalhes do Agendamento</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Horário Agendado</label>
                <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Endereço do Serviço</label>
                <input type="text" value={callAddress} onChange={e => setCallAddress(e.target.value)}
                  placeholder="Rua, número, bairro, cidade"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Observações</label>
          <textarea rows={2} value={callNotes} onChange={e => setCallNotes(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
      </div>

      {/* OS — só quando aprovado */}
      {isApproved && (
        <>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">
              Ordem de Serviço {existingSoId && <span className="text-blue-600 font-mono text-sm ml-1">(editando OS existente)</span>}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Equipe</label>
                <select value={teamId} onChange={e => setTeamId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Motorista</label>
                <input type="text" value={driver} onChange={e => setDriver(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nº da NF</label>
                <input type="text" value={nfNumber} onChange={e => setNfNumber(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Veículo</label>
                <input type="text" value={vehicle} onChange={e => setVehicle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Vencimento</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Forma de Pagamento</label>
                <input type="text" placeholder="Dinheiro, PIX, Cartão..." value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Tipo de execução */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">Tipo de Execução</h2>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'proprio', label: '✅ Serviço Próprio' },
                { value: 'terceirizado_saida', label: 'Terceirizado (passamos para parceiro)' },
                { value: 'terceirizado_entrada', label: 'Recebido de parceiro' },
              ].map(s => (
                <button key={s.value} type="button" onClick={() => setServiceType(s.value as ServiceType)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${serviceType === s.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {s.label}
                </button>
              ))}
            </div>
            {serviceType !== 'proprio' && (
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
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Itens */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">Itens do Serviço</h2>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase px-1">
                <div className="col-span-2">Qtd.</div>
                <div className="col-span-6">Descrição</div>
                <div className="col-span-2">Vlr. Unit.</div>
                <div className="col-span-1">Total</div>
                <div className="col-span-1"></div>
              </div>
              {items.map(item => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2">
                    <input type="number" min="1" value={item.quantity}
                      onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                      className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-6">
                    <input type="text" value={item.description} placeholder="Descrição"
                      onChange={e => updateItem(item.id, 'description', e.target.value)}
                      className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min="0" step="0.01" value={item.unit_price}
                      onChange={e => updateItem(item.id, 'unit_price', Number(e.target.value))}
                      className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-1 text-sm text-slate-700 font-medium text-center">
                    {(item.quantity * item.unit_price).toFixed(2)}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium mt-2">
                <Plus className="w-4 h-4" /> Adicionar item
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Locação Equip. e M.O. (%)</label>
                <input type="number" min="0" value={equipmentRentalPct} onChange={e => setEquipmentRentalPct(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Valor (R$)</label>
                <input type="number" min="0" step="0.01" value={equipmentRentalValue} onChange={e => setEquipmentRentalValue(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-600">Descontos (R$)</span>
                <input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(Number(e.target.value))}
                  className="w-24 px-2 py-1 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-600">Impostos (R$)</span>
                <input type="number" min="0" step="0.01" value={taxes} onChange={e => setTaxes(Number(e.target.value))}
                  className="w-24 px-2 py-1 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-between text-base font-bold border-t border-slate-100 pt-2">
                <span className="text-slate-800">Valor Total</span>
                <span className="text-blue-600">R$ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Levantamento */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">Levantamento e Cobrança</h2>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Sistema de Cobrança</p>
              <div className="flex flex-wrap gap-2">
                {(['metro_linear','metro_cubico','litros','carga','valor_fechado','metro_quadrado'] as BillingSystem[]).map(b => {
                  const labels: Record<string,string> = { metro_linear:'Metro Linear', metro_cubico:'Metro Cúbico', litros:'Litros', carga:'Carga', valor_fechado:'Valor Fechado', metro_quadrado:'Metro Quadrado' }
                  return (
                    <button key={b} type="button" onClick={() => setBillingSystem(billingSystem === b ? '' : b)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${billingSystem === b ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}>
                      {labels[b]}
                    </button>
                  )
                })}
              </div>
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
                  { label: 'Com garantia de 30 dias', val: hasGuarantee, set: setHasGuarantee },
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
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Observações</label>
              <textarea rows={2} value={observations} onChange={e => setObservations(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
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
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${paymentStatus === s.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {s.label}
                </button>
              ))}
            </div>
            {paymentStatus === 'pago_parcial' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Valor Pago (R$)</label>
                  <input type="number" min="0" step="0.01" value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Valor Restante (R$)</label>
                  <input type="number" min="0" step="0.01" value={remainingAmount} onChange={e => setRemainingAmount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Data do Restante</label>
                  <input type="date" value={remainingDueDate} onChange={e => setRemainingDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </form>
  )
}
