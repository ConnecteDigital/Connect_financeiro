'use client'

import { useState } from 'react'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { ConnectDigitalLogo } from '@/components/logos'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('Email ou senha incorretos.')
      } else {
        window.location.href = '/dashboard'
      }
    } catch {
      setError('Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-zinc-950">
      {/* Left panel - branding (desktop only) */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-zinc-900 p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-orange-500/8 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-orange-500/5 blur-3xl" />
        </div>

        <div className="relative flex items-center gap-3">
          <ConnectDigitalLogo size={38} />
          <div>
            <p className="text-white font-bold text-sm leading-none">Connect Digital</p>
            <p className="text-zinc-500 text-xs mt-0.5">A sua empresa na era digital</p>
          </div>
        </div>

        <div className="relative space-y-8">
          <div className="bg-zinc-800/70 backdrop-blur rounded-2xl p-6 border border-zinc-700/40">
            <div className="flex items-center gap-4 mb-5">
              <ConnectDigitalLogo size={60} />
              <div>
                <p className="text-white font-extrabold text-xl leading-tight">Connecte</p>
                <p className="text-orange-400 text-sm font-semibold mt-0.5">Financeiro</p>
                <p className="text-zinc-500 text-xs mt-1">Sistema de Gestão</p>
              </div>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Sistema de gestão financeira e administrativa desenvolvido pela Connect Digital para controle completo de chamados, clientes e finanças.
            </p>
          </div>

          <div className="space-y-3">
            {[
              'Gestão completa de chamados e OS',
              'Dashboard financeiro em tempo real',
              'Relatórios e exportação em PDF',
              'Controle de clientes e histórico',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                </div>
                <p className="text-zinc-400 text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-zinc-600 text-xs">
          {new Date().getFullYear()} Connect Digital — Todos os direitos reservados
        </p>
      </div>

      {/* Right panel - login */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="lg:hidden flex flex-col items-center gap-4 mb-10">
          <ConnectDigitalLogo size={56} />
          <p className="text-white font-bold text-lg">Connect Digital</p>
          <p className="text-zinc-500 text-sm">Sistema Financeiro</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Bem-vindo de volta</h1>
            <p className="text-zinc-400 text-sm">Acesse o sistema financeiro</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" required
                  className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="..." required
                  className="w-full pl-10 pr-10 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-semibold py-3 rounded-xl transition text-sm mt-2">
              {loading ? 'Entrando...' : 'Entrar no sistema'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center justify-center gap-2">
            <ConnectDigitalLogo size={18} />
            <p className="text-zinc-600 text-xs">Desenvolvido por Connect Digital</p>
          </div>
        </div>
      </div>
    </div>
  )
}
