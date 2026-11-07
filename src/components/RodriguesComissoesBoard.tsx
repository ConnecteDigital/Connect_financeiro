'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { UserRound, CheckCircle2, Clock, Wallet, Loader2, Share2, X, CreditCard, ChevronDown, Undo2, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getAuxiliaries } from '@/lib/db/auxiliaries'
import { useTenant } from '@/lib/tenant-context'
import { osCardGross, osCardPending } from '@/lib/payments'
import { localYmd } from '@/lib/tecnico-queue'
import { periodOf, ptDate, type PeriodMode } from '@/lib/period'
import PeriodNav from '@/components/PeriodNav'

// Comissões (dono da Rodrigues): mesmo jeito do painel de chamados —
// escolhe Dia/Semana/Mês, toca no técnico e dá baixa só no que escolher.
// Cada comissão é uma despesa "Pessoal" ligada à OS (criada pelo banco
// quando o técnico fecha o serviço); dar baixa = marcar como paga.

const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const one = (v: any) => Array.isArray(v) ? v[0] : v

const OS_FIELDS = 'id, os_number, date, total_value, parts_cost, uber_cost, after_hours, payments, payment_method, card_net_value, auxiliary_id, call:calls(id, contact_name, call_neighborhood, technician_id, return_of_call_id, client:clients(name))'

interface Entry {
  id: string
  amount: number
  status: string
  due_date: string
  paid_date: string | null
  description: string
  auxiliary_id: string
  source_service_order_id: string | null
}

interface TecLane {
  id: string
  name: string
  entries: Entry[]
  total: number
  pending: number
  paid: number
  cardWaiting: any[]
}

interface Receipt { name: string; date: string; items: Entry[]; total: number; periodLabel: string }

const clientOf = (so: any) => {
  const call = one(so?.call)
  return one(call?.client)?.name ?? call?.contact_name ?? 'Cliente'
}

