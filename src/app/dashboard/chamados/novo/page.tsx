'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Save, Loader2, CalendarDays, Camera, Paperclip, FileText, X, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createCall } from '@/lib/db/calls'
import { createServiceOrder, createServiceOrderAuxiliaries } from '@/lib/db/service-orders'
import { createExpense } from '@/lib/db/expenses'
import { getClients, createClient_ } from '@/lib/db/clients'
import { getTeams } from '@/lib/db/teams'
import { getAuxiliaries } from '@/lib/db/auxiliaries'
import { SERVICE_CATEGORIES, SERVICE_CONFIG } from '@/lib/service-config'
import { useCallOrigins } from '@/lib/use-call-origins'
import { useTenant } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/client'

type ServiceType = 'proprio' | 'terceirizado_saida' | 'terceirizado_entrada'
type PaymentStatus = 'pago' | 'pago_parcial' | 'pendente'

interface ServiceLine {
  category: string
  sub: string | null
  quantity: number
  unitPrice: number
  notes: string
}

interface SelectedAuxiliary {
  auxiliary_id: string
  name: string
  type: string
  percentage: number
}

const CALL_STATUSES = [
  { value: 'agendado', label: 'Agendado' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'nao_aprovou', label: 'Não aprovou' },
  { value: 'nao_quis_visita', label: 'Não quis visita' },
  { value: 'cancelado', label: 'Cancelado' },
]

const PAYMENT_METHODS = ['Dinheiro', 'Cartão', 'PIX', 'Boleto']

const emptyNewClient = { address: '', state: '' }

interface PendingFile { id: string; file: File; preview?: string }

