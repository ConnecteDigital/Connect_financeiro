'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { getCall } from '@/lib/db/calls'
import { ArrowLeft, Printer, MessageCircle } from 'lucide-react'

export default function RomaneioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [call, setCall] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCall(id).then(setCall).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-500">Carregando...</div>
  if (!call) return <div className="flex items-center justify-center h-screen text-slate-500">Chamado não encontrado.</div>

  const client = call.client
  const clientName = client?.name ?? call.contact_name ?? '—'
  const phone = call.contact_phone || client?.phone || '—'
  const cpf = client?.cpf_cnpj || '—'
  const address = [
    call.call_address || client?.address,
    call.call_neighborhood || client?.neighborhood,
    call.call_city || client?.city,
  ].filter(Boolean).join(', ') || '—'
  const serviceDate = call.scheduled_date ?? call.date
  const dateLabel = new Date(serviceDate + 'T12:00:00').toLocaleDateString('pt-BR')
  const time = call.scheduled_time ? String(call.scheduled_time).slice(0, 5) : '—'
  const number = call.call_number ?? '—'

  const whatsappText = [
    `🧾 *ROMANEIO ${number}*`,
    `Chamado do dia ${dateLabel}`,
    '',
    `*Cliente:* ${clientName}`,
    `*Endereço:* ${address}`,
    `*CPF:* ${cpf}`,
    `*Telefone:* ${phone}`,
    `*Serviço:* ${call.service_category || '—'}`,
    `*Horário:* ${time}`,
  ].join('\n')

  const rows = [
    { label: 'Cliente', value: clientName },
    { label: 'Endereço', value: address },
    { label: 'CPF', value: cpf },
    { label: 'Telefone', value: phone },
    { label: 'Tipo de Serviço', value: call.service_category || '—' },
    { label: 'Horário do Agendamento', value: time },
  ]

  return (
    <>
      {/* Ações — somem na impressão */}
      <div className="print:hidden flex items-center justify-between max-w-md mx-auto pt-2 pb-4 px-2">
        <Link href={`/dashboard/chamados/${id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="flex gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm">
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </a>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm">
            <Printer className="w-4 h-4" />
            Baixar PDF
          </button>
        </div>
      </div>

      {/* Documento — meia folha */}
      <div className="bg-white border border-slate-200 rounded-xl print:border-2 print:border-black print:rounded-none shadow-sm print:shadow-none max-w-md mx-auto p-5 font-sans text-black">
        <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
          <div>
            <p className="text-base font-extrabold uppercase tracking-wide">Romaneio de Serviço</p>
            <p className="text-[11px] text-slate-500">Desentupidora Líder · Atendimento 24h</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-extrabold">{number}</p>
            <p className="text-[11px] text-slate-500">Chamado do dia {dateLabel}</p>
          </div>
        </div>

        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.label} className="flex border-b border-slate-100 pb-1.5">
              <p className="w-32 flex-shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-500 pt-0.5">{r.label}</p>
              <p className="text-[13px] font-medium">{r.value}</p>
            </div>
          ))}
          {call.notes && (
            <div className="flex pb-1">
              <p className="w-32 flex-shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-500 pt-0.5">Observações</p>
              <p className="text-[13px]">{call.notes}</p>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-4 pt-2 border-t border-slate-100">
          Via do técnico — apresentar ao cliente no atendimento
        </p>
      </div>

      <style>{`
        @media print {
          @page { margin: 8mm; size: A5; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          aside, nav, header { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
        }
      `}</style>
    </>
  )
}
