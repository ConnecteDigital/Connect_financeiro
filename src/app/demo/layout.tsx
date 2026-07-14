'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, PhoneCall, Wallet, BarChart3,
  Users, Settings, LogOut, Moon, Sun, MoreHorizontal, Plus,
} from 'lucide-react'

const COMPANY = 'Nome da Empresa'
const PRIMARY = '#2563eb'

const nav = [
  { href: '/demo/dashboard',   label: 'Início',      icon: LayoutDashboard },
  { href: '/demo/chamados',    label: 'Chamados',    icon: PhoneCall },
  { href: '/demo/financeiro',  label: 'Financeiro',  icon: Wallet },
  { href: '/demo/relatorios',  label: 'Relatórios',  icon: BarChart3 },
  { href: '/demo/clientes',    label: 'Clientes',    icon: Users },
]

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [moreOpen, setMoreOpen] = useState(false)
  const isPrint = pathname.includes('/imprimir')

  // Auth guard
  useEffect(() => {
    if (pathname === '/demo') return
    if (typeof window !== 'undefined' && !sessionStorage.getItem('demo_access')) {
      router.replace('/demo')
    }
  }, [pathname, router])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.setProperty('--primary', PRIMARY)
    document.documentElement.style.setProperty('--primary-rgb', '37, 99, 235')
  }, [theme])

  function isActive(href: string) {
    return href === '/demo/dashboard' ? pathname === '/demo/dashboard' : pathname.startsWith(href)
  }

  if (pathname === '/demo') return <>{children}</>

  if (isPrint) return <div className="min-h-screen bg-white">{children}</div>

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0" style={{ background: '#18181b', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ background: PRIMARY }}>{COMPANY[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight truncate">{COMPANY}</p>
              <p className="text-xs mt-0.5 font-medium" style={{ color: PRIMARY }}>Demonstração</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: active ? PRIMARY : 'transparent', color: active ? '#fff' : '#a1a1aa' }}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-800 hover:text-white transition mb-1">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          </button>
          <Link href="/demo"
            onClick={() => sessionStorage.removeItem('demo_access')}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-800 hover:text-white transition">
            <LogOut className="w-4 h-4" />
            Sair do Demo
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-30"
          style={{ background: 'var(--header-bg)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: PRIMARY }}>{COMPANY[0]}</div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{COMPANY}</p>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {nav.find(n => isActive(n.href))?.label ?? 'Demo'}
              </p>
            </div>
          </div>
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--chip-bg)' }}>
            {theme === 'dark' ? <Sun className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} /> : <Moon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ paddingBottom: '90px' }}>
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="mx-3 mb-3 rounded-2xl" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 0 0 0.5px var(--border)' }}>
          <div className="flex items-end justify-around px-1 pt-2 pb-2">
            {nav.slice(0, 2).map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <Link key={href} href={href} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl" style={{ color: active ? PRIMARY : '#8e8e93' }}>
                  <div className="w-10 h-7 flex items-center justify-center rounded-xl" style={active ? { background: 'rgba(37,99,235,0.1)' } : {}}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              )
            })}
            <div className="flex flex-col items-center gap-0.5 px-2 py-1 -mt-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white opacity-40 cursor-not-allowed"
                style={{ background: PRIMARY }}>
                <Plus className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-medium mt-0.5" style={{ color: PRIMARY }}>Novo</span>
            </div>
            {nav.slice(2, 3).map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <Link key={href} href={href} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl" style={{ color: active ? PRIMARY : '#8e8e93' }}>
                  <div className="w-10 h-7 flex items-center justify-center rounded-xl" style={active ? { background: 'rgba(37,99,235,0.1)' } : {}}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              )
            })}
            <button onClick={() => setMoreOpen(v => !v)} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl" style={{ color: moreOpen ? PRIMARY : '#8e8e93' }}>
              <div className="w-10 h-7 flex items-center justify-center rounded-xl">
                <MoreHorizontal className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium">Mais</span>
            </button>
          </div>
        </div>
        {moreOpen && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setMoreOpen(false)} />
            <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-4 pb-8 grid grid-cols-4 gap-3"
              style={{ background: 'var(--drawer-bg)', backdropFilter: 'blur(20px)' }}>
              {nav.slice(3).map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl"
                  style={{ background: 'var(--surface-secondary)', color: 'var(--text-primary)' }}>
                  <Icon className="w-6 h-6" />
                  <span className="text-[11px] font-medium text-center">{label}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </nav>
    </div>
  )
}
