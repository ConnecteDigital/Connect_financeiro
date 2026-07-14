'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Share2, MapPin, Phone, User, Wrench, FileText, CalendarDays } from 'lucide-react'
import { MOCK_CALLS, COMPANY } from '../../../data'

const ORIGIN_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', telefone: 'Telefone', indicacao: 'Indicação',
  instagram: 'Instagram', site: 'Site',
}

export default function DemoRomaneio() {
  const { id } = useParams()
  const call = MOCK_CALLS.find(c => c.id === id)

  if (!call) return (
    <div className="text-center py-20 text-gray-400">Chamado não encontrado</div>
  )

  const primaryColor = '#2563eb'
  const primaryRgb = '37, 99, 235'

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      {/* Action bar */}
      <div className="max-w-lg mx-auto px-4 pt-4 pb-2 flex gap-2">
        <Link href={`/demo/chamados/${call.id}`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-600">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: primaryColor }}>
          <Share2 className="w-4 h-4" />
          Compartilhar
        </button>
      </div>

      {/* Card */}
      <div className="max-w-lg mx-auto px-4 pb-8">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          {/* Header with gradient */}
          <div className="p-5 text-white relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #1d4ed8 100%)` }}>
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-10 bg-white" />
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white/70 text-[10px] font-semibold uppercase tracking-widest">{COMPANY}</p>
                  <p className="text-xl font-bold mt-0.5">Romaneio de Serviço</p>
                </div>
                {call.os_number && (
                  <div className="text-right">
                    <p className="text-white/60 text-[10px]">Nº OS</p>
                    <p className="text-sm font-bold font-mono">{call.os_number}</p>
                  </div>
                )}
              </div>
              <p className="text-white/80 text-sm font-semibold">{call.contact_name}</p>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: CalendarDays, label: 'Data', value: new Date(call.date + 'T12:00:00').toLocaleDateString('pt-BR') },
                { icon: Phone, label: 'Telefone', value: call.contact_phone },
                { icon: User, label: 'Origem', value: ORIGIN_LABELS[call.origin] ?? call.origin },
                { icon: Wrench, label: 'Serviço', value: call.service_category },
              ].map(item => (
                <div key={item.label} className="rounded-2xl p-3" style={{ background: `rgba(${primaryRgb},0.05)` }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <item.icon className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: primaryColor }}>{item.label}</p>
                  </div>
                  <p className="text-sm font-medium text-slate-800">{item.value ?? '—'}</p>
                </div>
              ))}
            </div>

            {/* Address */}
            <div className="rounded-2xl p-3" style={{ background: `rgba(${primaryRgb},0.05)` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: primaryColor }}>Endereço</p>
              </div>
              <p className="text-sm font-medium text-slate-800">{call.call_address}</p>
              <p className="text-xs text-slate-500 mt-0.5">{call.call_neighborhood} · {call.call_city}</p>
            </div>

            {/* Notes */}
            {call.notes && (
              <div className="rounded-2xl p-3" style={{ background: `rgba(${primaryRgb},0.05)` }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: primaryColor }}>Observações</p>
                </div>
                <p className="text-sm text-slate-700">{call.notes}</p>
              </div>
            )}

            {/* OS info (if approved) */}
            {call.status === 'aprovado' && call.total_value && (
              <div className="rounded-2xl p-4 border-2" style={{ borderColor: primaryColor, background: `rgba(${primaryRgb},0.04)` }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: primaryColor }}>Valor Total</p>
                    <p className="text-2xl font-bold mt-0.5" style={{ color: primaryColor }}>
                      R$ {call.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: primaryColor }}>Pagamento</p>
                    <p className="text-sm font-semibold text-slate-800">{call.payment_method}</p>
                  </div>
                </div>
                {call.team && (
                  <p className="text-xs mt-2 text-slate-500">Equipe: <span className="font-semibold text-slate-700">{call.team}</span></p>
                )}
              </div>
            )}

            <p className="text-center text-xs text-slate-400 pt-2">
              {COMPANY} · {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