export default function NovoChamadoPage() {
  const router = useRouter()
  const { tenant } = useTenant()
  const commissionsEnabled = tenant?.enable_commissions ?? false
  const isSimplified = tenant?.call_form_config?.simplified === true
  const [selectedCategory, setSelectedCategory] = useState('')
  const serviceCategory = selectedCategory
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [auxiliaries, setAuxiliaries] = useState<any[]>([])
  const { origins: callOrigins } = useCallOrigins()
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Data local (toISOString retorna UTC — em horário tardio do Brasil mostraria amanhã)
  const localToday = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // Chamado básico
  const [callDate, setCallDate] = useState(localToday)
  const [callTime, setCallTime] = useState('')
  const [callChannel, setCallChannel] = useState('')
  const [origin, setOrigin] = useState('')
  const [callStatus, setCallStatus] = useState('agendado')
  const [callNotes, setCallNotes] = useState('')
  const [clientId, setClientId] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactCpf, setContactCpf] = useState('')
  const [solicitante, setSolicitante] = useState('')
  const [callCity, setCallCity] = useState('')
  const [callNeighborhood, setCallNeighborhood] = useState('')
  const [newClient, setNewClient] = useState(emptyNewClient)
  const [scheduledDate, setScheduledDate] = useState(localToday)
  const [scheduledTime, setScheduledTime] = useState('')
  const [callAddress, setCallAddress] = useState('')
  const [scheduledDriver, setScheduledDriver] = useState('')

  const isApproved = callStatus === 'aprovado'
  const isScheduled = callStatus === 'agendado'

  // Serviços
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([])

  const isRepasse = selectedCategories.length === 1 && selectedCategories[0] === 'Reclamação'

  // OS
  const [serviceType, setServiceType] = useState<ServiceType>('proprio')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pendente')
  const [partnerPct, setPartnerPct] = useState(50)

  // Single auxiliary (commissions disabled)
  const [auxiliaryId, setAuxiliaryId] = useState('')

  // Multiple auxiliaries (commissions enabled)
  const [selectedAuxiliaries, setSelectedAuxiliaries] = useState<SelectedAuxiliary[]>([])
  const [addingAuxId, setAddingAuxId] = useState('')

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
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [amountPaid, setAmountPaid] = useState(0)
  const [remainingAmount, setRemainingAmount] = useState(0)
  const [remainingDueDate, setRemainingDueDate] = useState('')
  const [conditions, setConditions] = useState('')
  const [observations, setObservations] = useState('')
  const [materialCost, setMaterialCost] = useState(0)
  const [ownFuelCost, setOwnFuelCost] = useState(0)
  const [ownOtherCost, setOwnOtherCost] = useState(0)
  const [otherServiceValue, setOtherServiceValue] = useState(0)

  useEffect(() => {
    Promise.all([getClients(), getTeams(), getAuxiliaries()])
      .then(([c, t, aux]) => {
        setClients(c)
        setTeams(t)
        setAuxiliaries(aux)
        // Auto-add default dono when commissions enabled
        if (commissionsEnabled) {
          const defaultDono = aux.find((a: any) => a.type === 'dono' && a.is_default)
          if (defaultDono) {
            setSelectedAuxiliaries([{
              auxiliary_id: defaultDono.id,
              name: defaultDono.name,
              type: 'dono',
              percentage: Number(defaultDono.percentage),
            }])
          }
        }
      })
      .catch(console.error)
  }, [commissionsEnabled])

  // ── Value calculations ──
  const lineTotal = (l: ServiceLine) => l.quantity * l.unitPrice
  const subtotal = serviceLines.reduce((sum, l) => sum + lineTotal(l), 0)
  const bruto = subtotal + equipmentRentalValue - discount + taxes
  const isOutsourced = serviceType !== 'proprio'
  const liquidoParceria = isOutsourced ? bruto * partnerPct / 100 : bruto

  // Single aux (commissions disabled)
  const selectedAux = auxiliaries.find(a => a.id === auxiliaryId)
  const auxValue = selectedAux ? bruto * Number(selectedAux.percentage) / 100 : 0

  // Multi aux (commissions enabled)
  const totalAuxValue = selectedAuxiliaries.reduce((s, a) => s + bruto * a.percentage / 100, 0)

  const liquidoFinal = commissionsEnabled
    ? liquidoParceria - totalAuxValue
    : liquidoParceria - auxValue

  const availableAuxToAdd = auxiliaries.filter(a => !selectedAuxiliaries.some(s => s.auxiliary_id === a.id))

  function addAuxiliary() {
    if (!addingAuxId) return
    const aux = auxiliaries.find(a => a.id === addingAuxId)
    if (!aux) return
    setSelectedAuxiliaries(prev => [...prev, {
      auxiliary_id: aux.id,
      name: aux.name,
      type: aux.type ?? 'tecnico',
      percentage: Number(aux.percentage),
    }])
    setAddingAuxId('')
  }

  function removeAuxiliary(auxId: string) {
    setSelectedAuxiliaries(prev => prev.filter(a => a.auxiliary_id !== auxId))
  }

  function updateAuxPercentage(auxId: string, pct: number) {
    setSelectedAuxiliaries(prev => prev.map(a => a.auxiliary_id === auxId ? { ...a, percentage: pct } : a))
  }

  // ── Services ──
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

  const [clientSearch, setClientSearch] = useState('')
  const clientSuggestions = !clientId && clientSearch.trim().length >= 2
    ? clients.filter(c => {
        const q = clientSearch.trim().toLowerCase()
        const phoneQ = q.replace(/\D/g, '')
        return c.name.toLowerCase().includes(q)
          || (c.phone && c.phone.replace(/\D/g, '').includes(phoneQ) && phoneQ.length >= 3)
          || (c.address && c.address.toLowerCase().includes(q))
      }).slice(0, 6)
    : []
  const linkedClient = clients.find(c => c.id === clientId)

  function addFiles(fileList: FileList | null) {
    if (!fileList) return
    const newFiles: PendingFile[] = Array.from(fileList).map(file => {
      const id = Date.now().toString() + Math.random()
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      return { id, file, preview }
    })
    setPendingFiles(prev => [...prev, ...newFiles])
  }

  function removePendingFile(id: string) {
    setPendingFiles(prev => {
      const f = prev.find(f => f.id === id)
      if (f?.preview) URL.revokeObjectURL(f.preview)
      return prev.filter(f => f.id !== id)
    })
  }

  async function uploadPendingFiles(callId: string) {
    if (pendingFiles.length === 0) return
    const supabase = createClient()
    await Promise.all(pendingFiles.map(({ file }) => {
      const safeName = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${callId}/${Date.now()}_${safeName}`
      return supabase.storage.from('chamados-anexos').upload(path, file)
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contactName.trim() && !clientId) {
      setError('Informe o nome do contato ou selecione um cliente cadastrado.')
      return
    }
    if (!origin) {
      setError('Selecione a origem do chamado.')
      return
    }
    setSaving(true)
    setError('')
    try {
      let finalClientId = clientId
      if (!clientId && contactName.trim() && (callStatus === 'aprovado' || callStatus === 'agendado')) {
        try {
          const created = await createClient_({
            name: contactName.trim(),
            phone: contactPhone || null,
            cpf_cnpj: contactCpf || null,
            address: newClient.address || callAddress || null,
            neighborhood: callNeighborhood || null,
            city: callCity || null,
            state: newClient.state || null,
          })
          finalClientId = created.id
        } catch (clientErr) {
          console.warn('Não foi possível criar cliente automaticamente:', clientErr)
        }
      }

      const call = await createCall({
        date: callDate,
        call_time: callTime || null,
        call_channel: callChannel || null,
        client_id: finalClientId || null,
        contact_name: contactName || null,
        contact_phone: contactPhone || null,
        origin,
        status: callStatus,
        notes: callNotes || null,
        service_category: serviceCategoryText || null,
        scheduled_date: isScheduled ? scheduledDate || null : null,
        scheduled_time: isScheduled ? scheduledTime || null : null,
        call_address: callAddress || null,
        call_city: callCity || null,
        call_neighborhood: callNeighborhood || null,
        contact_cpf: contactCpf || null,
        solicitante: solicitante || null,
        driver: scheduledDriver || null,
      })

      if (isApproved) {
        await uploadPendingFiles(call.id)

        // Determine auxiliary_id / auxiliary_value for legacy column
        const primaryAuxId = commissionsEnabled
          ? (selectedAuxiliaries[0]?.auxiliary_id ?? null)
          : (auxiliaryId || null)
        const primaryAuxValue = commissionsEnabled
          ? (selectedAuxiliaries[0] ? bruto * selectedAuxiliaries[0].percentage / 100 : 0)
          : auxValue

        const orderData = {
          call_id: call.id,
          date: callDate,
          client_id: finalClientId || null,
          team_id: teamId || null,
          auxiliary_id: primaryAuxId,
          auxiliary_value: primaryAuxValue,
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
          payment_method: paymentMethods.length > 0 ? paymentMethods.join(', ') : null,
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
        const order = await createServiceOrder(orderData, validItems)

        // Save multiple auxiliaries when commissions enabled
        if (commissionsEnabled && selectedAuxiliaries.length > 0) {
          await createServiceOrderAuxiliaries(
            order.id,
            selectedAuxiliaries.map(a => ({
              auxiliary_id: a.auxiliary_id,
              percentage: a.percentage,
              amount: bruto * a.percentage / 100,
            }))
          )
        }

        // Auto-generate expenses when commissions enabled
        if (commissionsEnabled) {
          const expenseDate = callDate

          // Commission expense for each auxiliary (tecnico + dono)
          for (const aux of selectedAuxiliaries) {
            const amount = bruto * aux.percentage / 100
            if (amount > 0) {
              await createExpense({
                description: `Comissão — ${aux.name}`,
                category: 'Pessoal',
                amount,
                type: 'avulso',
                status: 'pendente',
                due_date: expenseDate,
                notes: `Auto: comissão de ${aux.percentage}% sobre R$ ${bruto.toFixed(2)} (OS automática)`,
                source_service_order_id: order.id,
                auxiliary_id: aux.auxiliary_id,
              })
            }
          }

          // Outsourced partner cost (what we pay to partner)
          if (serviceType === 'terceirizado_saida' && bruto > 0) {
            const partnerCost = bruto * (100 - partnerPct) / 100
            if (partnerCost > 0) {
              await createExpense({
                description: 'Custo Terceirizado',
                category: 'Operacional',
                amount: partnerCost,
                type: 'avulso',
                status: 'pendente',
                due_date: expenseDate,
                notes: `Auto: ${100 - partnerPct}% do bruto R$ ${bruto.toFixed(2)} pago ao parceiro`,
                source_service_order_id: order.id,
              })
            }
          }
        }
      }

      if (isScheduled) {
        router.push(`/dashboard/chamados/${call.id}`)
      } else {
        router.push('/dashboard/chamados')
      }
    } catch (err: any) {
      console.error(err)
      setError('Erro ao salvar chamado. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]'

  async function handleSimplifiedSubmit(targetStatus: 'agendado' | 'aprovado') {
    if (!origin) { setError('Selecione a origem do chamado.'); return }
    if (!contactName.trim()) { setError('Informe o nome do contato.'); return }
    setSaving(true); setError('')
    try {
      let simplifiedClientId: string | null = null
      if (contactName.trim()) {
        try {
          const created = await createClient_({
            name: contactName.trim(),
            phone: contactPhone || null,
            address: callAddress || null,
          })
          simplifiedClientId = created.id
        } catch (clientErr) {
          console.warn('Não foi possível criar cliente automaticamente:', clientErr)
        }
      }
      const call = await createCall({
        date: callDate,
        call_time: callTime || null,
        call_channel: callChannel || null,
        client_id: simplifiedClientId,
        contact_name: contactName || null,
        contact_phone: contactPhone || null,
        origin,
        status: targetStatus,
        notes: null,
        service_category: serviceCategory || null,
        scheduled_date: null,
        scheduled_time: null,
        call_address: callAddress || null,
        call_city: null,
        call_neighborhood: null,
        contact_cpf: null,
        solicitante: solicitante || null,
        driver: null,
      })
      if (targetStatus === 'aprovado') {
        router.push(`/dashboard/chamados/${call.id}/nova-os`)
      } else {
        router.push(`/dashboard/chamados/${call.id}`)
      }
    } catch (err: any) {
      console.error(err)
      setError('Erro ao salvar chamado. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (isSimplified) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/chamados" className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Novo Chamado</h1>
            <p className="text-slate-500 text-sm">Registre um novo chamado recebido</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
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

          {/* Canal */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Canal</label>
            <div className="flex gap-2">
              {[
                { value: 'whatsapp', label: '💬 WhatsApp' },
                { value: 'ligacao', label: '📞 Ligação' },
              ].map(ch => (
                <button key={ch.value} type="button" onClick={() => setCallChannel(prev => prev === ch.value ? '' : ch.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${callChannel === ch.value ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  style={callChannel === ch.value ? { background: 'var(--primary)' } : {}}>
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Data do Chamado *</label>
            <input type="date" required value={callDate} onChange={e => setCallDate(e.target.value)} className={inputCls} />
          </div>

          {/* Contato */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome do Contato *</label>
              <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                placeholder="Ex: João Silva" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefone</label>
              <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                placeholder="(51) 99999-9999" className={inputCls} />
            </div>
          </div>

          {/* Solicitante */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Solicitante
              <span className="text-slate-400 font-normal ml-1">(quem ligou para pedir o serviço)</span>
            </label>
            <input type="text" value={solicitante} onChange={e => setSolicitante(e.target.value)}
              placeholder="Ex: Maria (esposa do João), síndico..." className={inputCls} />
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Endereço</label>
            <input type="text" value={callAddress} onChange={e => setCallAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade..." className={inputCls} />
          </div>

          {/* Tipo de Serviço */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Serviço</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_CATEGORIES.map(cat => (
                <button key={cat} type="button" onClick={() => setSelectedCategory(prev => prev === cat ? '' : cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${selectedCategory === cat ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Action buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSimplifiedSubmit('agendado')}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-slate-700 text-white hover:bg-slate-800 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Salvar Chamado
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSimplifiedSubmit('aprovado')}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Criar OS
            </button>
          </div>
        </div>
      </div>
    )
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

        {/* Canal */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Canal</label>
          <div className="flex gap-2">
            {[
              { value: 'whatsapp', label: '💬 WhatsApp' },
              { value: 'ligacao', label: '📞 Ligação' },
              { value: 'cliente', label: '🏠 Cliente' },
              { value: 'indicacao', label: '🤝 Indicação' },
            ].map(ch => (
              <button key={ch.value} type="button" onClick={() => setCallChannel(prev => prev === ch.value ? '' : ch.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${callChannel === ch.value ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                style={callChannel === ch.value ? { background: 'var(--primary)' } : {}}>
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Status *</label>
          <div className="flex flex-wrap gap-2">
            {CALL_STATUSES.map(s => (
              <button key={s.value} type="button" onClick={() => setCallStatus(s.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${callStatus === s.value ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data + horário do chamado */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2 sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Data do Chamado *</label>
            <input type="date" required value={callDate} onChange={e => setCallDate(e.target.value)} className={inputCls} />
          </div>
          <div className="col-span-2 sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Horário do Chamado</label>
            <input type="time" value={callTime} onChange={e => setCallTime(e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* Buscar cliente existente */}
        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Buscar Cliente Existente
            <span className="text-slate-400 font-normal ml-1">(por nome, telefone ou endereço)</span>
          </label>
          <input type="text" value={clientSearch}
            onChange={e => setClientSearch(e.target.value)}
            placeholder="Digite nome, telefone ou endereço..."
            className={inputCls} />
          {clientSuggestions.length > 0 && (
            <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
              {clientSuggestions.map(c => (
                <button key={c.id} type="button"
                  onClick={() => {
                    setClientId(c.id)
                    setContactName(c.name)
                    if (c.phone) setContactPhone(c.phone)
                    if (c.cpf_cnpj) setContactCpf(c.cpf_cnpj)
                    if (c.city) setCallCity(c.city)
                    if (c.neighborhood) setCallNeighborhood(c.neighborhood)
                    if (c.address) setCallAddress(c.address)
                    setClientSearch('')
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{[c.phone, c.city, c.address].filter(Boolean).join(' · ')}</p>
                </button>
              ))}
            </div>
          )}
          {clientId && (
            <div className="mt-2 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <p className="text-sm text-emerald-700">✓ Vinculado: <span className="font-semibold">{linkedClient?.name}</span></p>
              <button type="button" onClick={() => { setClientId(''); setClientSearch('') }}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium underline">Desvincular</button>
            </div>
          )}
        </div>

        {/* Contato + telefone + CPF + solicitante */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nome do Contato *
              <span className="text-slate-400 font-normal ml-1">(quem vai ser atendido)</span>
            </label>
            <input type="text" value={contactName}
              onChange={e => { setContactName(e.target.value); if (clientId) setClientId('') }}
              placeholder="Ex: João Silva"
              className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefone</label>
            <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
              placeholder="(51) 99999-9999" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">CPF / CNPJ</label>
            <input type="text" value={contactCpf}
              onChange={e => { setContactCpf(e.target.value); if (clientId) setClientId('') }}
              placeholder="000.000.000-00" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Solicitante
              <span className="text-slate-400 font-normal ml-1">(quem ligou para pedir o serviço)</span>
            </label>
            <input type="text" value={solicitante} onChange={e => setSolicitante(e.target.value)}
              placeholder="Ex: Maria (esposa do João), síndico..."
              className={inputCls} />
          </div>
        </div>

        {!clientId && contactName.trim().length >= 2 && clientSuggestions.length === 0 && (
          <div className="border border-orange-100 bg-orange-50/50 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-orange-600">Cliente novo — será cadastrado automaticamente:</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Endereço (Rua, número)</label>
                <input type="text" value={newClient.address} onChange={e => setNewClient(p => ({ ...p, address: e.target.value }))}
                  placeholder="Rua, número"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">UF</label>
                <input type="text" maxLength={2} value={newClient.state} onChange={e => setNewClient(p => ({ ...p, state: e.target.value.toUpperCase() }))}
                  placeholder="RS"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
          </div>
        )}

        {!isScheduled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Cidade</label>
              <input type="text" value={callCity} onChange={e => setCallCity(e.target.value)} placeholder="Ex: Porto Alegre" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bairro</label>
              <input type="text" value={callNeighborhood} onChange={e => setCallNeighborhood(e.target.value)} placeholder="Ex: Centro" className={inputCls} />
            </div>
          </div>
        )}

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
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Técnico Responsável</label>
                <input type="text" value={scheduledDriver} onChange={e => setScheduledDriver(e.target.value)}
                  placeholder="Nome do técnico que vai atender"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
              </div>
            </div>
          </div>
        )}

        {/* Tipo(s) de serviço */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Tipo(s) de Serviço</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {SERVICE_CATEGORIES.map(name => (
              <button key={name} type="button" onClick={() => toggleCategory(name)}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition ${selectedCategories.includes(name) ? 'bg-orange-500 border-orange-500 text-white shadow-sm' : 'border-slate-200 text-slate-600 hover:border-orange-300 bg-white'}`}>
                {name}
              </button>
            ))}
          </div>
          {isRepasse && isScheduled && (
            <div className="rounded-lg px-4 py-2.5 text-xs text-blue-700 bg-blue-50 border border-blue-100">
              📋 Chamado de reclamação — não é necessário preencher detalhes de serviço agora.
            </div>
          )}

          {selectedCategories.map(cat => {
            const cfg = SERVICE_CONFIG[cat]
            const catLines = serviceLines.filter(l => l.category === cat)
            return (
              <div key={cat} className="border border-orange-200 bg-orange-50/40 rounded-xl p-4 mt-3 space-y-3">
                <p className="text-sm font-bold text-orange-600">{cat}</p>
                {cfg?.subOptions && (
                  <div className="flex flex-wrap gap-2">
                    {cfg.subOptions.map(sub => {
                      const active = catLines.some(l => l.sub === sub)
                      return (
                        <button key={sub} type="button" onClick={() => toggleSub(cat, sub)}
                          className={`px-3 py-2 rounded-xl text-sm font-medium border transition ${active ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300'}`}>
                          {sub}
                        </button>
                      )
                    })}
                  </div>
                )}
                {isApproved && catLines.map(l => (
                  <div key={l.sub ?? cat} className="bg-white border border-orange-100 rounded-xl p-3 space-y-3">
                    {l.sub && <p className="text-xs font-bold text-orange-500 uppercase tracking-wide">{l.sub}</p>}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">{cfg?.qtyLabel ?? 'Quantidade'}</label>
                        <input type="number" min="0" step="0.01" value={l.quantity || ''}
                          onChange={e => updateLine(l.category, l.sub, { quantity: Number(e.target.value) })}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">{cfg?.priceLabel ?? 'Valor (R$)'}</label>
                        <input type="number" min="0" step="0.01" value={l.unitPrice || ''}
                          onChange={e => updateLine(l.category, l.sub, { unitPrice: Number(e.target.value) })}
                          className={inputCls} />
                      </div>
                    </div>
                    {l.quantity > 0 && l.unitPrice > 0 && (
                      <p className="text-sm font-bold text-orange-600">Total: R$ {lineTotal(l).toFixed(2)}</p>
                    )}
                    <input type="text" value={l.notes}
                      onChange={e => updateLine(l.category, l.sub, { notes: e.target.value })}
                      placeholder="Descrição do serviço..."
                      className={inputCls} />
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Observações</label>
          <textarea rows={2} value={callNotes} onChange={e => setCallNotes(e.target.value)}
            placeholder="Anotações sobre o chamado..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
        </div>
      </div>

      {/* OS — só quando aprovado */}
      {isApproved && (
        <>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">Ordem de Serviço</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Equipe</label>
                <select value={teamId} onChange={e => setTeamId(e.target.value)} className={inputCls}>
                  <option value="">Selecione...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {/* Single auxiliary (commissions disabled) */}
              {!commissionsEnabled && (
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

            {/* Multiple auxiliaries (commissions enabled) */}
            {commissionsEnabled && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Auxiliares / Comissões</label>

                {selectedAuxiliaries.length > 0 && (
                  <div className="space-y-2">
                    {selectedAuxiliaries.map(a => {
                      const amount = bruto * a.percentage / 100
                      return (
                        <div key={a.auxiliary_id} className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-800">{a.name}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={a.type === 'dono'
                                  ? { background: 'rgba(139,92,246,0.15)', color: '#7c3aed' }
                                  : { background: 'rgba(249,115,22,0.15)', color: '#f97316' }
                                }>
                                {a.type === 'dono' ? 'Dono' : 'Técnico'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="number" min="0" max="100" step="0.1"
                              value={a.percentage}
                              onChange={e => updateAuxPercentage(a.auxiliary_id, Number(e.target.value))}
                              className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
                            <span className="text-xs text-slate-500">%</span>
                            <span className="text-sm font-semibold text-orange-600 w-24 text-right">
                              R$ {amount.toFixed(2)}
                            </span>
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

                {availableAuxToAdd.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select value={addingAuxId} onChange={e => setAddingAuxId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                      <option value="">Selecionar auxiliar...</option>
                      {availableAuxToAdd.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} — {a.type === 'dono' ? 'Dono' : 'Técnico'} ({Number(a.percentage)}%)
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={addAuxiliary} disabled={!addingAuxId}
                      className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition">
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </button>
                  </div>
                )}

                {selectedAuxiliaries.length === 0 && (
                  <p className="text-xs text-slate-400">Nenhum auxiliar adicionado</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Forma de Pagamento</label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button key={m} type="button" onClick={() => setPaymentMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${paymentMethods.includes(m) ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {m}
                  </button>
                ))}
              </div>
              {paymentMethods.length > 1 && (
                <p className="text-xs mt-1.5 text-orange-600 font-medium">{paymentMethods.join(' + ')}</p>
              )}
            </div>
          </div>

          {/* Tipo execução + custos */}
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
                      <input type="number" min="0" step="0.01" value={f.val || ''} onChange={e => f.set(Number(e.target.value))} className={inputCls} />
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
                {commissionsEnabled && serviceType === 'terceirizado_saida' && (
                  <p className="text-xs text-orange-600 mt-2">
                    Uma saída de R$ {(bruto * (100 - partnerPct) / 100).toFixed(2)} será gerada automaticamente para o custo do parceiro.
                  </p>
                )}
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

            {/* Single aux (commissions disabled) */}
            {!commissionsEnabled && selectedAux && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Auxiliar {selectedAux.name} ({Number(selectedAux.percentage)}%)</span>
                <span className="font-semibold text-red-500">− R$ {auxValue.toFixed(2)}</span>
              </div>
            )}

            {/* Multi aux (commissions enabled) */}
            {commissionsEnabled && selectedAuxiliaries.map(a => {
              const amt = bruto * a.percentage / 100
              return (
                <div key={a.auxiliary_id} className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    {a.type === 'dono' ? 'Dono' : 'Técnico'} {a.name} ({a.percentage}%)
                  </span>
                  <span className="font-semibold text-red-500">− R$ {amt.toFixed(2)}</span>
                </div>
              )
            })}

            {(isOutsourced || (commissionsEnabled ? selectedAuxiliaries.length > 0 : selectedAux)) && (
              <div className="flex justify-between text-base font-bold border-t border-slate-100 pt-2">
                <span className="text-slate-800">Valor Líquido</span>
                <span className="text-emerald-600">R$ {liquidoFinal.toFixed(2)}</span>
              </div>
            )}

            {commissionsEnabled && selectedAuxiliaries.length > 0 && (
              <p className="text-xs text-orange-500 mt-1">
                {selectedAuxiliaries.length} saída{selectedAuxiliaries.length > 1 ? 's' : ''} de comissão serão geradas automaticamente.
              </p>
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
              <input type="text" value={conditions} onChange={e => setConditions(e.target.value)} className={inputCls} />
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

          {/* Fotos e documentos */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">Fotos e Documentos</h2>
            <p className="text-xs text-slate-500">Anexe fotos do local ou documentos relacionados ao serviço. Ficam salvos na OS.</p>

            <div className="flex gap-3">
              <button type="button" onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 text-orange-600 rounded-xl text-sm font-medium hover:bg-orange-100 transition active:scale-95">
                <Camera className="w-4 h-4" /> Tirar Foto
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition active:scale-95">
                <Paperclip className="w-4 h-4" /> Anexar Arquivo
              </button>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
                onChange={e => addFiles(e.target.files)} />
              <input ref={fileInputRef} type="file" multiple className="hidden"
                onChange={e => addFiles(e.target.files)} />
            </div>

            {pendingFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {pendingFiles.map(f => (
                  <div key={f.id} className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    {f.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.preview} alt={f.file.name} className="w-full h-24 object-cover" />
                    ) : (
                      <div className="w-full h-24 flex flex-col items-center justify-center gap-1 text-slate-400 px-2">
                        <FileText className="w-7 h-7" />
                        <span className="text-xs truncate w-full text-center">{f.file.name}</span>
                      </div>
                    )}
                    <button type="button" onClick={() => removePendingFile(f.id)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
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
