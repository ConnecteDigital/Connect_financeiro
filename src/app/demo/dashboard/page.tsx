'use client'

import { useState } from 'react'
import { PhoneCall, CheckCircle, TrendingDown, AlertCircle, Clock, Wallet, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { MOCK_CALLS, MOCK_EXPENSES, MOCK_ENTRADAS } from '../data'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const approvedCalls     = MOCK_CALLS.filter(c => c.status === 'aprovado')
const scheduledCalls    = MOCK_CALLS.filter(c => c.status === 'agendado')
const grossRevenue      = approvedCalls.reduce((s, c) => s + (c.total_value ?? 0), 0)
const paidEntradas      = MOCK_ENTRADAS.filter(e => e.status === 'pago').reduce((s, e) => s + e.amount, 0)
const pendingEntradas   = MOCK_ENTRADAS.filter(e => e.status === 'pendente').reduce((s, e) => s + e.amount, 0)
const totalExpenses     = MOCK_EXPENSES.reduce((s, e) => s + e.amount, 0)
const outsourceCosts    = 0
const netRevenue        = grossRevenue - outsourceCosts - totalExpenses
const approvalRate      = Math.round((approvedCalls.length / MOCK_CALLS.length) * 100)
const pendingPayments   = MOCK_CALLS.filter(c => c.payment_status === 'parcial' || c.payment_status === 'pendente')
const pendingExpsList   = MOCK_EXPENSES.filter(e => e.status === 'pendente')

export default function DemoDashboard() {
  const [showReceivables, setShowReceivables] = useState(false)
  const [showFinance, setShowFinance] = useState(false)
  const [showStatus, setShowStatus] = useState(false)

  return (
    <div className="space-y-4 max-w-2xl mx-auto lg:max-w-7xl">

      {/* Hero revenue card */}
      <div className="rounded-3xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
          boxShadow: 'var(--shadow-primary)',
        }}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full opacity-10" style={{ background: 'white' }} />

        <div className="relative p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">Receita Bruta</p>
              <div className="text-3xl font-bold text-white leading-none">
                R$ {fmt(grossRevenue)}
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white/80"
              style={{ background: 'rgba(0,0,0,0.2)' }}>
              Julho de 2026
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2">
            {[
              { label: 'Líquido',   value: netRevenue,      onClick: () => setShowFinance(true) },
              { label: 'A Receber', value: pendingEntradas, onClick: () => setShowReceivables(true) },
              { label: 'Saídas',   value: totalExpenses,   onClick: () => {} },
            ].map((m, i) => (
              <button key={i} type="button" onClick={m.onClick}
                className="rounded-2xl px-3 py-2.5 text-left"
                style={{ background: 'rgba(0,0,0,0.15)' }}>
                <p className="text-white/60 text-[10px] font-medium uppercase tracking-wide">{m.label}</p>
                <p className="text-white font-bold text-sm mt-0.5 tabular">R$ {fmt(m.value)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            icon: PhoneCall, label: 'Chamados', color: 'text-zinc-700',
            value: String(MOCK_CALLS.length),
            sub: `${approvedCalls.length} aprovados`,
            bg: 'var(--surface)', iconBg: 'var(--chip-bg)',
            onClick: () => setShowStatus(true),
          },
          {
            icon: CheckCircle, label: 'Aprovação', color: 'text-emerald-600',
            value: `${approvalRate}%`,
            sub: 'taxa de conversão',
            bg: 'rgba(22,163,74,0.08)', iconBg: 'rgba(22,163,74,0.12)',
            onClick: () => setShowStatus(true),
          },
          {
            icon: AlertCircle, label: 'A Receber', color: 'text-amber-600',
            value: `R$ ${fmt(pendingEntradas)}`,
            sub: 'toque para ver', bg: 'rgba(217,119,6,0.08)', iconBg: 'rgba(217,119,6,0.12)',
            onClick: () => setShowReceivables(true),
          },
          {
            icon: TrendingDown, label: 'Despesas', color: 'text-red-500',
            value: `R$ ${fmt(totalExpenses)}`,
            sub: 'toque para ver', bg: 'rgba(239,68,68,0.07)', iconBg: 'rgba(239,68,68,0.10)',
            onClick: () => {},
          },
        ].map((card, i) => (
          <button key={i} type="button" onClick={card.onClick}
            className="rounded-2xl p-4 flex flex-col gap-2 text-left"
            style={{ background: card.bg, boxShadow: 'var(--shadow-sm)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: card.iconBg }}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">{card.label}</p>
              <p className={`font-bold text-base leading-tight tabular ${card.color}`}>{card.value}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">{card.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Resumo financeiro */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <Wallet className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          <h3 className="font-semibold text-sm flex-1" style={{ color: 'var(--text-primary)' }}>Resumo Financeiro</h3>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Julho de 2026</span>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {[
            { label: 'Receita bruta',       value: grossRevenue,    color: 'var(--text-primary)' },
            { label: 'Custos terceirizados', value: -outsourceCosts, color: '#ef4444' },
            { label: 'Despesas do período',  value: -totalExpenses,  color: '#ef4444' },
            { label: 'Receita líquida',      value: netRevenue,      color: '#16a34a', bold: true },
            { label: 'Recebido',             value: paidEntradas,    color: '#16a34a' },
            { label: 'A receber',            value: pendingEntradas, color: '#d97706' },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between px-4 py-2.5"
              style={{ borderColor: 'var(--border)' }}>
              <span className={`text-sm ${r.bold ? 'font-bold' : 'font-medium'}`}
                style={{ color: r.bold ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {r.label}
              </span>
              <span className={`text-sm tabular ${r.bold ? 'font-bold' : 'font-semibold'}`} style={{ color: r.color }}>
                {`${r.value < 0 ? '- ' : ''}R$ ${fmt(Math.abs(r.value))}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chamados por status */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <BarChart3 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          <h3 className="font-semibold text-sm flex-1" style={{ color: 'var(--text-primary)' }}>Chamados do Período</h3>
          <Link href="/demo/relatorios" className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
            Ver relatórios →
          </Link>
        </div>
        <div className="p-4 space-y-3">
          {[
            { label: 'Aprovados',       value: approvedCalls.length,  color: '#16a34a' },
            { label: 'Agendados',       value: scheduledCalls.length, color: 'var(--primary)' },
            { label: 'Não aprovou',     value: 0,                     color: '#d97706' },
            { label: 'Não quis visita', value: 0,                     color: '#8e8e93' },
            { label: 'Cancelados',      value: 0,                     color: '#ef4444' },
          ].map(s => (
            <div key={s.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                <span className="font-bold tabular" style={{ color: 'var(--text-primary)' }}>{s.value}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-secondary)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${MOCK_CALLS.length ? Math.min((s.value / MOCK_CALLS.length) * 100, 100) : 0}%`,
                    background: s.color,
                  }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notification sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded-2xl overflow-hidden" style={{ background: '#18181b' }}>
          <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <Clock className="w-4 h-4 text-orange-400" />
            <h3 className="font-semibold text-sm text-white flex-1">Agendados Hoje</h3>
            <span className="text-white text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#f97316' }}>
              {scheduledCalls.length}
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {scheduledCalls.map(c => (
              <Link key={c.id} href={`/demo/chamados/${c.id}`}
                className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/50 transition">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(249,115,22,0.15)' }}>
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{c.contact_name}</p>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">{c.service_category}</p>
                  <p className="text-xs text-zinc-600 mt-0.5 truncate">{c.call_address}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: '#18181b' }}>
          <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-sm text-white flex-1">Pagamentos Pendentes</h3>
            <span className="text-white text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#d97706' }}>
              {pendingPayments.length}
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {pendingPayments.map(c => (
              <Link key={c.id} href={`/demo/chamados/${c.id}`}
                className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/50 transition">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(217,119,6,0.15)' }}>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{c.contact_name}</p>
                  <p className="text-xs text-amber-400 font-medium mt-0.5 tabular">
                    R$ {fmt((c.total_value ?? 0) * 0.5)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: '#18181b' }}>
          <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <TrendingDown className="w-4 h-4 text-red-400" />
            <h3 className="font-semibold text-sm text-white flex-1">Contas a Pagar</h3>
            <span className="text-white text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#ef4444' }}>
              {pendingExpsList.length}
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {pendingExpsList.map(e => (
              <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(239,68,68,0.15)' }}>
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{e.description}</p>
                  <p className="text-xs text-red-400 font-medium mt-0.5 tabular">R$ {fmt(e.amount)}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Venc. {new Date(e.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: A Receber */}
      {showReceivables && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReceivables(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{ maxHeight: '80dvh' }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h3 className="font-bold text-slate-800">Valores a Receber</h3>
                <p className="text-xs text-slate-400 mt-0.5">Pagamentos pendentes e parciais</p>
              </div>
              <button onClick={() => setShowReceivables(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <div className="overflow-y-auto divide-y divide-slate-100" style={{ maxHeight: 'calc(80dvh - 80px)' }}>
              {MOCK_ENTRADAS.filter(e => e.status === 'pendente').map(e => (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{e.description}</p>
                    <p className="text-xs text-slate-400">Pendente · Venc. {new Date(e.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                  <p className="text-sm font-bold text-amber-600 tabular">R$ {fmt(e.amount)}</p>
                </div>
              ))}
              <div className="h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Receita Líquida */}
      {showFinance && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFinance(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h3 className="font-bold text-slate-800">Receita Líquida</h3>
                <p className="text-xs text-slate-400 mt-0.5">Julho de 2026</p>
              </div>
              <button onClick={() => setShowFinance(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <div className="px-5 pb-6 space-y-1">
              {[
                { label: 'Receita bruta',       value: grossRevenue,    color: 'var(--text-primary)' },
                { label: 'Custos terceirizados', value: -outsourceCosts, color: '#ef4444' },
                { label: 'Despesas do período',  value: -totalExpenses,  color: '#ef4444' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-2.5 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">{r.label}</span>
                  <span className="text-sm font-semibold tabular" style={{ color: r.color }}>
                    {`${r.value < 0 ? '- ' : ''}R$ ${fmt(Math.abs(r.value))}`}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between py-3">
                <span className="text-base font-bold text-slate-800">Líquido</span>
                <span className="text-base font-bold tabular" style={{ color: '#16a34a' }}>R$ {fmt(netRevenue)}</span>
              </div>
              <div className="h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Chamados por status */}
      {showStatus && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowStatus(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h3 className="font-bold text-slate-800">Chamados do Período</h3>
                <p className="text-xs text-slate-400 mt-0.5">Julho de 2026 · {MOCK_CALLS.length} no total</p>
              </div>
              <button onClick={() => setShowStatus(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <div className="px-5 pb-4 space-y-1">
              {[
                { label: 'Aprovados',       value: approvedCalls.length,  color: '#16a34a', icon: CheckCircle },
                { label: 'Agendados',       value: scheduledCalls.length, color: '#3b82f6', icon: Clock },
                { label: 'Não aprovou',     value: 0,                     color: '#d97706', icon: AlertCircle },
                { label: 'Não quis visita', value: 0,                     color: '#8e8e93', icon: AlertCircle },
                { label: 'Cancelados',      value: 0,                     color: '#ef4444', icon: AlertCircle },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3 py-2.5 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${s.color}1f` }}>
                    <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <span className="flex-1 text-sm font-medium text-slate-600">{s.label}</span>
                  <span className="text-base font-bold tabular text-slate-800">{s.value}</span>
                </div>
              ))}
              <Link href="/demo/chamados" onClick={() => setShowStatus(false)}
                className="block text-center text-sm font-semibold py-3" style={{ color: 'var(--primary)' }}>
                Ver todos os chamados →
              </Link>
              <div className="h-2" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
