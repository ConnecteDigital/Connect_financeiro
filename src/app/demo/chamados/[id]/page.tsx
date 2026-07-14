'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Phone, User, FileText, Printer, Check, Calendar } from 'lucide-react'
import { MOCK_CALLS } from '../../data'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  aprovado:  { label: 'Aprovado',  color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  agendado:  { label: 'Agendado',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  aberto:    { label: 'Em aberto', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
}

const ORIGIN_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', telefone: 'Telefone', indicacao: 'Indicação',
  instagram: 'Instagram', site: 'Site',
}

function fmt(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

export default function DemoChamadoDetail() {
  const { id } = useParams()
  const call = MOCK_CALLS.find(c => c.id === id)

  if (!call) return (
    <div className="text-center py-20" style={{ color: 'var(--text-tertiary)' }}>
      Chamado não encontrado
    </div>
  )

  const s = STATUS_MAP[call.status] ?? STATUS_MAP.aberto
  const isApproved = call.status === 'aprovado'

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/demo/chamados"
          className="w-9 h-9 rounded-xl flex items-center justify-center transition hover:bg-black/5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{call.contact_name}</h1>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
          </div>
          {call.os_number && <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-secondary)' }}>{call.os_number}</p>}
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Dados do Chamado</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Data</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{new Date(call.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Telefone</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{call.contact_phone}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Endereço</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{call.call_address}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{call.call_neighborhood} · {call.call_city}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Origem</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{ORIGIN_LABELS[call.origin] ?? call.origin}</p>
            </div>
          </div>
        </div>
        {call.service_category && (
          <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Tipo de Serviço</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{call.service_category}</p>
          </div>
        )}
        {call.notes && (
          <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Observações</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{call.notes}</p>
          </div>
        )}
      </div>

      {/* OS card (approved only) */}
      {isApproved && call.total_value && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Ordem de Serviço — {call.os_number}</p>
            <Link href={`/demo/chamados/${call.id}/imprimir`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition"
              style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              <Printer className="w-3.5 h-3.5" />
              Imprimir / Romaneio
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Equipe</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{call.team}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Forma de Pagamento</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{call.payment_method}</p>
            </div>
          </div>

          <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Total</p>
              <p className="text-lg font-bold text-emerald-600">{fmt(call.total_value)}</p>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg"
                style={call.payment_status === 'pago'
                  ? { background: 'rgba(16,185,129,0.1)', color: '#10b981' }
                  : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                <Check className="w-3 h-3" />
                {call.payment_status === 'pago' ? 'Pago' : call.payment_status === 'parcial' ? 'Pago parcialmente' : 'Pendente'}
              </span>
            </div>
          </div>

          {/* Service items */}
          <div className="pt-2 border-t space-y-1.5" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Itens do Serviço</p>
            {[
              { desc: `${call.service_category} — mão de obra`, value: call.total_value * 0.6 },
              { desc: 'Materiais e peças',                       value: call.total_value * 0.3 },
              { desc: 'Deslocamento',                            value: call.total_value * 0.1 },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{item.desc}</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{fmt(item.value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled */}
      {call.status === 'agendado' && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <p className="text-sm font-semibold text-blue-600">Chamado Agendado</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Aguardando visita técnica para avaliação e aprovação.</p>
        </div>
      )}
    </div>
  )
}
