'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { sheetFile, shareFile } from '@/lib/sheet-capture'

type Kind = 'pdf' | 'png'

// Deixa o PDF e a imagem da folha prontos ANTES do toque em "Enviar":
// o celular só abre o compartilhar se ele vier logo depois do toque, e
// gerar o PDF demora. Se o arquivo ainda não estiver pronto, o primeiro
// toque gera e tenta enviar (se o celular bloquear, o arquivo é baixado).
export function useSheetShare(ref: RefObject<HTMLElement | null>, fileBase: string, title: string, key: string, enabled = true) {
  const [files, setFiles] = useState<Partial<Record<Kind, File>>>({})
  const [busy, setBusy] = useState<Kind | null>(null)
  const [error, setError] = useState('')
  const gen = useRef(0)

  const make = useCallback(async (kind: Kind) => {
    if (!ref.current) throw new Error('folha não encontrada')
    return sheetFile(ref.current, fileBase, kind)
  }, [ref, fileBase])

  // Gera os dois arquivos em segundo plano quando o documento muda
  useEffect(() => {
    if (!enabled) return
    const my = ++gen.current
    setFiles({})
    const t = setTimeout(async () => {
      try {
        const pdf = await make('pdf')
        if (gen.current === my) setFiles(f => ({ ...f, pdf }))
        const png = await make('png')
        if (gen.current === my) setFiles(f => ({ ...f, png }))
      } catch (e) { console.error(e) }
    }, 700)
    return () => clearTimeout(t)
  }, [key, enabled, make])

  async function send(kind: Kind) {
    setError('')
    const ready = files[kind]
    if (ready) {
      // Nada de await antes daqui: precisa ser direto no toque
      await shareFile(ready, title)
      return
    }
    setBusy(kind)
    try {
      const f = await make(kind)
      setFiles(prev => ({ ...prev, [kind]: f }))
      // Tenta enviar já; se o celular não deixar, baixa o arquivo
      await shareFile(f, title)
    } catch (e) {
      console.error(e)
      setError('Não foi possível gerar o arquivo. Tente novamente.')
    } finally {
      setBusy(null)
    }
  }

  return { files, busy, error, send }
}
