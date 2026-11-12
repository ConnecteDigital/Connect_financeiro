'use client'

import { useMemo, useRef, useState } from 'react'
import { X, FileDown, ImageIcon, Loader2, ArrowLeft } from 'lucide-react'
import RodriguesDocument, { DOC_WIDTH, type RodriguesDocProps } from '@/components/RodriguesDocument'
import ScaledSheet from '@/components/ScaledSheet'
import { docHeaderOf } from '@/lib/rodrigues-doc'
import { useSheetShare } from '@/lib/use-sheet-share'
import { orderNumber, type ShopOrder } from '@/lib/db/shop-orders'
import { ptDate } from '@/lib/period'

type DocKind = 'orcamento' | 'os' | 'laudo'
const KINDS: { key: DocKind; label: string; title: string }[] = [
  { key: 'orcamento', label: 'Orçamento', title: 'Orçamento' },
  { key: 'os', label: 'Ordem de serviço', title: 'Ordem de serviço' },
  { key: 'laudo', label: 'Laudo técnico', title: 'Laudo técnico' },
]

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="w-full flex items-center justify-between py-2.5">
      <span className="text-sm text-zinc-700">{label}</span>
      <span className={`w-12 h-7 rounded-full transition relative ${value ? '' : 'bg-zinc-300'}`} style={value ? { background: 'var(--primary)' } : {}}>
        <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

