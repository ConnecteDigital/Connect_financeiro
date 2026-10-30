// Link universal do Waze: abre o app (Android/iOS) já navegando até o
// endereço quando instalado, ou o Waze no navegador como alternativa.
export function mapsUrl(address: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`
}
