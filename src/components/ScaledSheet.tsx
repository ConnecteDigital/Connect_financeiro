'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

// Mostra uma folha de largura fixa (ex.: A4 794px) reduzida pra caber na
// tela, sem rolagem lateral no celular.
export default function ScaledSheet({ width, children }: { width: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    const fit = () => {
      if (!outer.current || !inner.current) return
      const s = Math.min(1, outer.current.clientWidth / width)
      setScale(s)
      setHeight(inner.current.offsetHeight * s)
    }
    fit()
    const ro = new ResizeObserver(fit)
    if (outer.current) ro.observe(outer.current)
    if (inner.current) ro.observe(inner.current)
    return () => ro.disconnect()
  }, [width])

  return (
    <div ref={outer} className="w-full overflow-hidden rounded-xl border border-zinc-200 shadow-sm bg-white" style={{ height }}>
      <div ref={inner} style={{ width, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  )
}