// Gerar documento do pedido: escolhe o tipo, o que mostrar, e compartilha
export default function ShopOrderDocument({ order, tenant, photos, onClose }: { order: ShopOrder; tenant: any; photos: string[]; onClose: () => void }) {
  const [kind, setKind] = useState<DocKind | null>(null)
  const [ready, setReady] = useState(false)
  const [showPrices, setShowPrices] = useState(true)
  const [showSubtotal, setShowSubtotal] = useState(true)
  const [showDetails, setShowDetails] = useState(true)
  const [withPhotos, setWithPhotos] = useState(true)
  const docRef = useRef<HTMLDivElement>(null)

  const doc: RodriguesDocProps | null = useMemo(() => {
    if (!kind) return null
    const header = docHeaderOf(tenant)
    const k = KINDS.find(x => x.key === kind)!
    return {
      header,
      title: `${k.title} ${orderNumber(order)}`,
      date: ptDate(order.date),
      client: {
        name: order.client_name,
        addressLines: [order.client_address ?? '', order.client_city ?? '', order.client_cep ? `CEP ${order.client_cep}` : ''],
        phone: order.client_phone,
      },
      info: [
        ...(kind === 'orcamento' ? [['Validade do orçamento', order.validity_days ? `${order.validity_days} dias` : null] as [string, string | null]] : []),
        ['Marca', order.brand], ['Modelo', order.model], ['Aparelho', order.appliance],
        ['Número de série', order.serial_number], ['Defeito', order.defect],
        ...(kind === 'laudo' ? [['Observações', order.observations] as [string, string | null]] : []),
      ],
      visit: order.visit_date ? { date: ptDate(order.visit_date), period: [order.visit_time?.slice(0, 5), order.visit_notes].filter(Boolean).join(' · ') || undefined } : null,
      items: order.services.map(s => ({ description: s.description, details: s.details, unit: s.unit, unit_price: Number(s.unit_price), quantity: Number(s.quantity) })),
      parts: order.parts.map(s => ({ description: s.description, details: s.details, unit: s.unit, unit_price: Number(s.unit_price), quantity: Number(s.quantity) })),
      fees: [
        { label: 'Taxa de entrega', value: order.delivery_fee },
        { label: 'Frete', value: order.freight },
        { label: 'Outras taxas', value: order.other_fees },
      ],
      showPrices, showTotals: showSubtotal, showDetails,
      discount: order.discount,
      payment: { methods: order.payment_methods.join(', ') || undefined, pix: order.payment_methods.includes('PIX') ? header.pix : undefined, conditions: order.payment_conditions },
      guarantee: order.guarantee,
      extraInfo: kind !== 'laudo' ? order.observations : null,
      extraTitle: 'Observações',
      photos: withPhotos ? photos : [],
      signatures: kind === 'orcamento' ? [header.name] : [header.name, order.client_name],
    }
  }, [kind, order, tenant, photos, showPrices, showSubtotal, showDetails, withPhotos])

  const base = `${kind ? KINDS.find(x => x.key === kind)!.label : 'Pedido'} ${orderNumber(order)} ${order.client_name}`
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_')
  const share = useSheetShare(docRef, base, `${kind ? KINDS.find(x => x.key === kind)!.label : 'Pedido'} ${orderNumber(order)}`,
    JSON.stringify([order.id, kind, showPrices, showSubtotal, showDetails, withPhotos, photos.length]), ready && !!doc)

  return (
    <div className="fixed inset-0 z-[80] bg-zinc-100 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-100 flex items-center justify-between px-4 py-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <button type="button" onClick={() => (ready ? setReady(false) : kind ? setKind(null) : onClose())} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500">
          {kind ? <ArrowLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
        <p className="font-bold text-zinc-900">{ready ? 'Documento' : 'Gerar documento'}</p>
        <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500"><X className="w-5 h-5" /></button>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 110px)' }}>
        {!kind ? (
          <>
            <div>
              <p className="text-lg font-bold text-zinc-900">Qual documento você quer gerar?</p>
              <p className="text-sm text-zinc-500">Os dados são os mesmos; muda o título e o que aparece.</p>
            </div>
            {KINDS.map(k => (
              <button key={k.key} type="button" onClick={() => setKind(k.key)}
                className="w-full py-4 rounded-2xl bg-white border border-zinc-200 shadow-sm text-base font-semibold text-zinc-800 active:scale-[0.99] transition">{k.label}</button>
            ))}
          </>
        ) : !ready ? (
          <>
            <div>
              <p className="text-lg font-bold text-zinc-900">O que deve ser mostrado?</p>
              <p className="text-sm text-zinc-500">As anotações internas nunca aparecem no documento.</p>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-4 py-2 divide-y divide-zinc-50">
              <Toggle label="Mostrar preço de cada serviço" value={showPrices} onChange={setShowPrices} />
              <Toggle label="Mostrar subtotal e descontos" value={showSubtotal} onChange={setShowSubtotal} />
              <Toggle label="Mostrar detalhes dos serviços" value={showDetails} onChange={setShowDetails} />
              {photos.length > 0 && <Toggle label={`Mostrar as fotos (${photos.length})`} value={withPhotos} onChange={setWithPhotos} />}
            </div>
            <button type="button" onClick={() => setReady(true)} className="w-full py-3.5 rounded-2xl text-base font-bold text-white" style={{ background: 'var(--primary)' }}>Gerar documento</button>
          </>
        ) : doc && (
          <>
            <ScaledSheet width={DOC_WIDTH}><RodriguesDocument {...doc} /></ScaledSheet>
            <div style={{ position: 'fixed', left: -10000, top: 0 }} aria-hidden>
              <div ref={docRef}><RodriguesDocument {...doc} /></div>
            </div>
            {share.error && <p className="text-sm text-red-500">{share.error}</p>}
          </>
        )}
      </div>

      {ready && (
        <div className="fixed bottom-0 inset-x-0 z-10 flex justify-center gap-3 px-4 pt-3 bg-gradient-to-t from-zinc-100 via-zinc-100" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
          <button type="button" onClick={() => share.send('png')} disabled={!!share.busy}
            className="flex items-center gap-2 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-lg bg-emerald-600 disabled:opacity-70">
            {share.busy === 'png' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />} Imagem
          </button>
          <button type="button" onClick={() => share.send('pdf')} disabled={!!share.busy}
            className="flex items-center gap-2 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-lg disabled:opacity-70" style={{ background: 'var(--primary)' }}>
            {share.busy === 'pdf' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />} {share.files.pdf ? 'Enviar PDF' : 'PDF'}
          </button>
        </div>
      )}
    </div>
  )
}
