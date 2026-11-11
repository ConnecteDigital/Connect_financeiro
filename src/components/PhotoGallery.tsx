'use client'

import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, FileText, Paperclip } from 'lucide-react'

export interface GalleryFile { name: string; url: string; image: boolean }

// Miniaturas + visualizador em tela cheia: arrasta pro lado pra ir pra
// próxima foto (scroll-snap nativo, funciona no dedo e no mouse).
export default function PhotoGallery({ files, title = 'Fotos e arquivos' }: { files: GalleryFile[]; title?: string }) {
  const images = files.filter(f => f.image)
  const others = files.filter(f => !f.image)
  const [open, setOpen] = useState<number | null>(null)
  const [index, setIndex] = useState(0)
  const track = useRef<HTMLDivElement>(null)

  // Abre já na foto tocada
  useEffect(() => {
    if (open === null || !track.current) return
    const el = track.current
    el.scrollTo({ left: open * el.clientWidth, behavior: 'instant' as ScrollBehavior })
    setIndex(open)
  }, [open])

  useEffect(() => {
    if (open === null) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }) // eslint-disable-line react-hooks/exhaustive-deps

  function go(delta: number) {
    const el = track.current
    if (!el) return
    const next = Math.max(0, Math.min(images.length - 1, index + delta))
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
  }

  if (files.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
        <Paperclip className="w-3.5 h-3.5" /> {title}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {images.map((f, i) => (
          <button key={f.url} type="button" onClick={() => setOpen(i)}
            className="block rounded-lg overflow-hidden border border-slate-200 bg-slate-50 active:scale-[0.98] transition">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt={f.name} className="w-full h-24 object-cover" />
          </button>
        ))}
        {others.map(f => (
          <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer"
            className="h-24 rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1 text-slate-400 px-1">
            <FileText className="w-6 h-6" /><span className="text-[10px] truncate w-full text-center">{f.name}</span>
          </a>
        ))}
      </div>

      {open !== null && (
        <div className="fixed inset-0 z-[90] bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
            <span className="text-sm font-semibold tabular-nums">{index + 1} de {images.length}</span>
            <button type="button" onClick={() => setOpen(null)} className="p-2 rounded-full bg-white/10"><X className="w-5 h-5" /></button>
          </div>
          <div ref={track}
            onScroll={e => { const el = e.currentTarget; setIndex(Math.round(el.scrollLeft / el.clientWidth)) }}
            className="flex-1 flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
            style={{ scrollbarWidth: 'none' }}>
            {images.map(f => (
              <div key={f.url} className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.name} className="max-w-full max-h-full object-contain select-none" draggable={false} />
              </div>
            ))}
          </div>
          {images.length > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} disabled={index === 0}
                className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white items-center justify-center disabled:opacity-20"><ChevronLeft className="w-6 h-6" /></button>
              <button type="button" onClick={() => go(1)} disabled={index === images.length - 1}
                className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white items-center justify-center disabled:opacity-20"><ChevronRight className="w-6 h-6" /></button>
              <div className="flex justify-center gap-1.5 py-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
                {images.map((f, i) => <span key={f.url} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`} />)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
