'use client'

import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileImage, FileText, Loader2 } from 'lucide-react'
import { getCall } from '@/lib/db/calls'
import { getCallVisits } from '@/lib/db/service-visits'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant-context'
import RodriguesDocument, { DOC_WIDTH } from '@/components/RodriguesDocument'
import ScaledSheet from '@/components/ScaledSheet'
import { rodriguesVisitReportDoc } from '@/lib/rodrigues-os-doc'
import { useSheetShare } from '@/lib/use-sheet-share'

// Rodrigues: relatório do atendimento que não virou serviço (não aprovado,
// sem conserto, só a taxa de visita, orçamento em aberto). Mesmo modelo
// da ordem de serviço, pra enviar ao cliente ou prestar conta.
export default function RelatorioAtendimentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { tenant, loading: tenantLoading } = useTenant()
  const isRodrigues = tenant?.call_form_config?.rodrigues_custom === true
  const [call, setCall] = useState<any>(null)
  const [visits, setVisits] = useState<any[]>([])
  const [tecnico, setTecnico] = useState('')
  const [loading, setLoading] = useState(true)
  const docRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([getCall(id), getCallVisits(id).catch(() => [])])
      .then(async ([c, v]) => {
        setCall(c); setVisits(v)
        if (c?.technician_id) {
          const { data } = await createClient().from('auxiliaries').select('name').eq('id', c.technician_id).maybeSingle()
          setTecnico(data?.name ?? '')
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const ok = isRodrigues && !!call && ['nao_aprovou', 'pagou_somente_visita', 'orcamento'].includes(call.status)
  const doc = ok ? rodriguesVisitReportDoc(tenant, call, visits, tecnico) : null
  const name = String(call?.client?.name ?? call?.contact_name ?? 'cliente')
  const base = `Relatorio ${call?.call_number ?? ''} ${name}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_')
  const share = useSheetShare(docRef, base, doc?.title ?? 'Relatório de atendimento',
    JSON.stringify([call?.id, call?.status, visits.length, tecnico, tenant?.id]), !!doc)

  if (loading || tenantLoading) return <div className="max-w-2xl mx-auto h-40 bg-slate-50 rounded-xl animate-pulse" />

  if (!doc) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-2">
        <p className="text-slate-500">
          {!call ? 'Chamado não encontrado.' : 'O relatório só existe pra chamado não aprovado, que pagou só a taxa ou que ficou em orçamento.'}
        </p>
        <Link href={`/dashboard/chamados/${id}`} className="text-sm font-medium" style={{ color: 'var(--primary)' }}>← Voltar ao chamado</Link>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center max-w-3xl mx-auto pt-1 pb-3">
        <Link href={`/dashboard/chamados/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
      </div>

      <div className="max-w-3xl mx-auto">
        <ScaledSheet width={DOC_WIDTH}><RodriguesDocument {...doc} /></ScaledSheet>
      </div>
      <div style={{ position: 'fixed', left: -10000, top: 0 }} aria-hidden>
        <div ref={docRef}><RodriguesDocument {...doc} /></div>
      </div>
      {share.error && <p className="max-w-3xl mx-auto text-sm text-red-500 mt-2">{share.error}</p>}

      <div style={{ height: 96 }} />
      <div className="fixed bottom-6 inset-x-0 flex justify-center gap-3 z-50">
        <button onClick={() => share.send('png')} disabled={!!share.busy}
          className="flex items-center gap-2 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-2xl transition active:scale-95 disabled:opacity-70"
          style={{ backgroundColor: '#16a34a', boxShadow: '0 8px 24px rgba(22,163,74,0.40)' }}>
          {share.busy === 'png' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileImage className="w-5 h-5" />}
          {share.busy === 'png' ? 'Gerando...' : 'Imagem'}
        </button>
        <button onClick={() => share.send('pdf')} disabled={!!share.busy}
          className="flex items-center gap-2 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-2xl transition active:scale-95 disabled:opacity-70"
          style={{ backgroundColor: '#2563eb', boxShadow: '0 8px 24px rgba(37,99,235,0.40)' }}>
          {share.busy === 'pdf' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
          {share.busy === 'pdf' ? 'Gerando...' : 'PDF'}
        </button>
      </div>
    </>
  )
}
