// Canais de atendimento do chamado (por onde o cliente chegou).
// "Google Maps" só existe para a Novo Ambiental.

export interface Channel { value: string; label: string }

export const BASE_CHANNELS: Channel[] = [
  { value: 'whatsapp', label: '💬 WhatsApp' },
  { value: 'ligacao', label: '📞 Ligação' },
  { value: 'cliente', label: '🏠 Cliente' },
  { value: 'indicacao', label: '🤝 Indicação' },
  { value: 'google', label: '🔍 Google' },
]

export const GOOGLE_MAPS: Channel = { value: 'google_maps', label: '📍 Google Maps' }

export const ALL_CHANNELS: Channel[] = [...BASE_CHANNELS, GOOGLE_MAPS]

export const CHANNEL_LABEL: Record<string, string> = Object.fromEntries(ALL_CHANNELS.map(c => [c.value, c.label]))

export function isNovoAmbiental(tenant: { slug?: string | null; name?: string | null } | null | undefined): boolean {
  const s = `${tenant?.slug ?? ''} ${tenant?.name ?? ''}`.toLowerCase()
  return /novo[\s_-]*ambiental/.test(s)
}

export function channelsFor(tenant: { slug?: string | null; name?: string | null } | null | undefined): Channel[] {
  return isNovoAmbiental(tenant) ? ALL_CHANNELS : BASE_CHANNELS
}
