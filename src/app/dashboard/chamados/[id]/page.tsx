'use client'

import { useEffect, useState, useRef } from 'react'
import { ArrowLeft, Phone, CheckCircle, XCircle, Clock, Edit, DollarSign, User, FileText, Wrench, Paperclip, Upload, Trash2, Download, Printer } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { getCall } from '@/lib/db/calls'
import { updateCall } from '@/lib/db/calls'
import { updateExpense } from '@/lib/db/expenses'
import { createClient } from '@/lib/supabase/client'

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  agendado: { label: 'Agendado', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
  aprovado: { label: 'Aprovado', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
  nao_quis_visita: { label: 'Não quis visita', color: 'text-slate-600', bg: 'bg-slate-100', icon: XCircle },
  cancelado: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
}

const originLabel: Record<string, string> = {
  site_lider: 'Site Líder',
  site_praja: 'Site Pra Já',
  indicacao: 'Indicação',
  terceirizado: 'Terceirizado',
}

const paymentBadge: Record<string, { label: string; color: string }> = {
  pago: { label: 'Pago', color: 'bg-emerald-100 text-emerald-700' },
  pago_parcial: { label: 'Pago parcialmente', color: 'bg-amber-100 text-amber-700' },
  pendente: { label: 'Pendente', color: 'bg-red-100 text-red-600' },
}

const serviceTypeLabel: Record<string, string> = {
  proprio: 'Serviço Próprio',
  terceirizado_saida: 'Terceirizado (passamos para parceiro)',
  terceirizado_entrada: 'Recebido de parceiro',
}

const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

export default function ChamadoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [call, setCall] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updatingPayment, setUpdatingPayment] = useState(false)
  const [attachments, setAttachments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getCall(id).then(setCall).catch(console.error).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    loadAttachments()
  }, [id])

  async function loadAttachments() {
    try {
      const supabase = createClient()
      const { data } = await supabase.storage.from('chamados-anexos').list(id, { sortBy: { column: 'created_at', order: 'desc' } })
      setAttachments(data ?? [])
    } catch { /* bucket pode não existir ainda */ }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const path = `${id}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('chamados-anexos').upload(path, file)
      if (error) throw error
      await loadAttachments()
    } catch (err: any) {
      alert('Erro ao fazer upload: ' + (err.message ?? 'Tente novamente'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeleteAttachment(name: string) {
    if (!confirm(`Remover o arquivo "${name}"?`)) return
    try {
      const supabase = createClient()
      await supabase.storage.from('chamados-anexos').remove([`${id}/${name}`])
      await loadAttachments()
    } catch (err: any) {
      alert('Erro ao remover arquivo')
    }
  }

  async function getDownloadUrl(name: string) {
    const supabase = createClient()
    const { data } = supabase.storage.from('chamados-anexos').getPublicUrl(`${id}/${name}`)
    window.open(data.publicUrl, '_blank')
  }

  async function updatePaymentStatus(soId: string, status: string) {
    setUpdatingPayment(true)
    try {
      const supabase = createClient()
      await supabase.from('service_orders').update({ payment_status: status }).eq('id', soId)
      const updated = await getCall(id)
      setCall(updated)
    } finally {
      setUpdatingPayment(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-48" />
        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-slate-100 rounded" />)}
        </div>
      </div>
    )
  }

  if (!call) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-slate-500">Chamado não encontrado.</p>
        <Link href="/dashboard/chamados" className="text-blue-600 text-sm mt-2 inline-block hover:underline">← Voltar</Link>
      </div>
    )
  }

  const so = call.service_orders?.[0]
  const StatusIcon = statusConfig[call.status]?.icon || Phone
  const cfg = statusConfig[call.status]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/chamados" className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">
                {call.client?.name ?? call.contact_name ?? 'Chamado sem identificação'}
              </h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg?.bg} ${cfg?.color}`}>
                <StatusIcon className="w-3 h-3" />
                {cfg?.label}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">
              {new Date(call.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}{originLabel[call.origin]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {so && (
            <Link href={`/dashboard/chamados/${id}/imprimir`} target="_blank"
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-lg transition">
              <Printer className="w-4 h-4" />
              Imprimir OS
            </Link>
          )}
          <Link href={`/dashboard/chamados/${id}/editar`}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
            <Edit className="w-4 h-4" />
            Editar Chamado
          </Link>
        </div>
      </div>

      {/* Info do chamado */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Phone className="w-4 h-4 text-blue-600" />
          Informações do Chamado
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          {(call.contact_name || call.client?.name) && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Contato</p>
              <p className="text-slate-700 font-medium mt-0.5">{call.client?.name ?? call.contact_name}</p>
            </div>
          )}
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Origem</p>
            <p className="text-slate-700 font-medium mt-0.5">{originLabel[call.origin]}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Status</p>
            <p className="text-slate-700 font-medium mt-0.5">{cfg?.label}</p>
          </div>
          {call.service_category && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Tipo de Serviço</p>
              <p className="text-slate-700 font-medium mt-0.5">{call.service_category}</p>
            </div>
          )}
          {call.scheduled_time && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Horário Agendado</p>
              <p className="text-blue-600 font-semibold mt-0.5">🕐 {String(call.scheduled_time).slice(0,5)}</p>
            </div>
          )}
          {call.call_address && (
            <div className="col-span-2">
              <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Endereço do Serviço</p>
              <p className="text-slate-700 mt-0.5">📍 {call.call_address}</p>
            </div>
          )}
          {call.notes && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Observações</p>
              <p className="text-slate-700 mt-0.5">{call.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Cliente */}
      {call.client && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Cliente
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Nome</p>
              <p className="text-slate-700 font-medium mt-0.5">{call.client.name}</p>
            </div>
            {call.client.cpf_cnpj && <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">CPF/CNPJ</p>
              <p className="text-slate-700 mt-0.5">{call.client.cpf_cnpj}</p>
            </div>}
            {call.client.phone && <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Telefone</p>
              <p className="text-slate-700 mt-0.5">{call.client.phone}</p>
            </div>}
            {call.client.city && <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Cidade</p>
              <p className="text-slate-700 mt-0.5">{call.client.city}{call.client.state ? ` - ${call.client.state}` : ''}</p>
            </div>}
            {call.client.address && <div className="col-span-2">
              <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Endereço</p>
              <p className="text-slate-700 mt-0.5">{call.client.address}</p>
            </div>}
          </div>
        </div>
      )}

      {/* Ordem de Serviço */}
      {so && (
        <>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Ordem de Serviço — <span className="text-blue-600">{so.os_number}</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
              {so.team && <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Equipe</p>
                <p className="text-slate-700 font-medium mt-0.5">{so.team.name}</p>
              </div>}
              {so.driver && <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Motorista</p>
                <p className="text-slate-700 mt-0.5">{so.driver}</p>
              </div>}
              {so.nf_number && <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Nº NF</p>
                <p className="text-slate-700 mt-0.5">{so.nf_number}</p>
              </div>}
              {so.vehicle && <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Veículo</p>
                <p className="text-slate-700 mt-0.5">{so.vehicle}</p>
              </div>}
              {so.payment_method && <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Forma de Pag.</p>
                <p className="text-slate-700 mt-0.5">{so.payment_method}</p>
              </div>}
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Tipo</p>
                <p className="text-slate-700 mt-0.5">{serviceTypeLabel[so.service_type]}</p>
              </div>
            </div>

            {/* Itens */}
            {so.items?.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Itens do Serviço</p>
                <div className="space-y-2">
                  {so.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{item.quantity}x {item.description}</span>
                      <span className="font-medium text-slate-800">{fmt(item.total ?? item.quantity * item.unit_price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totais */}
            <div className="border-t border-slate-100 pt-4 mt-4 space-y-1.5">
              {Number(so.equipment_rental_value) > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Locação equip. e M.O.</span>
                  <span>{fmt(so.equipment_rental_value)}</span>
                </div>
              )}
              {Number(so.discount) > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Desconto</span>
                  <span>- {fmt(so.discount)}</span>
                </div>
              )}
              {Number(so.taxes) > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Impostos</span>
                  <span>{fmt(so.taxes)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-100">
                <span className="text-slate-800">Valor Total</span>
                <span className="text-blue-600">{fmt(so.total_value)}</span>
              </div>
            </div>

            {/* Custos terceirizado */}
            {so.service_type !== 'proprio' && (
              <div className="border-t border-slate-100 pt-4 mt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Custos do Serviço</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {[
                    { label: 'Gasolina', val: so.outsource_fuel_cost },
                    { label: 'Almoço', val: so.outsource_meal_cost },
                    { label: 'Aluguel Caminhão', val: so.outsource_truck_cost },
                    { label: 'Outros', val: so.outsource_other_cost },
                  ].filter(x => Number(x.val) > 0).map(x => (
                    <div key={x.label}>
                      <p className="text-slate-400 text-xs">{x.label}</p>
                      <p className="text-slate-700 font-medium">{fmt(x.val)}</p>
                    </div>
                  ))}
                  <div>
                    <p className="text-slate-400 text-xs">Lucro líquido (50%)</p>
                    <p className="text-emerald-600 font-bold">
                      {fmt((Number(so.total_value) - Number(so.outsource_fuel_cost || 0) - Number(so.outsource_meal_cost || 0) - Number(so.outsource_truck_cost || 0) - Number(so.outsource_other_cost || 0)) / 2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pagamento */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              Pagamento
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              {Object.entries(paymentBadge).map(([val, { label, color }]) => (
                <button
                  key={val}
                  onClick={() => updatePaymentStatus(so.id, val)}
                  disabled={updatingPayment}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition border-2 ${
                    so.payment_status === val
                      ? `${color} border-current`
                      : 'bg-slate-50 text-slate-500 border-transparent hover:border-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {so.payment_status === 'pago_parcial' && (
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Valor Pago</p>
                  <p className="text-emerald-600 font-semibold mt-0.5">{fmt(so.amount_paid || 0)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Valor Restante</p>
                  <p className="text-amber-600 font-semibold mt-0.5">{fmt(so.remaining_amount || 0)}</p>
                </div>
                {so.remaining_due_date && <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Vencimento</p>
                  <p className="text-slate-700 font-medium mt-0.5">{new Date(so.remaining_due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                </div>}
              </div>
            )}
          </div>
        </>
      )}

      {!so && call.status !== 'aprovado' && (
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Este chamado ainda não possui ordem de serviço.</p>
          <p className="text-slate-400 text-xs mt-1">Altere o status para "Aprovado" para criar uma OS.</p>
        </div>
      )}

      {/* Anexos */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-blue-600" />
            Documentos Anexados
          </h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-xs font-semibold px-3 py-2 rounded-lg transition">
            <Upload className="w-3.5 h-3.5" />
            {uploading ? 'Enviando...' : 'Anexar arquivo'}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" />
        </div>

        {attachments.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
            <Paperclip className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Nenhum documento anexado</p>
            <p className="text-slate-300 text-xs mt-1">Clique em "Anexar arquivo" para adicionar nota fiscal ou outros documentos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attachments.map((file: any) => {
              const displayName = file.name.replace(/^\d+_/, '')
              const sizeKb = file.metadata?.size ? Math.round(file.metadata.size / 1024) : null
              return (
                <div key={file.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{displayName}</p>
                      {sizeKb && <p className="text-xs text-slate-400">{sizeKb} KB</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => getDownloadUrl(file.name)}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Baixar">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteAttachment(file.name)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition" title="Remover">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
