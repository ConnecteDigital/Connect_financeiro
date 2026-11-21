'use client'

import AccountAccessCard from '@/components/AccountAccessCard'
import TecnicoSignatureSettings from '@/components/TecnicoSignatureSettings'
import { useTenant } from '@/lib/tenant-context'

// Ajustes do login de técnico: assinatura fixa, trocar a senha e sair.
export default function ContaPage() {
  const { isTecnico } = useTenant()
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Ajustes</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Sua assinatura, senha e saída do aplicativo</p>
      </div>
      {isTecnico && <TecnicoSignatureSettings />}
      <AccountAccessCard />
    </div>
  )
}
