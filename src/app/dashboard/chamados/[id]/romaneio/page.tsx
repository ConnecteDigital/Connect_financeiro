'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getCall } from '@/lib/db/calls'
import { useTenant } from '@/lib/tenant-context'
import { ArrowLeft, Printer, MessageCircle } from 'lucide-react'

function RomaneioContent({ id }: { id: string }) {
  const { tenant } = useTenant()
  const [call, setCall] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCall(id).then(setCall).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-500">Carregando...</div>
  if (!call) return <div className="flex items-center justify-center h-screen text-slate-500">Chamado não encontrado.</div>

  const companyName = tenant?.name ?? 'Desentupidora'
  const primaryColor = tenant?.primary_color ?? '#f97316'
  const logoUrl = tenant?.logo_url

  // Origin site
  const originLabel = call.origin ?? null

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
    `${companyName}${originLabel ? ` · ${originLabel}` : ''}`,
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
    { label: 'Horário', value: time },
  ]

  return (
    <>
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
            className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
            style={{ backgroundColor: primaryColor }}>
            <Printer className="w-4 h-4" />
            Baixar PDF
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl print:border-2 print:border-black print:rounded-none shadow-sm print:shadow-none max-w-md mx-auto font-sans text-black overflow-hidden">
        {/* Cabeçalho colorido */}
        <div className="flex items-center justify-between px-5 py-4 text-white"
          style={{ backgroundColor: primaryColor }}>
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <Image src={logoUrl} alt={companyName} width={44} height={44}
                className="object-contain rounded-lg bg-white/20 p-0.5"
                style={{ width: 44, height: 44 }} />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="font-black text-lg">{companyName.charAt(0)}</span>
              </div>
            )}
            <div>
              <p className="font-extrabold text-sm leading-tight">{companyName}</p>
              {originLabel && <p className="text-xs opacity-80 mt-0.5">{originLabel}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-80 uppercase tracking-wide">Romaneio</p>
            <p className="font-extrabold text-lg leading-tight">{number}</p>
            <p className="text-xs opacity-80">{dateLabel} · {time}</p>
          </div>
        </div>

        <div className="px-5 py-4 space-y-2">
          {rows.map(r => (
            <div key={r.label} className="flex border-b border-slate-100 pb-2">
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

        <p className="text-center text-[10px] text-slate-400 py-3 px-5 border-t border-slate-100">
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

export default function RomaneioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <RomaneioContent id={id} />
}
