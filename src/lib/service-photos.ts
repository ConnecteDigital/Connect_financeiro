import { createClient } from '@/lib/supabase/client'

// Fotos que entram nos documentos (OS, relatório): só as tiradas DEPOIS que
// o atendimento começou. As que o gestor anexa ao agendar são só pro
// técnico ver antes do serviço — não saem na ordem de serviço.
//
// Os arquivos ficam em chamados-anexos/{chamado}/{momento}_{nome}; o
// "momento" (Date.now() do envio) diz quando a foto entrou.
export async function loadServicePhotos(callId: string, sinceIso: string | null | undefined, max = 6): Promise<string[]> {
  const since = sinceIso ? new Date(sinceIso).getTime() : NaN
  if (!Number.isFinite(since)) return []
  const storage = createClient().storage.from('chamados-anexos')
  const { data } = await storage.list(callId, { sortBy: { column: 'created_at', order: 'asc' } })
  const names = (data ?? []).map(f => f.name)
    .filter(n => /\.(jpe?g|png|gif|webp)$/i.test(n))
    .filter(n => { const m = n.match(/^(\d{12,14})_/); return !!m && Number(m[1]) >= since })
    .slice(0, max)
  // Já baixadas (data URL), pra entrarem no PDF
  return Promise.all(names.map(async n => {
    const url = storage.getPublicUrl(`${callId}/${n}`).data.publicUrl
    try {
      const blob = await (await fetch(url)).blob()
      return await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(blob) })
    } catch { return url }
  }))
}

// A partir de quando uma foto conta como "do serviço": o início do primeiro
// atendimento; sem atendimento registrado, um pouco antes de a OS ser criada.
export function servicePhotosSince(visits: { started_at: string }[], soCreatedAt?: string | null): string | null {
  const first = [...visits].map(v => v.started_at).filter(Boolean).sort()[0]
  if (first) return first
  if (soCreatedAt) return new Date(new Date(soCreatedAt).getTime() - 10 * 60_000).toISOString()
  return null
}
