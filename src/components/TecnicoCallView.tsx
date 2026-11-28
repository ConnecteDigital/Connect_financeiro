'use client'

import { ownerNameOf } from '@/lib/greeting'
import { useTenant } from '@/lib/tenant-context'
import { getCallVisits } from '@/lib/db/service-visits'
import { cleanPartsGuarantee } from '@/lib/parts-guarantee'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Navigation, CalendarClock, Wrench, CheckCircle, Printer, Edit, Paperclip, FileText, PenLine } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PhotoGallery from '@/components/PhotoGallery'
import ChangeOutcome from '@/components/ChangeOutcome'
import OsRefunds from '@/components/OsRefunds'
import ServiceTimer from '@/components/ServiceTimer'
import { mapsUrl } from '@/lib/maps'
import { formatAddress, navigationAddress } from '@/lib/address'
import { getServiceOrderParts } from '@/lib/db/stock'
import type { LockInfo } from '@/lib/tecnico-queue'
import { paymentsFromOs, formatPaymentLine, osCardPending } from '@/lib/payments'

const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

// Tela do chamado para o login de técnico (Rodrigues): só o que ele
// precisa pra ir até o cliente e fazer o serviço — nada de editar o que
// o dono cadastrou. Chamado bloqueado na fila mostra só horário, cliente
// e serviço.
export default function TecnicoCallView({ call, lock, onChanged }: {
  call: any
  lock: LockInfo
  onChanged: () => void
}) {
  const so = call.service_orders?.[0]
  const { tenant } = useTenant()
  const [parts, setParts] = useState<any[]>([])
  // Retorno marcado como "Resolvido": a última visita guarda a descrição
  const [resolved, setResolved] = useState<{ notes: string | null } | null>(null)
  useEffect(() => {
    if (call.status !== 'retorno') { setResolved(null); return }
    getCallVisits(call.id).then(vs => {
      const last = vs.filter((v: any) => v.finished_at).sort((a: any, b: any) => String(b.finished_at).localeCompare(String(a.finished_at)))[0]
      setResolved(last?.outcome === 'resolvido' ? { notes: last.notes ?? null } : null)
    }).catch(() => setResolved(null))
  }, [call.id, call.status])

  useEffect(() => {
    if (!so?.id) return
    getServiceOrderParts(so.id).then(setParts).catch(console.error)
  }, [so?.id])

  // Fotos/arquivos do chamado (os que o Rodrigues anexou e os do técnico)
  const [files, setFiles] = useState<{ name: string; url: string; image: boolean }[]>([])
  useEffect(() => {
    const storage = createClient().storage.from('chamados-anexos')
    storage.list(call.id, { sortBy: { column: 'created_at', order: 'asc' } })
      .then(({ data }) => setFiles((data ?? []).filter(f => f.name && !f.name.startsWith('.')).map(f => ({
        name: f.name.replace(/^\d+_/, ''),
        url: storage.getPublicUrl(`${call.id}/${f.name}`).data.publicUrl,
        image: /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(f.name),
      }))))
      .catch(() => setFiles([]))
  }, [call.id, so?.id])

  const name = call.client?.name ?? call.contact_name ?? 'Cliente'
  const time = call.scheduled_time ? String(call.scheduled_time).slice(0, 5) : null
  const day = call.scheduled_date ?? call.date
  // Fim previsto = horário + duração (padrão 1h)
  const endTime = time ? (() => { const [h, m] = time.split(':').map(Number); const t = h * 60 + m + (Number(call.duration_minutes) || 60); return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` })() : null
  const dateLabel = new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const service = call.service_category
    || [call.appliance_type, call.device_brand].filter(Boolean).join(' ')
  const addressParts = {
    address: call.call_address, number: call.address_number, complement: call.address_complement,
    neighborhood: call.call_neighborhood, city: call.call_city,
  }
  const fullAddress = formatAddress(addressParts)

  const header = (
    <div className="flex items-start gap-3">
      <Link href="/dashboard/chamados" className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500 flex-shrink-0 mt-0.5">
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-slate-800">{name}</h1>
        <p className="text-sm text-slate-500 capitalize">{time ? `${time} · ` : ''}{dateLabel}</p>
      </div>
    </div>
  )

  if (lock.locked) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {header}
        <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-6 text-center space-y-2">
          <Lock className="w-8 h-8 text-zinc-400 mx-auto" />
          {service && <p className="text-slate-700 font-semibold">{service}</p>}
          <p className="text-sm text-slate-500">{lock.message}</p>
          <p className="text-xs text-slate-400">Endereço e início do serviço são liberados na ordem da agenda.</p>
        </div>
        {/* Mesmo bloqueado, o técnico já pode ver as fotos do aparelho */}
        <PhotoGallery files={files.filter(f => f.image)} title="Fotos do chamado" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {header}

      <ServiceTimer callId={call.id} status={call.status} onChanged={onChanged} isReturn={!!call.return_of_call_id} />

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" /> Data e horário
          </p>
          <p className="text-slate-800 font-medium mt-0.5 capitalize">{dateLabel}{time ? ` · ${time}${endTime ? ` às ${endTime}` : ''}` : ' · qualquer horário'}</p>
        </div>

        {service && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" /> Serviço
            </p>
            <p className="text-slate-800 font-medium mt-0.5">{service}</p>
          </div>
        )}

        {fullAddress && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Endereço</p>
            <p className="text-slate-800 mt-0.5">📍 {fullAddress}</p>
            {call.address_reference && <p className="text-sm text-slate-500 mt-0.5">Referência: {call.address_reference}</p>}
            <a href={mapsUrl(navigationAddress(addressParts))} target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 text-sm font-bold px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition shadow-sm">
              <Navigation className="w-4 h-4" />
              Abrir no Waze
            </a>
          </div>
        )}

        {call.notes && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Observação</p>
            <p className="text-slate-700 mt-0.5 whitespace-pre-line">{call.notes}</p>
          </div>
        )}
      </div>

      <PhotoGallery files={files} />

      {/* Retorno resolvido (sem cobrança): mostra o que foi feito; OS só se usou peça ou cobrou */}
      {resolved && !so && (
        <div className="bg-violet-50 rounded-xl border border-violet-100 p-5 space-y-2">
          <p className="font-semibold text-violet-800 flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4" /> Retorno resolvido</p>
          {resolved.notes && <p className="text-sm text-violet-900 whitespace-pre-line">{resolved.notes}</p>}
          <Link href={`/dashboard/chamados/${call.id}/finalizar`} className="inline-block text-xs font-semibold text-violet-700 underline pt-1">
            Usou peça ou cobrou algo? Completar a OS
          </Link>
        </div>
      )}

      {(call.status === 'aprovado' || call.status === 'retorno') && !so && !resolved && (
        <Link href={`/dashboard/chamados/${call.id}/finalizar`}
          className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-bold text-white"
          style={{ background: 'var(--primary)' }}>
          <CheckCircle className="w-5 h-5" /> Completar a OS
        </Link>
      )}

      {/* Mudar o resultado (recusado, orçamento, ou aprovado por engano) enquanto não tem OS */}
      {['orcamento', 'nao_aprovou', 'pagou_somente_visita', 'aprovado', 'retorno'].includes(call.status) && !so && (
        <ChangeOutcome callId={call.id} status={call.status} onChanged={onChanged} />
      )}

      {/* Serviço que não foi fechado: relatório pro cliente / prestação de contas */}
      {['orcamento', 'nao_aprovou', 'pagou_somente_visita'].includes(call.status) && !so && (
        <Link href={`/dashboard/chamados/${call.id}/relatorio`}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700">
          <FileText className="w-4 h-4" /> Gerar relatório do atendimento
        </Link>
      )}

      {so && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600" /> Serviço concluído
            {so.os_number && <span className="text-slate-400 font-normal">· {so.os_number}</span>}
          </h2>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Valor</span>
            <span className="font-bold text-slate-800">{fmt(so.total_value)}</span>
          </div>
          {call.return_of_call_id && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Cliente pagou a peça</span>
              <span className="text-slate-700">{(call.return_parts_paid ?? (Number(so.total_value) - Number(so.return_service_value ?? 0)) > 0) ? 'Sim' : 'Não'}</span>
            </div>
          )}
          {Number(so.return_service_value ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Serviço cobrado no retorno</span>
              <span className="text-slate-700">{fmt(so.return_service_value)}</span>
            </div>
          )}
          {paymentsFromOs(so).length > 0 && (
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-slate-500">Pagamento</span>
              <span className="text-slate-700 text-right">
                {paymentsFromOs(so).map((l, i) => <span key={i} className="block">{formatPaymentLine(l)}</span>)}
              </span>
            </div>
          )}
          {osCardPending(so) && (
            <p className="text-xs rounded-lg bg-amber-50 border border-amber-100 text-amber-800 px-3 py-2">
              Cartão aguardando confirmação do {ownerNameOf(tenant)} — sua comissão aparece depois disso.
            </p>
          )}
          {parts.length > 0 && (
            <div className="text-sm">
              <p className="text-slate-500">Peças usadas</p>
              {parts.map(p => (
                <p key={p.id} className="text-slate-700">{p.quantity}x {p.item_name}</p>
              ))}
            </div>
          )}
          {cleanPartsGuarantee(so.parts_guarantee).length > 0 && (
            <div className="text-sm">
              <p className="text-slate-500">Garantia das peças</p>
              {cleanPartsGuarantee(so.parts_guarantee).map((g, i) => <p key={i} className="text-slate-700">{g.part} — {g.period}</p>)}
            </div>
          )}
          <OsRefunds so={so} readOnly />
          {so.observations && (
            <div className="text-sm">
              <p className="text-slate-500">Descrição</p>
              <p className="text-slate-700 whitespace-pre-line">{so.observations}</p>
            </div>
          )}
          <Link href={`/dashboard/chamados/${call.id}/imprimir?assinar=1`}
            className="flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-bold text-white" style={{ background: 'var(--primary)' }}>
            <PenLine className="w-4 h-4" /> Assinatura do cliente
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/dashboard/chamados/${call.id}/finalizar`}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
              <Edit className="w-4 h-4" /> Corrigir
            </Link>
            <Link href={`/dashboard/chamados/${call.id}/imprimir`}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition">
              <Printer className="w-4 h-4" /> Compartilhar OS
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
