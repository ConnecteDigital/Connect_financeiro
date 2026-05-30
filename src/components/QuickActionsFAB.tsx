'use client'

import { useState } from 'react'
import { Plus, PhoneCall, TrendingDown, BarChart3, Users, X } from 'lucide-react'
import Link from 'next/link'

const actions = [
  { href: '/dashboard/chamados/novo', icon: PhoneCall, label: 'Novo Chamado', color: 'bg-orange-500' },
  { href: '/dashboard/clientes/novo', icon: Users, label: 'Novo Cliente', color: 'bg-zinc-700' },
  { href: '/dashboard/saidas/novo', icon: TrendingDown, label: 'Lancar Saida', color: 'bg-zinc-700' },
  { href: '/dashboard/relatorios', icon: BarChart3, label: 'Relatorios', color: 'bg-zinc-700' },
]

export default function QuickActionsFAB() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setOpen(false)} />
      )}

      {/* FAB container */}
      <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end gap-3 lg:hidden">
        {/* Action items */}
        {open && (
          <div className="flex flex-col items-end gap-2.5">
            {actions.map((action, i) => (
              <Link key={i} href={action.href} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 ${action.color} text-white pl-4 pr-5 py-3 rounded-full shadow-lg active:scale-95 transition-transform`}
                style={{ animation: `slideUp 0.15s ease ${i * 0.04}s both` }}>
                <action.icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-semibold whitespace-nowrap">{action.label}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Main FAB button */}
        <button onClick={() => setOpen(!open)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95 ${
            open ? 'bg-zinc-900 rotate-45' : 'bg-orange-500'
          }`}>
          {open
            ? <X className="w-6 h-6 text-white" />
            : <Plus className="w-6 h-6 text-white" />
          }
        </button>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}
