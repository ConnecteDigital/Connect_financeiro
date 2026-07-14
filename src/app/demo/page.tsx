'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff } from 'lucide-react'

const DEMO_TOKEN = 'demo@conecte2025'

export default function DemoGate() {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(false)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (value === DEMO_TOKEN) {
      sessionStorage.setItem('demo_access', '1')
      router.push('/demo/dashboard')
    } else {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-zinc-400" />
          </div>
          <h1 className="text-white text-2xl font-bold">Modo Demonstração</h1>
          <p className="text-zinc-500 text-sm mt-1">Informe a senha para acessar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Senha de acesso"
              className={`w-full px-4 py-3.5 rounded-xl bg-zinc-800 text-white placeholder-zinc-500 text-sm outline-none transition border ${error ? 'border-red-500' : 'border-zinc-700 focus:border-zinc-500'}`}
              autoFocus
            />
            <button type="button" onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs text-center">Senha incorreta</p>}
          <button type="submit"
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition"
            style={{ background: '#2563eb' }}>
            Entrar no Demo
          </button>
        </form>
      </div>
    </div>
  )
}
