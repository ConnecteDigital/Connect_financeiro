'use client'

import { useState } from 'react'
import { PenLine, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant-context'
import SignaturePad from '@/components/SignaturePad'
import { toastSuccess, toastError } from '@/components/Toast'

// Assinatura da empresa (Rodrigues e Loja): o gestor assina uma vez aqui e
// todo documento — orçamento, ordem de serviço, laudo, relatório — já sai
// assinado na linha da empresa. Fica em call_form_config.document_signature.
export default function DocumentSignatureSettings() {
  const { tenant, updateTenant } = useTenant()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const current: string | null = (tenant?.call_form_config as any)?.document_signature?.image ?? null

  async function store(image: string | null) {
    if (!tenant) return
    setBusy(true)
    try {
      const supabase = createClient()
      // Lê a configuração atual do banco e mexe só na assinatura
      const { data: row, error: readErr } = await supabase.from('tenants').select('call_form_config').eq('id', tenant.id).single()
      if (readErr) throw readErr
      const merged = { ...(row?.call_form_config ?? {}) } as Record<string, unknown>
      if (image) merged.document_signature = { image, updated_at: new Date().toISOString() }
      else delete merged.document_signature
      const { error } = await supabase.from('tenants').update({ call_form_config: merged }).eq('id', tenant.id)
      if (error) throw error
      updateTenant({ call_form_config: merged as any })
      toastSuccess(image ? 'Assinatura salva! Os documentos já saem assinados.' : 'Assinatura removida.')
      setOpen(false)
    } catch (e: any) {
      console.error(e)
      toastError(`Não foi possível salvar a assinatura.${e?.message ? ` (${e.message})` : ''}`)
    } finally { setBusy(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-3">
      <div>
        <p className="text-base font-bold text-zinc-900 flex items-center gap-2"><PenLine className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Assinatura da empresa</p>
        <p className="text-sm text-zinc-500 mt-0.5">Assine uma vez aqui e todo orçamento, ordem de serviço e laudo já sai assinado pela empresa.</p>
      </div>

      {current ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 flex items-center justify-center" style={{ minHeight: 84 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current} alt="Assinatura da empresa" style={{ maxHeight: 64, maxWidth: '100%' }} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-5 text-center text-sm text-zinc-400">Nenhuma assinatura ainda — os documentos saem só com a linha em branco.</p>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(true)} disabled={busy}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: 'var(--primary)' }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />} {current ? 'Assinar de novo' : 'Assinar'}
        </button>
        {current && (
          <button type="button" onClick={() => { if (confirm('Remover a assinatura da empresa dos documentos?')) store(null) }} disabled={busy}
            className="px-4 py-3 rounded-xl text-sm font-semibold text-red-600 bg-red-50 border border-red-100 flex items-center gap-1.5">
            <Trash2 className="w-4 h-4" /> Remover
          </button>
        )}
      </div>

      {open && <SignaturePad title="Assinatura da empresa" onClose={() => setOpen(false)} onSave={png => store(png)} />}
    </div>
  )
}
