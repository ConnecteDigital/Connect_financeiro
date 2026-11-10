// Canais de atendimento do chamado (por onde o cliente chegou).
// Os 5 de sempre + os que cada empresa cria em Configurações
// (tenants.call_form_config.custom_channels = [{ value, label }]).

export interface Channel { value: string; label: string }

export const BASE_CHANNELS: Channel[] = [
  { value: 'whatsapp', label: '💬 WhatsApp' },
  { value: 'ligacao', label: '📞 Ligação' },
  { value: 'cliente', label: '🏠 Cliente' },
  { value: 'indicacao', label: '🤝 Indicação' },
  { value: 'google', label: '🔍 Google' },
]

export const GOOGLE_MAPS: Channel = { value: 'google_maps', label: '📍 Google Maps' }

// Rótulos conhecidos (pra mostrar canais gravados mesmo fora da lista da empresa)
export const ALL_CHANNELS: Channel[] = [...BASE_CHANNELS, GOOGLE_MAPS]
export const CHANNEL_LABEL: Record<string, string> = Object.fromEntries(ALL_CHANNELS.map(c => [c.value, c.label]))

type TenantLike = { slug?: string | null; name?: string | null; call_form_config?: any } | null | undefined

export function isNovoAmbiental(tenant: TenantLike): boolean {
  if (tenant?.call_form_config?.novo_ambiental === true) return true
  const s = `${tenant?.slug ?? ''} ${tenant?.name ?? ''}`.toLowerCase()
  return /nov[oa][\s_-]*ambiental/.test(s)
}

export function customChannels(tenant: TenantLike): Channel[] {
  const list = tenant?.call_form_config?.custom_channels
  return Array.isArray(list) ? list.filter((c: any) => c?.value && c?.label) : []
}

export function channelsFor(tenant: TenantLike): Channel[] {
  const extra = customChannels(tenant)
  const out = [...BASE_CHANNELS, ...extra]
  if (isNovoAmbiental(tenant) && !out.some(c => c.value === GOOGLE_MAPS.value)) out.push(GOOGLE_MAPS)
  return out
}

export function channelLabel(value: string | null | undefined, tenant?: TenantLike): string {
  if (!value) return ''
  return channelsFor(tenant).find(c => c.value === value)?.label ?? CHANNEL_LABEL[value] ?? value
}

// "Google Maps" → "google_maps"
export function channelValueOf(label: string): string {
  return label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}
