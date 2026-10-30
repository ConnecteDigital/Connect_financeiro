'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Save, Loader2, CalendarDays, Plus, Trash2, Navigation, X } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { getCall, updateCall } from '@/lib/db/calls'
import { createServiceOrder, updateServiceOrder, replaceServiceOrderAuxiliaries, syncOsAutoExpenses } from '@/lib/db/service-orders'
import { getTeams } from '@/lib/db/teams'
import { getClients } from '@/lib/db/clients'
import { getServiceTypes } from '@/lib/db/service-types'
import { getAuxiliaries, createAuxiliary } from '@/lib/db/auxiliaries'
import { createClient } from '@/lib/supabase/client'
import { useCallOrigins } from '@/lib/use-call-origins'
import { useTenant } from '@/lib/tenant-context'
import { getServiceConfig, APPLIANCE_BRANDS, APPLIANCE_TYPES, rodriguesServiceLabel } from '@/lib/service-config'
import RodriguesApplianceSection from '@/components/RodriguesApplianceSection'
import { mapsUrl } from '@/lib/maps'
import { lookupCep } from '@/lib/cep'
import { getRecentVisitFees, addRecentVisitFee } from '@/lib/recent-visit-fees'
import { getStockItems, getServiceOrderParts, addServiceOrderParts, adjustStockQuantity, restorePreviousServiceOrderParts } from '@/lib/db/stock'
import { navigationAddress } from '@/lib/address'
import StockPartPicker from '@/components/StockPartPicker'
import AddressExtraFields from '@/components/AddressExtraFields'
import RodriguesCardFields from '@/components/RodriguesCardFields'

type ServiceType = 'proprio' | 'terceirizado_saida' | 'terceirizado_entrada'
type PaymentStatus = 'pago' | 'pago_parcial' | 'pendente'

interface ServiceLine {
  category: string
  sub: string | null
  quantity: number
  unitPrice: number
  notes: string
  flatPrice?: boolean
  flatValue?: number
}

const CALL_STATUSES = [
  { value: 'agendado', label: 'Agendado' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'nao_aprovou', label: 'Não aprovou' },
  { value: 'nao_quis_visita', label: 'Não quis visita' },
  { value: 'cancelado', label: 'Cancelado' },
]

const CALL_STATUSES_RODRIGUES = [
  { value: 'agendado', label: 'Agendado' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'nao_aprovou', label: 'Não aprovou' },
  { value: 'pagou_somente_visita', label: 'Pagou somente a visita' },
]

const PAYMENT_METHODS = ['Dinheiro', 'Cartão', 'PIX', 'Boleto']
const AUX_TYPE_LABEL: Record<string, string> = { dono: 'Dono', tecnico: 'Técnico', auxiliar: 'Auxiliar' }
const AUX_TYPE_STYLE: Record<string, { background: string; color: string }> = {
  dono: { background: 'rgba(139,92,246,0.15)', color: '#7c3aed' },
  tecnico: { background: 'rgba(249,115,22,0.15)', color: '#f97316' },
  auxiliar: { background: 'rgba(8,145,178,0.15)', color: '#0891b2' },
}

