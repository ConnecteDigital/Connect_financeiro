'use client'

import AccountAccessCard from '@/components/AccountAccessCard'

// Minha conta (login de técnico): trocar a senha e sair do aplicativo.
export default function ContaPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Minha conta</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Troque sua senha ou saia do aplicativo</p>
      </div>
      <AccountAccessCard />
    </div>
  )
}
