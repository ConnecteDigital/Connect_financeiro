'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, PhoneCall, Users, TrendingDown,
  BarChart3, Settings, LogOut, Building2,
  Plus, MoreHorizontal, UserCog, Moon, Sun, Sparkles,
} from 'lucide-react'
import { ConnectDigitalLogo } from '@/components/logos'
import { useTenant } from '@/lib/tenant-context'
import { TenantProvider } from '@/lib/tenant-context'
import OnboardingWizard from '@/components/OnboardingWizard'

const mainNav = [
  { href: '/dashboard',          label: 'Início',   icon: LayoutDashboard },
  { href: '/dashboard/chamados', label: 'Chamados', icon: PhoneCall },
  { href: '/dashboard/saidas',   label: 'Saídas',   icon: TrendingDown },
]

const moreNav = [
  { href: '/dashboard/chat',         label: 'Assistente',   icon: Sparkles },
  { href: '/dashboard/relatorios',   label: 'Relatórios',   icon: BarChart3 },
  { href: '/dashboard/clientes',     label: 'Clientes',     icon: Users },
  { href: '/dashboard/fornecedores', label: 'Fornecedores', icon: Building2 },
  { href: '/dashboard/auxiliares',   label: 'Comissões',    icon: UserCog },
  { href: '/dashboard/configuracoes',label: 'Configurações',icon: Settings },
]

const allNav = [...mainNav, ...moreNav]

async function handleLogout() {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  await supabase.auth.signOut()
  window.location.href = '/'
}

function TenantAvatar({ size = 36 }: { size?: number }) {
  const { tenant } = useTenant()
  if (tenant?.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={tenant.logo_url}
        alt={tenant.name}
        className="rounded-xl object-contain flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4, background: 'var(--primary)' }}
    >
      {tenant?.name?.[0]?.toUpperCase() ?? 'C'}
    </div>
  )
}

/* ── Mobile bottom nav ───────────────────────────────────────── */
function BottomNav({ onMoreClick, moreOpen, visible }: { onMoreClick: () => void; moreOpen: boolean; visible: boolean }) {
  const pathname = usePathname()

  function isActive(href: string) {
    return href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ease-out"
      style={{ transform: visible ? 'translateY(0)' : 'translateY(110%)' }}
    >
      {/* Safe-area spacer */}
      <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Floating pill */}
        <div className="mx-3 mb-3 rounded-2xl"
          style={{
            background: 'var(--nav-bg)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 0 0 0.5px var(--border)',
          }}>
          <div className="flex items-end justify-around px-1 pt-2 pb-2">
            {/* Left items */}
            {mainNav.slice(0, 2).map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <Link key={href} href={href}
                  className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all min-w-0"
                  style={{ color: active ? 'var(--primary)' : '#8e8e93' }}>
                  <div className="w-10 h-7 flex items-center justify-center rounded-xl transition-all"
                    style={active ? { background: 'rgba(var(--primary-rgb),0.1)' } : {}}>
                    <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
                  </div>
                  <span className="text-[10px] font-medium leading-none truncate">{label}</span>
                </Link>
              )
            })}

            {/* Center FAB */}
            <Link href="/dashboard/chamados/novo"
              className="flex flex-col items-center gap-0.5 px-2 py-1 -mt-5 relative"
              style={{ color: 'var(--primary)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                style={{ background: 'var(--primary)', boxShadow: 'var(--shadow-primary)' }}>
                <Plus className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-medium leading-none mt-0.5" style={{ color: 'var(--primary)' }}>Novo</span>
            </Link>

            {/* Right: Saídas */}
            {mainNav.slice(2).map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <Link key={href} href={href}
                  className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all min-w-0"
                  style={{ color: active ? 'var(--primary)' : '#8e8e93' }}>
                  <div className="w-10 h-7 flex items-center justify-center rounded-xl transition-all"
                    style={active ? { background: 'rgba(var(--primary-rgb),0.1)' } : {}}>
                    <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
                  </div>
                  <span className="text-[10px] font-medium leading-none truncate">{label}</span>
                </Link>
              )
            })}

            {/* Mais */}
            <button
              onClick={onMoreClick}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all min-w-0"
              style={{ color: moreOpen ? 'var(--primary)' : '#8e8e93' }}>
              <div className="w-10 h-7 flex items-center justify-center rounded-xl transition-all"
                style={moreOpen ? { background: 'rgba(var(--primary-rgb),0.1)' } : {}}>
                <MoreHorizontal className="w-5 h-5" strokeWidth={moreOpen ? 2.2 : 1.8} />
              </div>
              <span className="text-[10px] font-medium leading-none">Mais</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

