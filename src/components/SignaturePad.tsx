'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser, Check, X, RotateCw } from 'lucide-react'
import Portal from '@/components/Portal'

// Assinatura com o dedo, em tela cheia e sempre "deitada".
//
// Se o celular está em pé (ou com a rotação travada, o que é comum no
// iPhone), a tela de assinar é desenhada girada 90°: a pessoa só vira o
// aparelho de lado e assina no comprido. Se o aparelho girar de verdade,
// a tela acompanha. O resultado é um PNG transparente, já recortado em
// volta do traço.

type Point = { x: number; y: number }

export default function SignaturePad({ title, subtitle, onSave, onClose }: {
  title: string
  subtitle?: string
  onSave: (dataUrl: string) => void | Promise<void>
  onClose: () => void
}) {
  const [vp, setVp] = useState(() => ({ w: typeof window === 'undefined' ? 800 : window.innerWidth, h: typeof window === 'undefined' ? 400 : window.innerHeight }))
  const portrait = vp.h > vp.w
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // O canvas só existe depois que o Portal monta: guarda o elemento em estado pra ajustar o tamanho na hora certa
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null)
  const strokes = useRef<Point[][]>([])
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      document.body.style.overflow = prev
    }
  }, [])

  const redraw = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111'; ctx.fillStyle = '#111'; ctx.lineWidth = 2.6
    for (const s of strokes.current) {
      if (s.length === 1) { ctx.beginPath(); ctx.arc(s[0].x, s[0].y, 1.4, 0, Math.PI * 2); ctx.fill(); continue }
      ctx.beginPath()
      ctx.moveTo(s[0].x, s[0].y)
      // Curva suave passando pelo meio de cada par de pontos
      for (let i = 1; i < s.length - 1; i++) {
        const mx = (s[i].x + s[i + 1].x) / 2, my = (s[i].y + s[i + 1].y) / 2
        ctx.quadraticCurveTo(s[i].x, s[i].y, mx, my)
      }
      ctx.lineTo(s[s.length - 1].x, s[s.length - 1].y)
      ctx.stroke()
    }
  }, [])

  // Ajusta o tamanho real do canvas ao espaço na tela (e limpa se a tela mudou de formato)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = Math.round(c.clientWidth * dpr)
    c.height = Math.round(c.clientHeight * dpr)
    strokes.current = []
    setHasInk(false)
    redraw()
  }, [vp.w, vp.h, redraw, canvasEl])

  // Posição do toque dentro do canvas, desfazendo o giro quando a tela está em pé
  function pointOf(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const c = canvasRef.current!
    let ox = 0, oy = 0
    let el: HTMLElement | null = c
    while (el && el.dataset.stage !== '1') {
      ox += el.offsetLeft; oy += el.offsetTop
      el = el.offsetParent as HTMLElement | null
      if (el && el.dataset.stage !== '1') { ox += el.clientLeft; oy += el.clientTop }   // borda do contêiner
    }
    const lx = portrait ? e.clientY : e.clientX
    const ly = portrait ? vp.w - e.clientX : e.clientY
    return { x: lx - ox, y: ly - oy }
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    strokes.current.push([pointOf(e)])
    setHasInk(true)
    redraw()
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    e.preventDefault()
    const s = strokes.current[strokes.current.length - 1]
    const p = pointOf(e)
    const last = s[s.length - 1]
    if (Math.hypot(p.x - last.x, p.y - last.y) < 1.2) return
    s.push(p)
    redraw()
  }
  function up() { drawing.current = false }

  function clear() { strokes.current = []; setHasInk(false); redraw() }

  // PNG transparente recortado em volta do traço (leve: no máx. 700px de largura)
  function exportPng(): string | null {
    const pts = strokes.current.flat()
    if (pts.length < 2) return null
    const pad = 10
    const minX = Math.min(...pts.map(p => p.x)) - pad, maxX = Math.max(...pts.map(p => p.x)) + pad
    const minY = Math.min(...pts.map(p => p.y)) - pad, maxY = Math.max(...pts.map(p => p.y)) + pad
    const w = maxX - minX, h = maxY - minY
    const scale = Math.min(2, 700 / w)
    const out = document.createElement('canvas')
    out.width = Math.max(1, Math.round(w * scale)); out.height = Math.max(1, Math.round(h * scale))
    const ctx = out.getContext('2d')!
    ctx.scale(scale, scale); ctx.translate(-minX, -minY)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111'; ctx.fillStyle = '#111'; ctx.lineWidth = 2.6
    for (const s of strokes.current) {
      if (s.length === 1) { ctx.beginPath(); ctx.arc(s[0].x, s[0].y, 1.4, 0, Math.PI * 2); ctx.fill(); continue }
      ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y)
      for (let i = 1; i < s.length - 1; i++) ctx.quadraticCurveTo(s[i].x, s[i].y, (s[i].x + s[i + 1].x) / 2, (s[i].y + s[i + 1].y) / 2)
      ctx.lineTo(s[s.length - 1].x, s[s.length - 1].y); ctx.stroke()
    }
    return out.toDataURL('image/png')
  }

  async function save() {
    const png = exportPng()
    if (!png) return
    setSaving(true)
    try { await onSave(png) } finally { setSaving(false) }
  }

  // Tela "deitada": lado comprido na horizontal, girada quando o aparelho está em pé
  const L = Math.max(vp.w, vp.h), S = Math.min(vp.w, vp.h)
  const stage: React.CSSProperties = portrait
    ? { position: 'fixed', top: 0, left: 0, width: L, height: S, transformOrigin: 'top left', transform: `translateX(${vp.w}px) rotate(90deg)`,
        paddingLeft: 'env(safe-area-inset-top, 0px)', paddingRight: 'env(safe-area-inset-bottom, 0px)' }
    : { position: 'fixed', top: 0, left: 0, width: L, height: S,
        paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }

  return (
    <Portal>
      <div className="fixed inset-0 z-[95] bg-white" style={{ touchAction: 'none' }}>
        <div data-stage="1" style={stage} className="flex flex-col bg-white select-none">
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
            <div className="min-w-0">
              <p className="text-base font-bold text-zinc-900 truncate">{title}</p>
              <p className="text-xs text-zinc-500 truncate flex items-center gap-1.5">
                {portrait && <RotateCw className="w-3.5 h-3.5 flex-shrink-0" />}
                {subtitle ?? (portrait ? 'Vire o celular de lado e assine com o dedo' : 'Assine com o dedo no espaço abaixo')}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar" className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 flex-shrink-0"><X className="w-5 h-5" /></button>
          </div>

          <div className="relative flex-1 mx-4 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 overflow-hidden min-h-0">
            <canvas ref={el => { canvasRef.current = el; setCanvasEl(el) }} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }}
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
            {/* Linha de base da assinatura */}
            <div className="pointer-events-none absolute left-8 right-8 border-b border-zinc-400" style={{ bottom: '26%' }} />
            <span className="pointer-events-none absolute left-8 text-zinc-400 text-lg font-bold" style={{ bottom: 'calc(26% + 4px)' }}>✕</span>
            {!hasInk && <p className="pointer-events-none absolute inset-x-0 text-center text-sm text-zinc-400" style={{ bottom: 'calc(26% - 26px)' }}>Assine aqui</p>}
          </div>

          <div className="flex items-center gap-2 px-4 pt-2.5" style={{ paddingBottom: 12 }}>
            <button type="button" onClick={clear} disabled={!hasInk || saving}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-zinc-100 text-zinc-700 disabled:opacity-40">
              <Eraser className="w-4 h-4" /> Limpar
            </button>
            <div className="flex-1" />
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-600">Cancelar</button>
            <button type="button" onClick={save} disabled={!hasInk || saving}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 disabled:opacity-40">
              <Check className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar assinatura'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