export default function RodriguesComissoesBoard() {
  const { tenant } = useTenant()
  const [mode, setMode] = useState<PeriodMode>('dia')
  const [offset, setOffset] = useState(0)
  const period = useMemo(() => periodOf(mode, offset), [mode, offset])

  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [orders, setOrders] = useState<Record<string, any>>({})
  const [cardWaiting, setCardWaiting] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [payDate, setPayDate] = useState(localYmd())
  const [paying, setPaying] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [openDetail, setOpenDetail] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [sharing, setSharing] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getAuxiliaries().then(a => setTecnicos(a.filter((x: any) => x.type === 'tecnico'))).catch(console.error)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [{ data: exp }, { data: sos }] = await Promise.all([
      supabase.from('expenses')
        .select('id, amount, status, due_date, paid_date, description, auxiliary_id, source_service_order_id')
        .eq('category', 'Pessoal').not('auxiliary_id', 'is', null)
        .gte('due_date', period.start).lte('due_date', period.end)
        .order('due_date', { ascending: false }),
      supabase.from('service_orders').select(OS_FIELDS)
        .gte('date', period.start).lte('date', period.end).is('card_net_value', null),
    ])
    const list = (exp ?? []) as Entry[]
    setEntries(list)
    setCardWaiting((sos ?? []).filter((so: any) => osCardPending(so) && !one(so.call)?.return_of_call_id))
    const ids = Array.from(new Set(list.map(e => e.source_service_order_id).filter(Boolean))) as string[]
    if (ids.length) {
      const { data } = await supabase.from('service_orders').select(OS_FIELDS).in('id', ids)
      setOrders(Object.fromEntries((data ?? []).map((so: any) => [so.id, so])))
    } else setOrders({})
    setLoading(false)
  }, [period.start, period.end])

  useEffect(() => { load() }, [load])

  const lanes: TecLane[] = useMemo(() => {
    const byTec = new Map<string, Entry[]>()
    for (const e of entries) {
      if (!byTec.has(e.auxiliary_id)) byTec.set(e.auxiliary_id, [])
      byTec.get(e.auxiliary_id)!.push(e)
    }
    const build = (id: string, name: string): TecLane => {
      const list = byTec.get(id) ?? []
      const waiting = cardWaiting.filter(so => (so.auxiliary_id ?? one(so.call)?.technician_id) === id)
      return {
        id, name, entries: list,
        total: list.reduce((s, e) => s + Number(e.amount), 0),
        pending: list.filter(e => e.status === 'pendente').reduce((s, e) => s + Number(e.amount), 0),
        paid: list.filter(e => e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0),
        cardWaiting: waiting,
      }
    }
    const out = tecnicos.map(t => build(t.id, t.name))
    for (const id of byTec.keys()) {
      if (!tecnicos.some(t => t.id === id)) out.push(build(id, 'Técnico removido'))
    }
    return out.sort((a, b) => b.pending - a.pending || b.total - a.total || a.name.localeCompare(b.name))
  }, [entries, tecnicos, cardWaiting])

  const selected = lanes.find(l => l.id === selectedId) ?? null
  const totals = {
    total: lanes.reduce((s, l) => s + l.total, 0),
    pending: lanes.reduce((s, l) => s + l.pending, 0),
    paid: lanes.reduce((s, l) => s + l.paid, 0),
    services: entries.length,
  }

  // Ao escolher o técnico (ou trocar o período), já deixa marcado tudo que está pendente
  useEffect(() => {
    setChecked(new Set((selected?.entries ?? []).filter(e => e.status === 'pendente').map(e => e.id)))
    setConfirming(false)
  }, [selectedId, entries]) // eslint-disable-line react-hooks/exhaustive-deps

  const toPay = (selected?.entries ?? []).filter(e => e.status === 'pendente' && checked.has(e.id))
  const toPayTotal = toPay.reduce((s, e) => s + Number(e.amount), 0)

  async function handlePay() {
    if (!selected || toPay.length === 0) return
    setPaying(true)
    try {
      const { error } = await createClient().from('expenses')
        .update({ status: 'pago', paid_date: payDate }).in('id', toPay.map(e => e.id))
      if (error) throw error
      setReceipt({ name: selected.name, date: payDate, items: toPay, total: toPayTotal, periodLabel: period.label })
      setConfirming(false)
      await load()
    } catch (e) {
      console.error(e)
      alert('Não foi possível dar baixa. Tente novamente.')
    } finally {
      setPaying(false)
    }
  }

  async function handleUndo(e: Entry) {
    if (!confirm('Voltar esta comissão para pendente?')) return
    await createClient().from('expenses').update({ status: 'pendente', paid_date: null }).eq('id', e.id)
    await load()
  }

  async function handleShare() {
    if (!receiptRef.current || sharing) return
    setSharing(true)
    try {
      const { buildSheetCanvas } = await import('@/lib/sheet-capture')
      const canvas = await buildSheetCanvas(receiptRef.current)
      const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/png'))
      if (!blob) throw new Error('Falha')
      const file = new File([blob], `comissao-${receipt?.name ?? ''}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: `Comissão — ${receipt?.name}` })
      else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = file.name; a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') alert('Não foi possível compartilhar.')
    } finally { setSharing(false) }
  }

  const summary = [
    { label: 'Comissões', value: fmt(totals.total), cls: 'text-zinc-900' },
    { label: 'A pagar', value: fmt(totals.pending), cls: 'text-amber-600' },
    { label: 'Pago', value: fmt(totals.paid), cls: 'text-emerald-600' },
    { label: 'Serviços', value: String(totals.services), cls: 'text-zinc-900' },
  ]

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Comissões</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Toque no técnico pra ver os serviços e dar baixa</p>
      </div>

      <PeriodNav mode={mode} offset={offset} label={period.label} onMode={setMode} onOffset={setOffset} />

      {/* Resumo do período */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {summary.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-3 py-2.5">
            <p className={`text-base sm:text-lg font-bold whitespace-nowrap ${s.cls} ${loading ? 'opacity-40' : ''}`}>{s.value}</p>
            <p className="text-[11px] font-medium text-zinc-500 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Técnicos */}
      {lanes.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-6">Nenhum técnico cadastrado.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {lanes.map(l => {
            const active = selected?.id === l.id
            return (
              <button key={l.id} type="button" onClick={() => setSelectedId(active ? null : l.id)}
                className={`text-left rounded-2xl border px-3 py-2.5 transition ${active ? 'bg-white shadow-sm' : 'bg-white/70 border-zinc-100 hover:bg-white'}`}
                style={active ? { borderColor: 'var(--primary)', boxShadow: '0 0 0 1px var(--primary)' } : {}}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <UserRound className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                  <p className="text-sm font-semibold text-zinc-800 truncate">{l.name}</p>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {l.entries.length === 0 ? 'Sem comissão' : `${l.entries.length} serviço${l.entries.length > 1 ? 's' : ''}`}
                </p>
                {l.pending > 0 && <p className="text-sm font-bold text-amber-600 mt-1">{fmt(l.pending)} <span className="text-[10px] font-medium">a pagar</span></p>}
                {l.pending === 0 && l.paid > 0 && <p className="text-sm font-bold text-emerald-600 mt-1">{fmt(l.paid)} <span className="text-[10px] font-medium">pago</span></p>}
                {l.cardWaiting.length > 0 && (
                  <p className="text-[10px] font-semibold text-sky-600 mt-1 flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> {l.cardWaiting.length} no cartão a confirmar
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Serviços do técnico escolhido */}
      {selected && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-zinc-800">{selected.name}</p>
              <p className="text-xs text-zinc-500 capitalize">{period.label}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Total</p>
              <p className="text-sm font-bold text-zinc-800">{fmt(selected.total)}</p>
            </div>
          </div>

          {selected.cardWaiting.length > 0 && (
            <div className="bg-sky-50 border-b border-sky-100 px-4 py-2.5">
              <p className="text-xs font-semibold text-sky-800 flex items-center gap-1.5 mb-1"><CreditCard className="w-3.5 h-3.5" /> Aguardando o valor do cartão</p>
              {selected.cardWaiting.map(so => (
                <Link key={so.id} href={`/dashboard/chamados/${one(so.call)?.id}`} className="flex items-center justify-between text-xs text-sky-900 py-1">
                  <span className="truncate">{clientOf(so)} · {fmt(so.total_value)}</span>
                  <span className="flex items-center gap-1 font-semibold flex-shrink-0 ml-2">Confirmar <ExternalLink className="w-3 h-3" /></span>
                </Link>
              ))}
            </div>
          )}

          {selected.entries.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-400">Nenhuma comissão neste período</p>
          ) : (
            <div className="divide-y divide-zinc-50">
              {selected.entries.map(e => {
                const so = e.source_service_order_id ? orders[e.source_service_order_id] : null
                const pend = e.status === 'pendente'
                const open = openDetail === e.id
                return (
                  <div key={e.id}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      {pend ? (
                        <input type="checkbox" checked={checked.has(e.id)}
                          onChange={ev => setChecked(prev => { const n = new Set(prev); ev.target.checked ? n.add(e.id) : n.delete(e.id); return n })}
                          className="w-5 h-5 accent-orange-500 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      )}
                      <button type="button" onClick={() => setOpenDetail(open ? null : e.id)} className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-zinc-800 truncate">{so ? clientOf(so) : e.description}</p>
                        <p className="text-xs text-zinc-500 truncate">
                          {[so?.os_number, ptDate(so?.date ?? e.due_date), one(so?.call)?.call_neighborhood].filter(Boolean).join(' · ')}
                        </p>
                      </button>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-zinc-800">{fmt(e.amount)}</p>
                        {pend ? (
                          <span className="text-[11px] font-semibold text-amber-600 flex items-center justify-end gap-1"><Clock className="w-3 h-3" /> Pendente</span>
                        ) : (
                          <button type="button" onClick={() => handleUndo(e)} title="Voltar para pendente"
                            className="text-[11px] font-semibold text-emerald-600 flex items-center justify-end gap-1 hover:text-red-500">
                            Pago {ptDate(e.paid_date)} <Undo2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-zinc-300 flex-shrink-0 transition ${open ? 'rotate-180' : ''}`} onClick={() => setOpenDetail(open ? null : e.id)} />
                    </div>
                    {open && <Detail so={so} amount={Number(e.amount)} />}
                  </div>
                )
              })}
            </div>
          )}

          {/* Dar baixa */}
          {selected.pending > 0 && (
            <div className="border-t border-zinc-100 bg-zinc-50 p-4 space-y-3">
              {!confirming ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">{toPay.length} de {selected.entries.filter(e => e.status === 'pendente').length} marcados</p>
                    <p className="text-xs text-zinc-500">Desmarque o que não vai pagar agora</p>
                  </div>
                  <button type="button" onClick={() => { setPayDate(localYmd()); setConfirming(true) }} disabled={toPay.length === 0}
                    className="flex items-center gap-2 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition active:scale-95 disabled:opacity-50"
                    style={{ background: 'var(--primary)' }}>
                    <Wallet className="w-4 h-4" /> Dar baixa · {fmt(toPayTotal)}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-zinc-800">
                    Pagar <span style={{ color: 'var(--primary)' }}>{fmt(toPayTotal)}</span> para {selected.name} ({toPay.length} serviço{toPay.length > 1 ? 's' : ''})
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-zinc-600">Data do pagamento</label>
                    <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="input-field py-1.5 text-sm w-40" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handlePay} disabled={paying}
                      className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition">
                      {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {paying ? 'Salvando...' : 'Confirmar'}
                    </button>
                    <button type="button" onClick={() => setConfirming(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-zinc-200 text-zinc-600">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Comprovante */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md overflow-auto" style={{ maxHeight: '90vh' }}>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setReceipt(null)} className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white"><X className="w-4 h-4" /> Fechar</button>
              <button onClick={handleShare} disabled={sharing}
                className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-xl bg-emerald-600">
                {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} Compartilhar
              </button>
            </div>
            <div ref={receiptRef} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', fontFamily: 'Arial, sans-serif', color: '#111' }}>
              <div style={{ background: tenant?.primary_color ?? '#f97316', padding: '20px 22px' }}>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Comprovante de comissão</p>
                <p style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>{tenant?.name}</p>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 6, textTransform: 'capitalize' }}>{receipt.periodLabel} · pago em {ptDate(receipt.date)}</p>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f4f4f5', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#71717a' }}>Técnico</p>
                    <p style={{ fontSize: 16, fontWeight: 800 }}>{receipt.name}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#71717a' }}>Total pago</p>
                    <p style={{ fontSize: 22, fontWeight: 900, color: tenant?.primary_color ?? '#f97316' }}>{fmt(receipt.total)}</p>
                  </div>
                </div>
                <div style={{ border: '1px solid #e4e4e7', borderRadius: 10, overflow: 'hidden' }}>
                  {receipt.items.map((e, i) => {
                    const so = e.source_service_order_id ? orders[e.source_service_order_id] : null
                    return (
                      <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderTop: i ? '1px solid #f4f4f5' : 'none' }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600 }}>{so ? clientOf(so) : e.description}</p>
                          <p style={{ fontSize: 11, color: '#71717a' }}>{[so?.os_number, ptDate(so?.date ?? e.due_date)].filter(Boolean).join(' · ')}</p>
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 700 }}>{fmt(e.amount)}</p>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 28 }}>
                  <div style={{ flex: 1, borderTop: '1px solid #a1a1aa', paddingTop: 6, textAlign: 'center', fontSize: 10, color: '#71717a' }}>{tenant?.name}</div>
                  <div style={{ flex: 1, borderTop: '1px solid #a1a1aa', paddingTop: 6, textAlign: 'center', fontSize: 10, color: '#71717a' }}>{receipt.name}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Como a comissão foi calculada: (total − peças − Uber − taxa da maquininha) × %