/* ── "Mais" drawer (slide up) ───────────────────────────────── */
function MoreDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()

  return (
    <>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={onClose} />
      )}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out"
        style={{
          transform: open ? 'translateY(0)' : 'translateY(110%)',
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
            const active = pathname.startsWith(href)
            return (
              <Link key={href} href={href} onClick={onClose}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all"
                style={{
                  background: active ? 'rgba(var(--primary-rgb),0.08)' : 'var(--surface-secondary)',
                  color: active ? 'var(--primary)' : 'var(--text-primary)',
                }}>
                <Icon className="w-6 h-6" strokeWidth={1.8} />
                <span className="text-[11px] font-medium text-center leading-tight">{label}</span>
              </Link>
            )
          })}
        </div>
        <div className="px-4 mt-2 border-t border-zinc-100 pt-3">
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-medium text-red-500 bg-red-50 transition active:scale-95">
            <LogOut className="w-5 h-5" />
            Sair da conta
          </button>
        </div>
      </div>
    </>
  )
}

/* ── Desktop sidebar ─────────────────────────────────────────── */
function Sidebar({ theme, onToggleTheme }: { theme: 'light' | 'dark'; onToggleTheme: () => void }) {
  const pathname = usePathname()
  const { tenant } = useTenant()

  function isActive(href: string) {
    return href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 flex-shrink-0"
      style={{
        background: '#18181b',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>

      {/* Brand */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <TenantAvatar size={42} />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">
              {tenant?.name ?? '…'}
            </p>
            <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--primary)' }}>Financeiro</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {allNav.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? '#fff' : '#a1a1aa',
              }}>
              <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5 mb-3 px-1">
          <ConnectDigitalLogo size={20} />
          <div>
            <p className="text-zinc-600 text-[10px] leading-none">Desenvolvido por</p>
            <p className="text-zinc-400 text-xs font-semibold mt-0.5">Connect Digital</p>
          </div>
        </div>
        <button onClick={onToggleTheme}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-800 hover:text-white transition">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        </button>
        <button onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-800 hover:text-white transition">
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}

/* ── Mobile top header ───────────────────────────────────────── */
function MobileHeader({ visible, theme, onToggleTheme }: { visible: boolean; theme: 'light' | 'dark'; onToggleTheme: () => void }) {
  const { tenant } = useTenant()
  const pathname = usePathname()

  const currentPage = allNav.find(n =>
    n.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(n.href)
  )

  return (
    <header className="lg:hidden flex items-center justify-between px-4 transition-transform duration-300 ease-out"
      style={{
        paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        paddingBottom: '12px',
        background: 'var(--header-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
      }}>
      <div className="flex items-center gap-2.5">
        <TenantAvatar size={32} />
        <div>
          <p className="text-xs font-medium leading-none" style={{ color: 'var(--text-secondary)' }}>
            {tenant?.name}
          </p>
          <p className="text-base font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {currentPage?.label ?? 'Dashboard'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onToggleTheme}
          className="w-9 h-9 rounded-full flex items-center justify-center transition"
          style={{ background: 'var(--chip-bg)' }}
          aria-label="Alternar modo escuro">
          {theme === 'dark'
            ? <Sun className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            : <Moon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />}
        </button>
        <Link href="/dashboard/configuracoes"
          className="w-9 h-9 rounded-full flex items-center justify-center transition"
          style={{ background: 'var(--chip-bg)' }}>
          <Settings className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        </Link>
      </div>
    </header>
  )
}

/* ── Inner layout (uses tenant context) ─────────────────────── */
function DashboardInner({ children }: { children: React.ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [navVisible, setNavVisible] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const { tenant } = useTenant()
  const pathname = usePathname()
  const mainRef = useRef<HTMLElement>(null)
  const lastScrollY = useRef(0)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isPrintPage = pathname.includes('/imprimir')
  // Documentos (OS, romaneio) são sempre claros, mesmo no modo escuro
  const forceLight = isPrintPage || pathname.includes('/romaneio')

  // Show onboarding only on first visit
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('connect_onboarding_done')) {
      setShowOnboarding(true)
    }
  }, [])

  // Theme: load preference + apply to <html>. Print pages are always light.
  useEffect(() => {
    const saved = localStorage.getItem('connect_theme')
    if (saved === 'dark' || saved === 'light') setTheme(saved)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', forceLight ? 'light' : theme)
  }, [theme, forceLight])

  function toggleTheme() {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark'
      localStorage.setItem('connect_theme', next)
      return next
    })
  }

  // Apply tenant primary color as CSS variable
  useEffect(() => {
    if (tenant?.primary_color) {
      document.documentElement.style.setProperty('--primary', tenant.primary_color)
      const hex = tenant.primary_color.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`)
      document.documentElement.style.setProperty('--primary-dark', darkenHex(tenant.primary_color, 0.15))
      // No escuro, o tom pastel claro vira um tint translúcido da cor
      document.documentElement.style.setProperty(
        '--primary-light',
        theme === 'dark' && !forceLight
          ? `rgba(${r}, ${g}, ${b}, 0.16)`
          : lightenHex(tenant.primary_color, 0.94)
      )
    }
  }, [tenant?.primary_color, theme, forceLight])

  // Hide-on-scroll: attach listener to the main scroll container
  useEffect(() => {
    const el = mainRef.current
    if (!el) return

    function onScroll() {
      const y = el!.scrollTop
      const delta = y - lastScrollY.current

      if (delta > 8) {
        setNavVisible(false)
      } else if (delta < -8 || y < 40) {
        setNavVisible(true)
      }

      lastScrollY.current = y

      // Always show nav when scroll stops
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
      scrollTimer.current = setTimeout(() => setNavVisible(true), 1500)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
    }
  }, [])

  // Close more drawer on route change
  useEffect(() => { setMoreOpen(false) }, [pathname])

  if (isPrintPage) {
    return (
      <div className="min-h-screen bg-white">
        {children}
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      <Sidebar theme={theme} onToggleTheme={toggleTheme} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileHeader visible={navVisible} theme={theme} onToggleTheme={toggleTheme} />

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto pt-[calc(64px_+_env(safe-area-inset-top,0px))] lg:pt-0"
          style={{
            paddingBottom: 'calc(var(--bottom-nav-height) + var(--safe-bottom) + 16px)',
          }}>
          <div className="page-enter p-4 lg:p-6 max-w-7xl mx-auto lg:pb-6">
            {children}
          </div>
        </main>
      </div>

      <BottomNav onMoreClick={() => setMoreOpen(o => !o)} moreOpen={moreOpen} visible={navVisible} />
      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />

      {showOnboarding && tenant && (
        <OnboardingWizard
          tenantId={tenant.id}
          initialName={tenant.name}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
    </div>
  )
}

/* ── Color helpers ───────────────────────────────────────────── */
function darkenHex(hex: string, amount: number) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (n >> 16) - Math.round(255 * amount))
  const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * amount))
  const b = Math.max(0, (n & 0xff) - Math.round(255 * amount))
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

function lightenHex(hex: string, amount: number) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.round(((n >> 16) + (255 - (n >> 16))) * amount + (n >> 16) * (1 - amount)))
  const g = Math.min(255, Math.round((((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff))) * amount + ((n >> 8) & 0xff) * (1 - amount)))
  const b = Math.min(255, Math.round(((n & 0xff) + (255 - (n & 0xff))) * amount + (n & 0xff) * (1 - amount)))
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <DashboardInner>{children}</DashboardInner>
    </TenantProvider>
  )
}
