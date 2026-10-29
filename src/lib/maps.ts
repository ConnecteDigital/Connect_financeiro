// Link universal do Google Maps: abre o app nativo (Android/iOS) quando
// instalado, ou o Google Maps no navegador como alternativa.
export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
