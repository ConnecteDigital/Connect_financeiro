'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

type Kind = 'success' | 'error'
interface ToastItem { id: number; msg: string; kind: Kind }
type ToastFn = (msg: string, kind?: Kind) => void

const ToastContext = createContext<ToastFn>(() => {})

// Avisos curtos ("Chamado salvo!") no topo da tela, que somem sozinhos.
// O provider fica no layout do dashboard, então o aviso continua aparecendo
// mesmo depois de um router.push.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const toast = useCallback<ToastFn>((msg, kind = 'success') => {
    const id = ++seq.current
    setItems(prev => [...prev.slice(-2), { id, msg, kind }])
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 2500)
  }, [])

  useEffect(() => { globalToast = toast; return () => { globalToast = null } }, [toast])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        {items.map(t => (
          <div key={t.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold text-white toast-in ${t.kind === 'error' ? 'bg-red-500' : 'bg-emerald-600'}`}>
            {t.kind === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {t.msg}
          </div>
        ))}
      </div>
      <style>{`@keyframes toast-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}} .toast-in{animation:toast-in .2s ease-out}`}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

let globalToast: ToastFn | null = null

// Pra usar fora de componente (ex.: dentro de uma função async). Se não
// houver provider montado, não faz nada.
export function toastSuccess(msg: string) { globalToast?.(msg, 'success') }
export function toastError(msg: string) { globalToast?.(msg, 'error') }
