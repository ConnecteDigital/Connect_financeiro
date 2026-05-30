'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createCall } from '@/lib/db/calls'
import { createServiceOrder } from '@/lib/db/service-orders'
import { getClients, createClient_ } from '@/lib/db/clients'
import { getTeams } from '@/lib/db/teams'
import { getServiceTypes } from '@/lib/db/service-types'

type ServiceType = 'proprio' | 'terceirizado_saida' | 'terceirizado_entrada'
type PaymentStatus = 'pago' | 'pago_parcial' | 'pendente'
type BillingSystem = 'metro_linear' | 'metro_cubico' | 'litros' | 'carga' | 'valor_fechado' | 'metro_quadrado'
interface Item { id: string; quantity: number; description: string; unit_price: number }

export default function NovoChamadoPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [serviceTypes, setServiceTypes] = useState<any[]>([])

  // Chamado básico
  const [callDate, setCallDate] = useState(new Date().toISOString().split('T')[0])
  const [origin, setOrigin] = useState('site_lider')
  const [callStatus, setCallStatus] = useState('agendado')
  const [callNotes, setCallNotes] = useState('')
  const [clientId, setClientId] = useState('')
  const [contactName, setContactName] = useState('')
  const [serviceCategory, setServiceCategory] = useState('')
  // Campos de agendamento
  const [scheduledTime, setScheduledTime] = useState('')
  const [callAddress, setCallAddress] = useState('')

  const isApproved = callStatus === 'aprovado'
  const isScheduled = callStatus === 'agendado'

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
    Promise.all([getClients(), getTeams(), getServiceTypes()])
      .then(([c, t, st]) => { setClients(c); setTeams(t); setServiceTypes(st) })
      .catch(console.error)
  }, [])

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const total = subtotal + equipmentRentalValue - discount + taxes

  const addItem = () => setItems(prev => [...prev, { id: Date.now().toString(), quantity: 1, description: '', unit_price: 0 }])
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id))
  const updateItem = (id: string, field: keyof Item, value: string | number) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contactName.trim() && !clientId) {
      setError('Informe o nome do contato ou selecione um cliente cadastrado.')
      return
    }
    setSaving(true)
    setError('')
    try {
      // Auto-criar cliente se não existe cadastrado
      let finalClientId = clientId
      if (!clientId && contactName.trim()) {
        const newClient = await createClient_({ name: contactName.trim() })
        finalClientId = newClient.id
      }

      const call = await createCall({
        date: callDate,
        client_id: finalClientId || null,
        contact_name: contactName || null,
        origin,
        status: callStatus,
        notes: callNotes || null,
        service_category: serviceCategory || null,
        scheduled_time: scheduledTime || null,
        call_address: callAddress || null,
      })

      if (isApproved) {
        const orderData = {
          call_id: call.id,
          date: callDate,
          client_id: finalClientId || null,
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
        const validItems = items.filter(i => i.description.trim()).map(i => ({ quantity: i.quantity, description: i.description, unit_price: i.unit_price }))
        await createServiceOrder(orderData, validItems)
      }

      router.push('/dashboard/chamados')
    } catch (err: any) {
      console.error(err)
      setError('Erro ao salvar chamado. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/chamados" className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Novo Chamado</h1>
          <p className="text-slate-500 text-sm">Registre um novo chamado recebido</p>
        </div>
      </div>

      {/* Informações básicas */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">Informações do Chamado</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Data *</label>
            <input type="date" required value={callDate} onChange={e => setCallDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Origem *</label>
            <select value={origin} onChange={e => setOrigin(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="site_lider">Site Líder</option>
              <option value="site_praja">Site Pra Já</option>
              <option value="indicacao">Indicação</option>
              <option value="terceirizado">Terceirizado</option>
            </select>
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Status *</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'agendado', label: 'ðŸ"Agendado' },
              { value: 'aprovado', label: 'Aprovado' },
              { value: 'nao_quis_visita', label: 'Nao quis visita' },
              { value: 'cancelado', label: 'Cancelado' },
            ].map(s => (
              <button key={s.value} type="button" onClick={() => setCallStatus(s.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${callStatus === s.value ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nome do contato */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Nome do Contato *
            <span className="text-slate-400 font-normal ml-1">(quem ligou)</span>
          </label>
          <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
            placeholder="Ex: João Silva"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>

        {/* Cliente cadastrado */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Cliente cadastrado
            <span className="text-slate-400 font-normal ml-1">(opcional â€" vincule se já existe no sistema)</span>
          </label>
          <select value={clientId} onChange={e => setClientId(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value="">â€"- Nao vincular -"</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.city ? ` - ${c.city}` : ''}</option>)}
          </select>
        </div>

        {/* Campos de agendamento */}
        {isScheduled && (
          <div className="border border-orange-100 bg-orange-50/50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-orange-600">ðŸ"Detalhes do Agendamento</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Horário Agendado</label>
                <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de Serviço</label>
                <select value={serviceCategory} onChange={e => setServiceCategory(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  <option value="">Selecionar tipo de servico</option>
                  {serviceTypes.map(st => <option key={st.id} value={st.name}>{st.name}</option>)}
                </select>
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

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Observações</label>
          <textarea rows={2} value={callNotes} onChange={e => setCallNotes(e.target.value)}
            placeholder="Anotações sobre o chamado..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
        </div>
      </div>

      {/* OS â€" só quando aprovado */}
      {isApproved && (
        <>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">Ordem de Serviço</h2>
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">NÂº da NF</label>
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

          {/* Tipo execução */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">Tipo de Execução</h2>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'proprio', label: 'âœ… Serviço Próprio' },
                { value: 'terceirizado_saida', label: 'Terceirizado (passamos)' },
                { value: 'terceirizado_entrada', label: 'Recebido de parceiro' },
              ].map(s => (
                <button key={s.value} type="button" onClick={() => setServiceType(s.value as ServiceType)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${serviceType === s.value ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
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
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
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
                <div className="col-span-2">Qtd.</div><div className="col-span-6">Descrição</div>
                <div className="col-span-2">Vlr. Unit.</div><div className="col-span-1">Total</div><div className="col-span-1"></div>
              </div>
              {items.map(item => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2">
                    <input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                      className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div className="col-span-6">
                    <input type="text" value={item.description} placeholder="Descrição" onChange={e => updateItem(item.id, 'description', e.target.value)}
                      className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', Number(e.target.value))}
                      className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div className="col-span-1 text-sm text-slate-700 font-medium text-center">{(item.quantity * item.unit_price).toFixed(2)}</div>
                  <div className="col-span-1 flex justify-center">
                    <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-orange-500 text-sm font-medium mt-2">
                <Plus className="w-4 h-4" /> Adicionar item
              </button>
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
              <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
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
        <Link href="/dashboard/chamados"
          className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
          Cancelar
        </Link>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar Chamado'}
        </button>
      </div>
    </form>
  )
}

