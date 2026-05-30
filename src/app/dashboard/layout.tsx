'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, PhoneCall, Users, TrendingDown,
  BarChart3, Settings, LogOut, Menu, X
} from 'lucide-react'
import { ConnectDigitalLogo, LíderLogo } from '@/components/logos'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/chamados', label: 'Chamados', icon: PhoneCall },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/saidas', label: 'Saídas', icon: TrendingDown },
  { href: '/dashboard/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
]

async function handleLogout() {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  await supabase.auth.signOut()
  window.location.href = '/'
}


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        flex flex-col w-64 bg-zinc-900
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo area */}
        <div className="px-4 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <LíderLogo size={40} className="rounded-xl flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-none">LÍDER</p>
              <p className="text-orange-400 text-xs mt-0.5 font-medium">Financeiro</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-zinc-500 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <div className="h-px flex-1 bg-zinc-800" />
            <p className="text-zinc-600 text-xs">Connect Digital</p>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-orange-500 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Connect Digital branding */}
        <div className="px-4 py-3 border-t border-zinc-800">
          <div className="flex items-center gap-2 mb-3">
            <ConnectDigitalLogo size={22} />
            <div>
              <p className="text-zinc-500 text-xs leading-none">Desenvolvido por</p>
              <p className="text-zinc-300 text-xs font-semibold mt-0.5">Connect Digital</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-zinc-500 hover:bg-zinc-800 hover:text-white transition">
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <button onClick={() => setSidebarOpen(true)} className="text-zinc-400 hover:text-white transition">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <LíderLogo size={28} className="rounded-lg flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-none">LÍDER</p>
              <p className="text-orange-400 text-xs">Connect Digital</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
