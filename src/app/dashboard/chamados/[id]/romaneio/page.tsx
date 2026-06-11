'use client'

import { useEffect, useState, useRef } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { getCall } from '@/lib/db/calls'
import { useTenant } from '@/lib/tenant-context'
import { ArrowLeft, Share2, Loader2 } from 'lucide-react'

function RomaneioContent({ id }: { id: string }) {
  const { tenant } = useTenant()
  const [call, setCall] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getCall(id).then(setCall).catch(console.error).finally(() => setLoading(false))
  }, [id])

  async function handleShare() {
    if (!sheetRef.current || sharing) return
    setSharing(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      })
      const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/png'))
      if (!blob) throw new Error('Falha ao gerar imagem')
      const number = call?.call_number ?? 'romaneio'
      const file = new File([blob], `romaneio-${number}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Romaneio ${number}` })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `romaneio-${number}.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.error(e)
        alert('Não foi possível compartilhar. Tente novamente.')
      }
    } finally {
      setSharing(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-500">Carregando...</div>
  if (!call) return <div className="flex items-center justify-center h-screen text-slate-500">Chamado não encontrado.</div>

  const companyName = tenant?.name ?? 'Empresa'
  const logoUrl = tenant?.logo_url

  const client = call.client
  const clientName = client?.name ?? call.contact_name ?? ''
  const phone = call.contact_phone || client?.phone || ''
  const cpf = client?.cpf_cnpj || ''
  const addr1 = call.call_address || client?.address || ''
  const addr2 = [call.call_neighborhood || client?.neighborhood, call.call_city || client?.city].filter(Boolean).join(', ')
  const problem = call.service_category || ''
  const notes = call.notes || ''
  const serviceDate = call.scheduled_date ?? call.date
  const dateLabel = serviceDate ? new Date(serviceDate + 'T12:00:00').toLocaleDateString('pt-BR') : ''
  const time = call.scheduled_time ? String(call.scheduled_time).slice(0, 5) : ''
  const number = call.call_number ?? ''

  return (
    <>
      {/* Back + share controls */}
      <div className="print:hidden flex items-center justify-between max-w-[420px] mx-auto pt-3 pb-3 px-3">
        <Link href={`/dashboard/chamados/${id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <button
          onClick={handleShare}
          disabled={sharing}
          className="flex items-center gap-2 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-70"
          style={{ backgroundColor: '#16a34a' }}>
          {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          {sharing ? 'Gerando...' : 'Compartilhar'}
        </button>
      </div>

      {/* A5 romaneio sheet */}
      <div
        ref={sheetRef}
        className="romaneio-sheet bg-white mx-auto p-6"
        style={{ maxWidth: 420, fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={companyName} loading="eager"
                className="object-contain"
                style={{ width: 56, height: 56 }} />
            ) : (
              <div className="w-14 h-14 rounded flex items-center justify-center bg-gray-100">
                <span className="font-black text-xl text-gray-700">{companyName.charAt(0)}</span>
              </div>
            )}
            <p className="font-bold text-sm leading-tight">{companyName}</p>
          </div>
          <div className="text-right" style={{ fontSize: 11 }}>
            <p><span className="font-bold">CHAMADO:</span> {number}</p>
            <p><span className="font-bold">DATA:</span> {dateLabel}</p>
            <p><span className="font-bold">HORÁRIO:</span> {time}</p>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <LineField label="CLIENTE" value={clientName} />
          <LineField label="LOCALIZAÇÃO" value={addr1} />
          <LineField label="" value={addr2} />
          <LineField label="PROBLEMA" value={problem} />
          <LineField label="" value={notes} />
          <LineField label="CPF" value={cpf} />
          <LineField label="TELEFONE PARA CONTATO" value={phone} />
        </div>

        {/* Status circles */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 28, paddingTop: 16, borderTop: '1px solid #d1d5db' }}>
          {['Agendado', 'Realizado', 'Orçamento', 'Chamado'].map(status => (
            <div key={status} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid black' }} />
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{status}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 8mm; size: A5; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          aside, nav, header { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .romaneio-sheet { max-width: 100% !important; }
        }
      `}</style>
    </>
  )
}

function LineField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      {label && (
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', marginBottom: 2 }}>
          {label}
        </p>
      )}
      <div style={{ borderBottom: '1px solid black', paddingBottom: 2, minHeight: 20 }}>
        <span style={{ fontSize: 13 }}>{value || ' '}</span>
      </div>
    </div>
  )
}

export default function RomaneioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <RomaneioContent id={id} />
}
