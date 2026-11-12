// Modo "loja" (Rodrigues – Loja): conta só pra controlar estoque de
// máquinas/peças, vendas e gastos. Ligado por call_form_config.loja_mode.
export function isLojaMode(tenant: { call_form_config?: any } | null | undefined): boolean {
  return tenant?.call_form_config?.loja_mode === true
}

export const LOJA_CATEGORIES = ['Compra de mercadoria', 'Peças', 'Aluguel', 'Energia', 'Água', 'Internet', 'Funcionários', 'Transporte', 'Marketing', 'Impostos', 'Manutenção', 'Outros']

export const LOJA_ALLOWED_PREFIXES = ['/dashboard/pedidos', '/dashboard/estoque', '/dashboard/financeiro', '/dashboard/configuracoes']
