'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, PhoneCall, Wallet, BarChart3,
  Users, Settings, LogOut, Moon, Sun, MoreHorizontal, Plus,
  FileText, Building2, UserCog, Sparkles,
} from 'lucide-react'
import { COMPANY } from './data'

const PRIMARY = '#2563eb'

const mainNav = [
  { href: '/demo/dashboard',  label: 'Início',     icon: LayoutDashboard },
  { href: '/demo/chamados',   label: 'Chamados',   icon: PhoneCall },
  { href: '/demo/financeiro', label: 'Financeiro', icon: Wallet },
]

const moreNav = [
  { href: '/demo/orcamentos',    label: 'Orçamentos',   icon: FileText },
  { href: '/demo/relatorios',    label: 'Relatórios',   icon: BarChart3 },
  { href: '/demo/clientes',      label: 'Clientes',     icon: Users },
  { href: '/demo/fornecedores',  label: 'Fornecedores', icon: Building2 },
  { href: '/demo/auxiliares',    label: 'Comissões',    icon: UserCog },
  { href: '/demo/configuracoes', label: 'Configurações',icon: Settings },
]

const allNav = [...mainNav, ...moreNav]

export default function DemoLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [moreOpen, setMoreOpen] = useState(false)
  const [navVisible, setNavVisible] = useState(true)
  const mainRef = useRef<HTMLElement>(null)
  const lastScrollY = useRef(0)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isPrint = pathname.includes('/imprimir') || pathname.includes('/romaneio')

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
    document.documentElement.style.setProperty('--primary-dark', '#1d4ed8')
    document.documentElement.style.setProperty('--shadow-primary', '0 4px 20px rgba(37,99,235,0.35)')
  }, [theme])

  // Hide-on-scroll
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    function onScroll() {
      const y = el!.scrollTop
      const delta = y - lastScrollY.current
      if (delta > 8) setNavVisible(false)
      else if (delta < -8 || y < 40) setNavVisible(true)
      lastScrollY.current = y
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
      scrollTimer.current = setTimeout(() => setNavVisible(true), 1500)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); if (scrollTimer.current) clearTimeout(scrollTimer.current) }
  }, [])

  useEffect(() => { setMoreOpen(false) }, [pathname])

  function isActive(href: string) {
    return href === '/demo/dashboard' ? pathname === '/demo/dashboard' : pathname.startsWith(href)
  }

  if (pathname === '/demo') return <>{children}</>

  if (isPrint) return <div className="min-h-screen bg-white">{children}</div>

  const currentPage = allNav.find(n => isActive(n.href))

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0"
        style={{ background: '#18181b', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ background: PRIMARY }}>{COMPANY[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight truncate">{COMPANY}</p>
              <p className="text-xs mt-0.5 font-medium" style={{ color: PRIMARY }}>Demonstração</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {allNav.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: active ? PRIMARY : 'transparent', color: active ? '#fff' : '#a1a1aa' }}>
                <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.2 : 1.8} />
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

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 transition-transform duration-300 ease-out"
          style={{
            paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
            paddingBottom: '12px',
            background: 'var(--header-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border)',
            position: 'fixed',
            top: 0, left: 0, right: 0,
            zIndex: 30,
            transform: navVisible ? 'translateY(0)' : 'translateY(-100%)',
          }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: PRIMARY }}>{COMPANY[0]}</div>
            <div>
              <p className="text-xs font-medium leading-none" style={{ color: 'var(--text-secondary)' }}>{COMPANY}</p>
              <p className="text-base font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {currentPage?.label ?? 'Demo'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 rounded-full flex items-center justify-center transition"
              style={{ background: 'var(--chip-bg)' }}>
              {theme === 'dark'
                ? <Sun className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                : <Moon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />}
            </button>
            <Link href="/demo/configuracoes"
              className="w-9 h-9 rounded-full flex items-center justify-center transition"
              style={{ background: 'var(--chip-bg)' }}>
              <Settings className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </Link>
          </div>
        </header>

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto pt-[calc(80px_+_env(safe-area-inset-top,0px))] lg:pt-0"
          style={{ paddingBottom: 'calc(var(--bottom-nav-height, 90px) + 16px)' }}>
          <div className="p-4 lg:p-6 max-w-7xl mx-auto lg:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ease-out"
        style={{ transform: navVisible ? 'translateY(0)' : 'translateY(110%)' }}>
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="mx-3 mb-3 rounded-2xl"
            style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 0 0 0.5px var(--border)' }}>
            <div className="flex items-end justify-around px-1 pt-2 pb-2">
              {/* Left: Início + Chamados */}
              {mainNav.slice(0, 2).map(({ href, label, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link key={href} href={href}
                    className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl"
                    style={{ color: active ? PRIMARY : '#8e8e93' }}>
                    <div className="w-10 h-7 flex items-center justify-center rounded-xl"
                      style={active ? { background: 'rgba(37,99,235,0.1)' } : {}}>
                      <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
                    </div>
                    <span className="text-[10px] font-medium leading-none">{label}</span>
                  </Link>
                )
              })}

              {/* Center FAB */}
              <Link href="/demo/chamados/novo" className="flex flex-col items-center gap-0.5 px-2 py-1 -mt-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                  style={{ background: PRIMARY, boxShadow: `0 4px 16px rgba(37,99,235,0.4)` }}>
                  <Plus className="w-7 h-7" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-medium mt-0.5" style={{ color: PRIMARY }}>Novo</span>
              </Link>

              {/* Financeiro */}
              {mainNav.slice(2).map(({ href, label, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link key={href} href={href}
                    className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl"
                    style={{ color: active ? PRIMARY : '#8e8e93' }}>
                    <div className="w-10 h-7 flex items-center justify-center rounded-xl"
                      style={active ? { background: 'rgba(37,99,235,0.1)' } : {}}>
                      <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
                    </div>
                    <span className="text-[10px] font-medium leading-none">{label}</span>
                  </Link>
                )
              })}

              {/* Mais */}
              <button onClick={() => setMoreOpen(v => !v)}
                className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl"
                style={{ color: moreOpen ? PRIMARY : '#8e8e93' }}>
                <div className="w-10 h-7 flex items-center justify-center rounded-xl"
                  style={moreOpen ? { background: 'rgba(37,99,235,0.1)' } : {}}>
                  <MoreHorizontal className="w-5 h-5" strokeWidth={moreOpen ? 2.2 : 1.8} />
                </div>
                <span className="text-[10px] font-medium leading-none">Mais</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* "Mais" drawer */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
      )}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out"
        style={{
          transform: moreOpen ? 'translateY(0)' : 'translateY(110%)',
          background: 'var(--drawer-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        }}>
        <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto mt-3 mb-4" />
        <div className="px-4 pb-2 grid grid-cols-4 gap-3">
          {moreNav.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href} onClick={() => setMoreOpen(false)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all"
                style={{
                  background: active ? `rgba(37,99,235,0.08)` : 'var(--surface-secondary)',
                  color: active ? PRIMARY : 'var(--text-primary)',
                }}>
                <Icon className="w-6 h-6" strokeWidth={1.8} />
                <span className="text-[11px] font-medium text-center leading-tight">{label}</span>
              </Link>
            )
          })}
        </div>
        <div className="px-4 mt-2 border-t border-zinc-100 pt-3">
          <Link href="/demo"
            onClick={() => { sessionStorage.removeItem('demo_access'); setMoreOpen(false) }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-medium text-red-500 bg-red-50 transition active:scale-95">
            <LogOut className="w-5 h-5" />
            Sair do Demo
          </Link>
        </div>
      </div>

      {/* Connect IA floating button (desktop) */}
      <Link href="/demo/dashboard"
        className="hidden lg:flex fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', boxShadow: '0 8px 24px rgba(99,102,241,0.45)' }}
        title="Connect IA (Demo)">
        <Sparkles className="w-6 h-6 text-white" />
      </Link>
    </div>
  )
}
