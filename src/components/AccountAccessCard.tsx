'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { KeyRound, LogOut, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant-context'

// Acesso da conta: quem está logado, trocar a senha e sair. Usado na
// tela "Minha conta" do técnico e nas Configurações do gestor (Rodrigues).
export default function AccountAccessCard() {
  const { profileName } = useTenant()
  const [email, setEmail] = useState('')
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [])

  async function logout() {
    if (!confirm('Sair da conta neste aparelho?')) return
    setLeaving(true)
    await createClient().auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(var(--primary-rgb),0.1)' }}>
          <UserRound className="w-5 h-5" style={{ color: 'var(--primary)' }} />
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-zinc-900 truncate">{profileName || 'Minha conta'}</p>
          {email && <p className="text-sm text-zinc-500 truncate">{email}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Link href="/redefinir-senha"
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-zinc-700 bg-zinc-50 border border-zinc-100 active:scale-[0.99] transition">
          <KeyRound className="w-5 h-5 text-zinc-500" />
          Trocar senha
        </Link>
        <button type="button" onClick={logout} disabled={leaving}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-red-600 bg-red-50 border border-red-100 active:scale-[0.99] transition disabled:opacity-60">
          <LogOut className="w-5 h-5" />
          {leaving ? 'Saindo...' : 'Sair da conta'}
        </button>
      </div>
    </div>
  )
}
