import { createClient } from '@/lib/supabase/client'

// Abastecimento do técnico (migration_v40.sql): ele paga a gasolina e lança
// aqui; o banco coloca o reembolso e o desconto na base da comissão.

export interface FuelLog {
  id: string
  auxiliary_id: string
  date: string
  amount: number
  photo_path: string | null
  notes: string | null
  commission_pct: number
  created_at: string
  auxiliary?: { name: string } | null
}

const BUCKET = 'chamados-anexos'

export const fuelPhotoUrl = (path: string) => createClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl

export function fuelErrorMessage(e: any, fallback: string) {
  const m = String(e?.message ?? '')
  if (/register_fuel|delete_fuel|fuel_logs|schema cache/i.test(m)) return 'Falta rodar a migration_v40.sql no Supabase.'
  return m || fallback
}

export async function getFuelLogs(start: string, end: string): Promise<FuelLog[]> {
  const { data, error } = await createClient().from('fuel_logs')
    .select('*, auxiliary:auxiliaries(name)')
    .gte('date', start).lte('date', end)
    .order('date', { ascending: false }).order('created_at', { ascending: false })
  if (error) return []   // tabela ainda não existe (v40 não rodada)
  return (data ?? []).map((f: any) => ({ ...f, amount: Number(f.amount), commission_pct: Number(f.commission_pct || 0) }))
}

// Sobe a foto da nota e lança o abastecimento
export async function registerFuel(opts: { amount: number; date: string; photo: File | null; notes?: string; auxiliaryId?: string | null }) {
  const supabase = createClient()
  let path: string | null = null
  if (opts.photo) {
    const safe = opts.photo.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
    path = `combustivel/${opts.date}/${Date.now()}_${safe}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, opts.photo, { contentType: opts.photo.type || undefined })
    if (error) throw new Error(`Não foi possível enviar a foto da nota (${error.message}).`)
  }
  const { data, error } = await supabase.rpc('register_fuel', {
    p_amount: opts.amount, p_date: opts.date, p_photo_path: path, p_notes: opts.notes || null, p_auxiliary_id: opts.auxiliaryId ?? null,
  })
  if (error) {
    if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
    throw error
  }
  return data
}

export async function deleteFuel(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('delete_fuel', { p_id: id })
  if (error) throw error
  if (data) await supabase.storage.from(BUCKET).remove([String(data)]).catch(() => {})
}