interface SelectedAuxiliary {
  auxiliary_id: string
  name: string
  type: string
  percentage: number
}

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
  const { tenant, isTecnico } = useTenant()
  const commissionsEnabled = tenant?.enable_commissions ?? false
  const isMillenium = tenant?.call_form_config?.millenium_custom_os === true
  const isRodrigues = tenant?.call_form_config?.rodrigues_custom === true
  const callStatusOptions = isRodrigues ? CALL_STATUSES_RODRIGUES : CALL_STATUSES

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
  const [addressExtra, setAddressExtra] = useState({ number: '', complement: '', reference: '' })
  const [callCity, setCallCity] = useState('')
  const [callNeighborhood, setCallNeighborhood] = useState('')
  const [callCep, setCallCep] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState(false)
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
  const [hasGuarantee6m, setHasGuarantee6m] = useState(false)
  const [hasGuarantee1y, setHasGuarantee1y] = useState(false)
  const [hasNoGuarantee, setHasNoGuarantee] = useState(false)
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
  const [installments, setInstallments] = useState(1)
  const [cardNetValue, setCardNetValue] = useState<number | null>(null)
  const [osNumber, setOsNumber] = useState('')
  const [partnerName, setPartnerName] = useState('')
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
  const [partsCost, setPartsCost] = useState(0)
  const [applianceType, setApplianceType] = useState('')
  const [rodService, setRodService] = useState('')
  const [originalServiceCategory, setOriginalServiceCategory] = useState('')
  const [deviceBrand, setDeviceBrand] = useState('')
  const [technicianId, setTechnicianId] = useState('')
  const [callDriverName, setCallDriverName] = useState('')
  const [deviceBrandOther, setDeviceBrandOther] = useState('')
  const [visitFee, setVisitFee] = useState(0)
  const [recentVisitFees, setRecentVisitFees] = useState<number[]>([])
  const [stockItems, setStockItems] = useState<any[]>([])
  const [stockLines, setStockLines] = useState<{ stock_item_id: string; item_name: string; quantity: number; unit_value: number; total_value: number }[]>([])

  useEffect(() => {
    if (isRodrigues) setRecentVisitFees(getRecentVisitFees())
  }, [isRodrigues])

  useEffect(() => {
    Promise.all([getCall(id), getClients(), getTeams(), getServiceTypes(), getAuxiliaries(), getStockItems()]).then(([call, cls, tms, sts, auxs, stock]) => {
      setClients(cls)
      setTeams(tms)
      setAuxiliaries(auxs)
      setStockItems(stock)
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
      setAddressExtra({ number: call.address_number ?? '', complement: call.address_complement ?? '', reference: call.address_reference ?? '' })
      if (call.device_brand) {
        setDeviceBrand(APPLIANCE_BRANDS.includes(call.device_brand) ? call.device_brand : 'Outra')
        if (!APPLIANCE_BRANDS.includes(call.device_brand)) setDeviceBrandOther(call.device_brand)
      }
      setApplianceType(call.appliance_type ?? '')
      setTechnicianId(call.technician_id ?? '')
      setCallDriverName(call.driver ?? '')
      setVisitFee(Number(call.visit_fee ?? 0))
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
        setAuxiliaryId(so.auxiliary_id ?? (isRodrigues ? call.technician_id ?? '' : ''))
        setOsNumber(so.os_number ?? '')
        setCardNetValue(so.card_net_value ?? null)
        const soAuxs = (so.service_order_auxiliaries ?? []) as any[]
        if (soAuxs.length > 0) {
          setSelectedAuxiliaries(soAuxs.map(a => ({
            auxiliary_id: a.auxiliary_id,
            name: a.auxiliary?.name ?? '—',
            type: a.auxiliary?.type ?? 'tecnico',
            percentage: Number(a.percentage),
          })))
        }
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
        setHasGuarantee6m(so.has_guarantee_6m ?? false)
        setHasGuarantee1y(so.has_guarantee_1y ?? false)
        setHasNoGuarantee(so.has_no_guarantee ?? false)
        getServiceOrderParts(so.id).then((parts: any[]) => {
          const lines = parts.map(p => ({
            stock_item_id: p.stock_item_id,
            item_name: p.item_name,
            quantity: Number(p.quantity),
            unit_value: Number(p.unit_value),
            total_value: Number(p.total_value),
          }))
          setStockLines(lines)
          const stockTotal = lines.reduce((s, l) => s + l.total_value, 0)
          setPartsCost(Math.max(0, Number(so.parts_cost ?? 0) - stockTotal))
        }).catch(console.error)
        setTeamId(so.team_id ?? '')
        setTeamName(so.team_name ?? '')
        setDriver(so.driver ?? '')
        setNfNumber(so.nf_number ?? '')
        setVehicle(so.vehicle ?? '')
        setDueDate(so.due_date ?? '')
        setPaymentMethod(so.payment_method ?? '')
        setPaymentMethodsMulti(so.payment_method ? String(so.payment_method).split(',').map((s: string) => s.trim()).filter(Boolean) : [])
        setCardType(so.card_type ?? '')
        setCardFeePct(Number(so.card_fee_pct ?? 0))
        setInstallments(Number(so.installments ?? 1))
        setPartnerName(so.partner_name ?? '')
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
          const isFlatPrice = String(item.description ?? '').includes('(valor fechado)')
          lines.push({
            category,
            sub,
            quantity: isFlatPrice ? 0 : Number(item.quantity),
            unitPrice: isFlatPrice ? 0 : Number(item.unit_price),
            notes: item.notes ?? '',
            flatPrice: isFlatPrice || undefined,
            flatValue: isFlatPrice ? Number(item.unit_price) : undefined,
          })
        }
      } else if (isRodrigues) {
        // Nova OS: técnico da OS = técnico responsável do chamado
        setAuxiliaryId(call.technician_id ?? '')
      } else if (commissionsEnabled) {
        // Nova OS: auto-adiciona o dono padrão como auxiliar
        const defaultDono = auxs.find((a: any) => a.type === 'dono' && a.is_default)
        if (defaultDono) {
          setSelectedAuxiliaries([{
            auxiliary_id: defaultDono.id,
            name: defaultDono.name,
            type: 'dono',
            percentage: Number(defaultDono.percentage),
          }])
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
          } else if (!getServiceConfig(cat, isMillenium)?.subOptions) {
            lines.push({ category: cat, sub: null, quantity: 0, unitPrice: 0, notes: '' })
          }
        }
        // Nada reconhecido: mantém o texto antigo como categoria avulsa
        if (selected.length === 0) {
          selected.push(call.service_category)
          lines.push({ category: call.service_category, sub: null, quantity: 0, unitPrice: 0, notes: '' })
        }
      }

      setOriginalServiceCategory(call.service_category ?? '')
      if (isRodrigues) {
        // Rodrigues: aparelho vem de appliance_type; o serviço é a categoria
        // da linha quando ela for um serviço cadastrado (e não o aparelho)
        const appliance = call.appliance_type ?? ''
        const first = lines[0]
        const svc = first && typeNames.includes(first.category) && !APPLIANCE_TYPES.includes(first.category) ? first.category : ''
        setRodService(svc)
        if (appliance || svc) {
          setSelectedCategories([appliance || svc])
          setServiceLines([{
            ...(first ?? { quantity: 0, unitPrice: 0, notes: '' }),
            category: svc || appliance, sub: null, flatPrice: true,
          }])
        } else {
          setSelectedCategories(selected)
          setServiceLines(lines)
        }
      } else {
        setSelectedCategories(selected)
        setServiceLines(lines)
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [id, commissionsEnabled, isRodrigues])

  // ── Serviços ──
  const lineTotal = (l: ServiceLine) => l.flatPrice ? (l.flatValue ?? 0) : l.quantity * l.unitPrice
  const subtotal = serviceLines.reduce((sum, l) => sum + lineTotal(l), 0)
  const bruto = subtotal + equipmentRentalValue - discount + taxes

  const osTecnicoId = isTecnico ? technicianId : (auxiliaryId || technicianId)
  const availableStockItems = stockItems.filter(i => (i.auxiliary_id ?? null) === (osTecnicoId || null))
  const stockPartsTotal = stockLines.reduce((s, l) => s + l.total_value, 0)
  const partsCostTotal = stockPartsTotal + partsCost

  function addStockLine(item: { id: string; name: string; unit_value: number | string }, quantity: number) {
    setStockLines(prev => [...prev, {
      stock_item_id: item.id,
      item_name: item.name,
      quantity,
      unit_value: Number(item.unit_value),
      total_value: quantity * Number(item.unit_value),
    }])
  }

  function removeStockLine(idx: number) {
    setStockLines(prev => prev.filter((_, i) => i !== idx))
  }
  const isOutsourced = serviceType !== 'proprio'
  const liquidoParceria = isOutsourced ? bruto * partnerPct / 100 : bruto

  // Rodrigues sempre usa um técnico só por OS (comissão calculada no banco)
  const useMultiAux = !isRodrigues && (commissionsEnabled || isMillenium)

  // Single aux (commissions disabled)
  const selectedAux = auxiliaries.find(a => a.id === auxiliaryId)
  const auxValue = selectedAux ? bruto * Number(selectedAux.percentage) / 100 : 0

  // Multi aux (commissions enabled)
  const totalAuxValue = selectedAuxiliaries.reduce((s, a) => s + bruto * a.percentage / 100, 0)

  const liquidoFinal = useMultiAux
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

  // Millenium: digita o nome livremente — reaproveita auxiliar existente ou cadastra um novo
  const [freeAuxName, setFreeAuxName] = useState('')
  const [freeAuxPct, setFreeAuxPct] = useState('')
  const [addingFreeAux, setAddingFreeAux] = useState(false)

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

  function toggleCategory(name: string) {
    const cfg = getServiceConfig(name, isMillenium)
    if (selectedCategories.includes(name)) {
      setSelectedCategories(prev => prev.filter(c => c !== name))
      setServiceLines(prev => prev.filter(l => l.category !== name))
    } else {
      setSelectedCategories(prev => [...prev, name])
      if (isRodrigues || !cfg?.subOptions) {
        setServiceLines(prev => [...prev, { category: name, sub: null, quantity: 0, unitPrice: 0, notes: '', flatPrice: isRodrigues || undefined }])
      }
    }
  }

  function toggleSub(category: string, sub: string) {
    setServiceLines(prev => {
      const exists = prev.some(l => l.category === category && l.sub === sub)
      return exists
        ? prev.filter(l => !(l.category === category && l.sub === sub))
        : [...prev, { category, sub, quantity: 0, unitPrice: 0, notes: '', flatPrice: isRodrigues || undefined }]
    })
  }

  const updateLine = (category: string, sub: string | null, patch: Partial<ServiceLine>) =>
    setServiceLines(prev => prev.map(l => l.category === category && l.sub === sub ? { ...l, ...patch } : l))

  function setRodriguesSelection(appliance: string, service: string) {
    setApplianceType(appliance)
    setRodService(service)
    if (!appliance) {
      setSelectedCategories([])
      setServiceLines([])
      return
    }
    setSelectedCategories([appliance])
    setServiceLines(prev => [{
      ...(prev[0] ?? { quantity: 0, unitPrice: 0, notes: '' }),
      category: service || appliance, sub: null, flatPrice: true,
    }])
  }

  const rodriguesText = rodriguesServiceLabel(applianceType, deviceBrand === 'Outra' ? deviceBrandOther : deviceBrand, rodService)
  const serviceCategoryText = isRodrigues
    // chamado antigo sem aparelho nem serviço reconhecido: mantém o texto que já tinha
    ? ((applianceType || rodService) ? rodriguesText : originalServiceCategory)
    : selectedCategories.map(cat => {
    const subs = serviceLines.filter(l => l.category === cat && l.sub).map(l => l.sub)
    return subs.length ? `${cat} (${subs.join(', ')})` : cat
  }).join(', ')

  function handleStatusChange(status: string) {
    setCallStatus(status)
    setIsApproved(status === 'aprovado')
    setIsScheduled(status === 'agendado')
  }

  async function handleCepChange(value: string) {
    setCallCep(value)
    setCepError(false)
    const digits = value.replace(/\D/g, '')
    if (!isRodrigues || digits.length !== 8) return
    setCepLoading(true)
    try {
      const result = await lookupCep(digits)
      if (result) {
        setCallAddress(result.address)
        setCallNeighborhood(result.neighborhood)
        setCallCity(result.city)
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
        ...(isRodrigues ? {
          device_brand: (deviceBrand === 'Outra' ? deviceBrandOther : deviceBrand) || null,
          appliance_type: applianceType || null,
          visit_fee: visitFee > 0 ? visitFee : null,
          // Técnico não troca o responsável do chamado (só o dono)
          ...(isTecnico ? {} : {
            technician_id: technicianId || auxiliaryId || null,
            driver: callDriverName || null,
          }),
          address_number: addressExtra.number || null,
          address_complement: addressExtra.complement || null,
          address_reference: addressExtra.reference || null,
        } : {}),
      })
      if (isRodrigues && visitFee > 0) addRecentVisitFee(visitFee)

      // 2. Se aprovado, criar ou atualizar OS
      if (isApproved) {
        // Login de técnico: a OS fica sempre no nome dele (o técnico do chamado)
        const tecnicoAux = isTecnico ? auxiliaries.find(a => a.id === technicianId) : null
        const primaryAuxId = useMultiAux
          ? (selectedAuxiliaries[0]?.auxiliary_id ?? null)
          : isTecnico ? (technicianId || null) : (auxiliaryId || null)
        const primaryAuxValue = useMultiAux
          ? (selectedAuxiliaries[0] ? bruto * selectedAuxiliaries[0].percentage / 100 : 0)
          : isTecnico ? (tecnicoAux ? bruto * Number(tecnicoAux.percentage) / 100 : 0) : auxValue

        const orderData = {
          call_id: id,
          date: callDate,
          client_id: clientId || null,
          team_id: isMillenium ? null : (teamId || null),
          team_name: isMillenium ? (teamName || null) : null,
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
          has_guarantee_6m: hasGuarantee6m,
          has_guarantee_1y: hasGuarantee1y,
          has_no_guarantee: hasNoGuarantee,
          equipment_rental_value: equipmentRentalValue,
          subtotal,
          discount,
          parts_cost: isRodrigues ? partsCostTotal : 0,
          taxes,
          total_value: bruto,
          outsource_profit_pct: partnerPct,
          own_material_cost: materialCost,
          own_fuel_cost: ownFuelCost,
          own_other_cost: ownOtherCost,
          other_service_value: otherServiceValue,
          payment_method: isMillenium
            ? (paymentMethodsMulti.length > 0 ? paymentMethodsMulti.join(', ') : null)
            : (paymentMethod || null),
          card_type: (isMillenium || isRodrigues) ? (cardType || null) : null,
          card_fee_pct: isMillenium ? cardFeePct : 0,
          installments: isRodrigues && cardType === 'credito' ? installments : null,
          ...(isRodrigues ? { card_net_value: paymentMethod === 'Cartão' ? cardNetValue : null } : {}),
          partner_name: isMillenium ? (partnerName || null) : null,
          payment_status: paymentStatus,
          amount_paid: amountPaid,
          remaining_amount: remainingAmount,
          remaining_due_date: remainingDueDate || null,
          conditions: conditions || null,
          observations: observations || null,
        }

        const validItems = serviceLines.map(l => ({
          quantity: l.flatPrice ? 1 : (l.quantity || 1),
          description: l.category + (l.sub ? ` — ${l.sub}` : '') + (l.flatPrice ? ' (valor fechado)' : ''),
          unit_price: l.flatPrice ? (l.flatValue ?? 0) : l.unitPrice,
          category: l.category,
          sub_options: l.sub,
          notes: l.notes || null,
        }))

        let soId = existingSoId
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
          const order = await createServiceOrder(orderData, validItems)
          soId = order.id
        }

        if (isRodrigues && soId) {
          // Desfaz as peças registradas antes (devolve ao estoque) e grava a lista atual,
          // pra edições não descontarem em dobro do estoque
          await restorePreviousServiceOrderParts(soId)
          if (stockLines.length > 0) {
            await addServiceOrderParts(soId, stockLines)
            await Promise.all(stockLines.map(l => adjustStockQuantity(l.stock_item_id, -l.quantity)))
          }
          await syncOsAutoExpenses(soId)
        }

        // Salvar múltiplos auxiliares (comissões)
        if (useMultiAux && soId) {
          await replaceServiceOrderAuxiliaries(
            soId,
            selectedAuxiliaries.map(a => ({
              auxiliary_id: a.auxiliary_id,
              percentage: a.percentage,
              amount: bruto * a.percentage / 100,
            }))
          )
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
            {callStatusOptions.map(s => (
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

        {isRodrigues && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">CEP</label>
            <div className="relative">
              <input type="text" value={callCep} onChange={e => handleCepChange(e.target.value)}
                placeholder="00000-000" maxLength={9}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              {cepLoading && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-orange-400" />}
            </div>
            {cepError && <p className="text-xs text-red-500 mt-1">CEP não encontrado — preencha o endereço manualmente.</p>}
            {!cepError && <p className="text-xs text-slate-400 mt-1">Digite o CEP e o endereço é preenchido automaticamente.</p>}
          </div>
        )}

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

        {isRodrigues && (isScheduled || callStatus === 'pagou_somente_visita') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Valor da Visita (R$)</label>
            <input type="number" min="0" step="0.01" value={visitFee || ''} onChange={e => setVisitFee(Number(e.target.value))}
              placeholder="0,00"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            {recentVisitFees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {recentVisitFees.map(v => (
                  <button key={v} type="button" onClick={() => setVisitFee(v)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${visitFee === v ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'}`}>
                    R$ {v.toFixed(2)}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">Cobrado mesmo que o cliente não aprove o serviço.</p>
          </div>
        )}

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
                  placeholder={isRodrigues ? 'Rua' : 'Rua, número, bairro, cidade'}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
                {isRodrigues && (
                  <div className="mt-3">
                    <AddressExtraFields {...addressExtra} inputClassName="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                      onChange={(f, v) => setAddressExtra(p => ({ ...p, [f]: v }))} />
                  </div>
                )}
                {isRodrigues && callAddress && (
                  <a href={mapsUrl(navigationAddress({ address: callAddress, number: addressExtra.number, neighborhood: callNeighborhood, city: callCity }))}
                    target="_blank" rel="noopener noreferrer"
                    className="mt-2 flex items-center justify-center gap-2 text-sm font-bold px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition shadow-sm">
                    <Navigation className="w-4 h-4" />
                    Abrir no Waze
                  </a>
                )}
              </div>
              {isRodrigues && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Técnico Responsável</label>
                  {isTecnico ? (
                    <p className="px-3 py-2.5 rounded-lg bg-white border border-slate-100 text-sm text-slate-700">{callDriverName || '—'}</p>
                  ) : (
                  <select value={technicianId} onChange={e => {
                    const aux = auxiliaries.find(a => a.id === e.target.value)
                    setTechnicianId(e.target.value)
                    setCallDriverName(aux?.name ?? '')
                  }}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                    <option value="">Selecione o técnico...</option>
                    {auxiliaries.filter(a => a.type === 'tecnico').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tipo(s) de serviço — seção única */}
        {isRodrigues ? (
          <RodriguesApplianceSection
            appliance={applianceType}
            onApplianceChange={a => setRodriguesSelection(a, a ? rodService : '')}
            brand={deviceBrand} setBrand={setDeviceBrand}
            brandOther={deviceBrandOther} setBrandOther={setDeviceBrandOther}
            serviceNames={categoryNames}
            service={rodService}
            onServiceChange={sv => setRodriguesSelection(applianceType, sv)}
            line={serviceLines[0]}
            onLineChange={patch => setServiceLines(prev => prev.map((l, i) => i === 0 ? { ...l, ...patch } : l))}
            showValues={isApproved}
            inputCls="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        ) : (
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
            const cfg = getServiceConfig(cat, isMillenium)
            const catLines = serviceLines.filter(l => l.category === cat)
            return (
              <div key={cat} className="border border-orange-100 bg-orange-50/40 rounded-lg p-3 mt-2 space-y-3">
                <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{cat}</p>
                {!isRodrigues && cfg?.subOptions && (
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

                    {/* Toggle valor fechado / por quantidade */}
                    {!isRodrigues && cfg?.allowFlatPrice && (
                      <div className="flex gap-2">
                        <button type="button"
                          onClick={() => updateLine(l.category, l.sub, { flatPrice: false })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${!l.flatPrice ? 'text-white border-transparent bg-orange-500' : 'bg-white text-slate-500 border-slate-200'}`}>
                          Por {cfg.qtyLabel.toLowerCase().includes('litro') ? 'litro' : 'quantidade'}
                        </button>
                        <button type="button"
                          onClick={() => updateLine(l.category, l.sub, { flatPrice: true })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${l.flatPrice ? 'text-white border-transparent bg-orange-500' : 'bg-white text-slate-500 border-slate-200'}`}>
                          Valor fechado
                        </button>
                      </div>
                    )}

                    {l.flatPrice ? (
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Valor Total do Serviço (R$)</label>
                        <input type="number" min="0" step="0.01" value={l.flatValue || ''}
                          onChange={e => updateLine(l.category, l.sub, { flatValue: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                        {(l.flatValue ?? 0) > 0 && (
                          <p className="text-sm font-bold mt-1 text-orange-600">Total: R$ {(l.flatValue ?? 0).toFixed(2)}</p>
                        )}
                      </div>
                    ) : (
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
                    )}

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
        )}

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
              Ordem de Serviço {existingSoId && <span className="text-orange-500 font-mono text-sm ml-1">({isRodrigues && osNumber ? `Nº da OS ${osNumber}` : 'editando OS existente'})</span>}
            </h2>

            {isRodrigues ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Técnico</label>
                {isTecnico ? (
                  <p className="px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100 text-sm text-slate-700">
                    {auxiliaries.find(a => a.id === technicianId)?.name ?? callDriverName ?? '—'}
                  </p>
                ) : (
                  <select value={auxiliaryId} onChange={e => setAuxiliaryId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="">Selecione o técnico...</option>
                    {auxiliaries.filter(a => a.type === 'tecnico').map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({Number(a.percentage)}% de comissão)</option>
                    ))}
                  </select>
                )}
                {!existingSoId && <p className="text-xs text-slate-400 mt-1">O número da OS é gerado automaticamente ao salvar.</p>}
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Equipe</label>
                {isMillenium ? (
                  <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)}
                    placeholder="Digite o nome da equipe..."
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                ) : (
                  <select value={teamId} onChange={e => setTeamId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="">Selecione...</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
              </div>
              {!useMultiAux && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Auxiliar</label>
                  <select value={auxiliaryId} onChange={e => setAuxiliaryId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="">Sem auxiliar</option>
                    {auxiliaries.map(a => <option key={a.id} value={a.id}>{a.name} ({Number(a.percentage)}%)</option>)}
                  </select>
                </div>
              )}
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
            )}

            {/* Múltiplos auxiliares (comissões habilitadas) */}
            {useMultiAux && (
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
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={AUX_TYPE_STYLE[a.type] ?? AUX_TYPE_STYLE.tecnico}>
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

                {isMillenium ? (
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
                ) : availableAuxToAdd.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select value={addingAuxId} onChange={e => setAddingAuxId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                      <option value="">Selecionar auxiliar...</option>
                      {availableAuxToAdd.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} — {AUX_TYPE_LABEL[a.type] ?? 'Técnico'} ({Number(a.percentage)}%)
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
                <div>
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
                  {isRodrigues && paymentMethod === 'Cartão' && (
                    <RodriguesCardFields cardType={cardType} setCardType={setCardType}
                      installments={installments} setInstallments={setInstallments}
                      netValue={cardNetValue} setNetValue={setCardNetValue} bruto={bruto} />
                  )}
                </div>
              )}
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
            {isMillenium && serviceType !== 'proprio' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {serviceType === 'terceirizado_entrada' ? 'Recebido de quem?' : 'Passado para quem?'}
                </label>
                <input type="text" value={partnerName} onChange={e => setPartnerName(e.target.value)}
                  placeholder="Ex: Alan..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            )}
            {serviceType === 'proprio' && isRodrigues ? (
              <>
                <div className="sm:max-w-xs">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Material (R$)</label>
                  <input type="number" min="0" step="0.01" value={materialCost || ''} onChange={e => setMaterialCost(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Descrição do serviço</label>
                  <textarea rows={3} value={observations} onChange={e => setObservations(e.target.value)}
                    placeholder="O que foi feito no aparelho... (aparece na OS)"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
                </div>
              </>
            ) : serviceType === 'proprio' ? (
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
            {isRodrigues && (
              <div className="border border-orange-100 bg-orange-50/40 rounded-xl p-3 space-y-2 my-1">
                <p className="text-xs font-bold text-orange-600">Peças Utilizadas</p>
                {stockLines.length > 0 && (
                  <div className="space-y-1.5">
                    {stockLines.map((l, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white border border-orange-100 rounded-lg px-2.5 py-1.5 text-xs">
                        <span className="text-slate-700">{l.quantity}x {l.item_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">R$ {l.total_value.toFixed(2)}</span>
                          <button type="button" onClick={() => removeStockLine(idx)} className="text-red-400 hover:text-red-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {availableStockItems.length > 0 ? (
                  <StockPartPicker items={availableStockItems} onAdd={addStockLine} />
                ) : (
                  <p className="text-xs text-slate-400">
                    {osTecnicoId ? 'Esse técnico não tem peças cadastradas no estoque.' : 'A loja não tem peças cadastradas no estoque.'}
                  </p>
                )}
                <div className="flex justify-between text-sm items-center pt-1 border-t border-orange-100">
                  <span className="text-slate-600">Outro custo de peça não cadastrada (R$)</span>
                  <input type="number" min="0" step="0.01" value={partsCost || ''} onChange={e => setPartsCost(Number(e.target.value))}
                    className="w-24 px-2 py-1 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
            )}
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
            {!useMultiAux && selectedAux && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Auxiliar {selectedAux.name} ({Number(selectedAux.percentage)}%)</span>
                <span className="font-semibold text-red-500">− R$ {auxValue.toFixed(2)}</span>
              </div>
            )}
            {useMultiAux && selectedAuxiliaries.map(a => {
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
            {(isOutsourced || (useMultiAux ? selectedAuxiliaries.length > 0 : selectedAux)) && (
              <div className="flex justify-between text-base font-bold border-t border-slate-100 pt-2">
                <span className="text-slate-800">Valor Líquido</span>
                <span className="text-emerald-600">R$ {liquidoFinal.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Levantamento */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">{isRodrigues ? 'Garantia' : 'Levantamento'}</h2>
            {isRodrigues ? (
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '90 dias', val: hasGuarantee90, set: setHasGuarantee90 },
                  { label: '6 meses', val: hasGuarantee6m, set: setHasGuarantee6m },
                  { label: '1 ano', val: hasGuarantee1y, set: setHasGuarantee1y },
                  { label: 'Sem garantia', val: hasNoGuarantee, set: setHasNoGuarantee },
                ].map(opt => (
                  <button key={opt.label} type="button"
                    onClick={() => {
                      setHasGuarantee90(false); setHasGuarantee6m(false); setHasGuarantee1y(false); setHasNoGuarantee(false)
                      opt.set(true)
                    }}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition ${opt.val ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
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
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Condições de Pagamento</label>
              <input type="text" value={conditions} onChange={e => setConditions(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            {!isRodrigues && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Observações da OS</label>
                <textarea rows={2} value={observations} onChange={e => setObservations(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              </div>
            )}
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
