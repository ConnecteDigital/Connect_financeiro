'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, PackagePlus, TrendingDown, ArrowUpCircle, ArrowDownCircle, Package, Refrigerator, ChevronRight } from 'lucide-react'
import { useTenant } from '@/lib/tenant-context'
import { getLojaItems, getLojaSummary, type LojaItem, type LojaSummary } from '@/lib/db/loja'
import { periodOf, ptDate, type PeriodMode } from '@/lib/period'
import PeriodNav from '@/components/PeriodNav'
import { SellModal, ReceiveModal } from '@/components/LojaModals'
import { toastSuccess } from '@/components/Toast'

const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

// Início da conta Loja: quanto entrou, quanto saiu, o que tem no estoque
// e atalhos pra registrar venda, chegada de mercadoria e gasto.
export default function LojaHome() {
  const { tenant } = useTenant()
  const [mode, setMode] = useState<PeriodMode>('mes')
  const [offset, setOffset] = useState(0)
  const period = periodOf(mode, offset)
  const [sum, setSum] = useState<LojaSummary | null>(null)
  const [items, setItems] = useState<LojaItem[]>([])
  const [modal, setModal] = useState<'sell' | 'receive' | null>(null)

  const load = useCallback(() => {
    getLojaSummary(period.start, period.end).then(setSum).catch(console.error)
    getLojaItems().then(setItems).catch(console.error)
  }, [period.start, period.end])
  useEffect(() => { load() }, [load])

  const machines = items.filter(i => i.kind === 'maquina')
  const parts = items.filter(i => i.kind === 'peca')
  const units = (l: LojaItem[]) => l.reduce((s, i) => s + i.quantity, 0)
  const value = (l: LojaItem[]) => l.reduce((s, i) => s + i.quantity * i.unit_value, 0)
  const saldo = (sum?.entradas ?? 0) - (sum?.saidas ?? 0)
  const lowStock = items.filter(i => i.quantity <= 0)

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <p className="text-sm text-zinc-500">{tenant?.name}</p>
        <h1 className="text-2xl font-bold text-zinc-900">Olá!</h1>
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => setModal('sell')} className="rounded-2xl bg-emerald-500 text-white p-3 text-left shadow-sm active:scale-[0.98] transition">
          <ShoppingCart className="w-5 h-5" />
          <p className="text-sm font-bold mt-1.5 leading-tight">Vendi</p>
          <p className="text-[11px] opacity-90">máquina ou peça</p>
        </button>
        <button type="button" onClick={() => setModal('receive')} className="rounded-2xl bg-orange-500 text-white p-3 text-left shadow-sm active:scale-[0.98] transition">
          <PackagePlus className="w-5 h-5" />
          <p className="text-sm font-bold mt-1.5 leading-tight">Chegou</p>
          <p className="text-[11px] opacity-90">mercadoria nova</p>
        </button>
        <Link href="/dashboard/financeiro" className="rounded-2xl bg-zinc-800 text-white p-3 text-left shadow-sm active:scale-[0.98] transition">
          <TrendingDown className="w-5 h-5" />
          <p className="text-sm font-bold mt-1.5 leading-tight">Gastei</p>
          <p className="text-[11px] opacity-90">lançar saída</p>
        </Link>
      </div>

      <PeriodNav mode={mode} offset={offset} label={period.label} onMode={setMode} onOffset={setOffset} />

      {/* Entrou / Saiu / Saldo */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-3">
          <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
          <p className="text-[11px] text-zinc-500 mt-1">Entrou</p>
          <p className="text-sm sm:text-base font-bold text-emerald-600 whitespace-nowrap">{sum ? fmt(sum.entradas) : '—'}</p>
          {!!sum?.entradasPendentes && <p className="text-[10px] text-amber-600">+ {fmt(sum.entradasPendentes)} a receber</p>}
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-3">
          <ArrowDownCircle className="w-5 h-5 text-red-500" />
          <p className="text-[11px] text-zinc-500 mt-1">Saiu</p>
          <p className="text-sm sm:text-base font-bold text-red-500 whitespace-nowrap">{sum ? fmt(sum.saidas) : '—'}</p>
          {!!sum?.saidasPendentes && <p className="text-[10px] text-amber-600">+ {fmt(sum.saidasPendentes)} a pagar</p>}
        </div>
        <div className="rounded-2xl p-3 text-white shadow-sm" style={{ background: saldo >= 0 ? 'var(--primary)' : '#dc2626' }}>
          <p className="text-[11px] opacity-90 mt-6">Saldo</p>
          <p className="text-sm sm:text-base font-bold whitespace-nowrap">{sum ? fmt(saldo) : '—'}</p>
          {!!sum && <p className="text-[10px] opacity-90">{sum.vendas} venda{sum.vendas !== 1 ? 's' : ''}</p>}
        </div>
      </div>

      {/* Estoque */}
      <Link href="/dashboard/estoque" className="block bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <p className="text-sm font-semibold text-zinc-700">Estoque</p>
          <ChevronRight className="w-4 h-4 text-zinc-300" />
        </div>
        <div className="grid grid-cols-2 divide-x divide-zinc-100">
          {([['Máquinas', machines, Refrigerator], ['Peças', parts, Package]] as const).map(([l, list, Icon]) => (
            <div key={l} className="px-4 py-3">
              <p className="text-xs text-zinc-500 flex items-center gap-1"><Icon className="w-3.5 h-3.5" /> {l}</p>
              <p className="text-xl font-bold text-zinc-900">{units(list)} <span className="text-xs font-medium text-zinc-500">un.</span></p>
              <p className="text-[11px] text-zinc-500">{fmt(value(list))} em custo</p>
            </div>
          ))}
        </div>
        {lowStock.length > 0 && (
          <p className="px-4 py-2 bg-red-50 text-xs text-red-600 font-medium">Sem estoque: {lowStock.slice(0, 4).map(i => i.name).join(', ')}{lowStock.length > 4 ? '...' : ''}</p>
        )}
      </Link>

      {/* Últimas movimentações */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <p className="text-sm font-semibold text-zinc-700">Movimentações</p>
          <Link href="/dashboard/financeiro" className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>Ver tudo</Link>
        </div>
        {!sum ? (
          <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-zinc-50 rounded-lg animate-pulse" />)}</div>
        ) : sum.recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-400">Nada lançado neste período</p>
        ) : (
          <div className="divide-y divide-zinc-50">
            {sum.recent.map(r => (
              <div key={`${r.kind}-${r.id}`} className="flex items-center gap-3 px-4 py-2.5">
                {r.kind === 'entrada' ? <ArrowUpCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" /> : <ArrowDownCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-800 truncate">{r.description}</p>
                  <p className="text-xs text-zinc-400">{ptDate(r.date)}{r.category ? ` · ${r.category}` : ''}{r.status !== 'pago' ? ' · pendente' : ''}</p>
                </div>
                <p className={`text-sm font-bold flex-shrink-0 ${r.kind === 'entrada' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {r.kind === 'entrada' ? '+' : '−'} {fmt(r.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal === 'sell' && <SellModal items={items} onClose={() => setModal(null)} onSaved={() => { setModal(null); toastSuccess('Venda registrada!'); load() }} />}
      {modal === 'receive' && <ReceiveModal items={items} onClose={() => setModal(null)} onSaved={() => { setModal(null); toastSuccess('Estoque atualizado!'); load() }} />}
    </div>
  )
}
