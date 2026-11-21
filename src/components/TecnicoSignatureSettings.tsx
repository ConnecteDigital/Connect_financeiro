'use client'

import { useEffect, useState } from 'react'
import { PenLine, Trash2, Loader2 } from 'lucide-react'
import SignaturePad from '@/components/SignaturePad'
import { getMyAuxiliary, getTecnicoSignature, saveTecnicoSignature, deleteTecnicoSignature } from '@/lib/db/signatures'
import { toastSuccess, toastError } from '@/components/Toast'

// Assinatura fixa do técnico: ele assina uma vez aqui e a ordem de
// serviço, o certificado e o relatório dos serviços dele já saem
// assinados. Depois só o cliente precisa assinar.
export default function TecnicoSignatureSettings() {
  const [aux, setAux] = useState<{ id: string; tenant_id: string; name: string } | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getMyAuxiliary().then(async a => {
      setAux(a)
      if (a) setImage(await getTecnicoSignature(a.id))
    }).catch(console.error).finally(() => setLoaded(true))
  }, [])

  async function store(png: string | null) {
    if (!aux) return
    setBusy(true)
    try {
      if (png) await saveTecnicoSignature(aux.id, aux.tenant_id, png)
      else await deleteTecnicoSignature(aux.id)
      setImage(png)
      setOpen(false)
      toastSuccess(png ? 'Assinatura salva! Seus documentos já saem assinados.' : 'Assinatura removida.')
    } catch (e: any) {
      console.error(e)
      setOpen(false)
      toastError(/tecnico_signatures|schema cache/i.test(e?.message ?? '') ? 'Falta rodar a migration_v38.sql no Supabase.' : `Não foi possível salvar a assinatura.${e?.message ? ` (${e.message})` : ''}`)
    } finally { setBusy(false) }
  }

  if (loaded && !aux) return null

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-3">
      <div>
        <p className="text-base font-bold text-zinc-900 flex items-center gap-2"><PenLine className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Minha assinatura</p>
        <p className="text-sm text-zinc-500 mt-0.5">Assine uma vez aqui. As ordens de serviço que você fizer já saem com a sua assinatura — aí só o cliente precisa assinar.</p>
      </div>

      {!loaded ? (
        <div className="h-20 bg-zinc-50 rounded-xl animate-pulse" />
      ) : image ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 flex items-center justify-center" style={{ minHeight: 84 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="Minha assinatura" style={{ maxHeight: 64, maxWidth: '100%' }} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-5 text-center text-sm text-zinc-400">Você ainda não cadastrou sua assinatura.</p>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(true)} disabled={busy || !loaded}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: 'var(--primary)' }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />} {image ? 'Assinar de novo' : 'Cadastrar assinatura'}
        </button>
        {image && (
          <button type="button" onClick={() => { if (confirm('Remover a sua assinatura dos documentos?')) store(null) }} disabled={busy}
            className="px-4 py-3 rounded-xl text-sm font-semibold text-red-600 bg-red-50 border border-red-100 flex items-center gap-1.5">
            <Trash2 className="w-4 h-4" /> Remover
          </button>
        )}
      </div>

      {open && <SignaturePad title={`Assinatura de ${aux?.name ?? 'técnico'}`} onClose={() => setOpen(false)} onSave={png => store(png)} />}
    </div>
  )
}