function Detail({ so, amount }: { so: any; amount: number }) {
  if (!so) return <p className="px-4 pb-3 text-xs text-zinc-400">Sem ordem de serviço vinculada.</p>
  const total = Number(so.total_value || 0)
  const parts = Number(so.parts_cost || 0)
  const uber = Number(so.uber_cost || 0)
  const card = osCardGross(so)
  const fee = card > 0 && so.card_net_value != null ? Math.max(card - Number(so.card_net_value), 0) : 0
  const base = Math.max(total - parts - uber - fee, 0)
  const pct = base > 0 ? (amount / base) * 100 : 0
  const rows: [string, string][] = [
    ['Valor do serviço', fmt(total)],
    ...(parts > 0 ? [['Peças', `− ${fmt(parts)}`] as [string, string]] : []),
    ...(uber > 0 ? [['Uber', `− ${fmt(uber)}`] as [string, string]] : []),
    ...(fee > 0 ? [['Taxa da maquininha', `− ${fmt(fee)}`] as [string, string]] : []),
    ['Base', fmt(base)],
    [`% (${so.after_hours ? 'fora do horário' : 'horário comercial'})`, `${pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`],
    ['Comissão', fmt(amount)],
  ]
  return (
    <div className="mx-4 mb-3 rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2 space-y-1">
      {rows.map(([k, v], i) => (
        <div key={k} className={`flex justify-between gap-3 text-xs ${i === rows.length - 1 ? 'pt-1 border-t border-zinc-200 font-bold text-zinc-800' : 'text-zinc-600'}`}>
          <span>{k}</span><span>{v}</span>
        </div>
      ))}
      {one(so.call)?.id && (
        <Link href={`/dashboard/chamados/${one(so.call).id}`} className="block text-xs font-semibold pt-1" style={{ color: 'var(--primary)' }}>Abrir chamado →</Link>
      )}
    </div>
  )
}
