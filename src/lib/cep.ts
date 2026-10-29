// Busca endereço por CEP usando a ViaCEP (api pública e gratuita, sem chave)
export interface CepResult {
  address: string
  neighborhood: string
  city: string
  state: string
}

export async function lookupCep(cep: string): Promise<CepResult | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null

  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
  if (!res.ok) return null
  const data = await res.json()
  if (data.erro) return null

  return {
    address: data.logradouro ?? '',
    neighborhood: data.bairro ?? '',
    city: data.localidade ?? '',
    state: data.uf ?? '',
  }
}
