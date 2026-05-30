export type UserRole = 'owner' | 'secretary'

export type CallStatus = 'agendado' | 'aprovado' | 'nao_quis_visita' | 'cancelado'
export type ServiceType = 'proprio' | 'terceirizado_saida' | 'terceirizado_entrada'
export type PaymentStatus = 'pago' | 'pago_parcial' | 'pendente'
export type ExpenseStatus = 'pago' | 'pendente'
export type ExpenseType = 'fixo' | 'avulso'
export type CallOrigin = 'site_lider' | 'site_praja' | 'indicacao' | 'terceirizado'
export type BillingSystem = 'metro_linear' | 'metro_cubico' | 'litros' | 'carga' | 'valor_fechado' | 'metro_quadrado'

export interface Client {
  id: string
  code: string
  name: string
  cpf_cnpj?: string
  inscr_est?: string
  address?: string
  neighborhood?: string
  city?: string
  state?: string
  cep?: string
  phone?: string
  email?: string
  created_at: string
}

export interface Team {
  id: string
  name: string
  created_at: string
}

export interface Call {
  id: string
  date: string
  client_id?: string
  client?: Client
  origin: CallOrigin
  status: CallStatus
  notes?: string
  service_order?: ServiceOrder
  created_at: string
}

export interface ServiceOrder {
  id: string
  call_id: string
  os_number: string
  date: string
  client_id: string
  client?: Client
  team_id?: string
  team?: Team
  driver?: string
  nf_number?: string
  vehicle?: string
  due_date?: string
  service_type: ServiceType
  billing_system?: BillingSystem
  // Levantamento
  has_floor_plan?: boolean
  has_hydraulic_plan?: boolean
  has_guarantee?: boolean
  // Items
  items: ServiceOrderItem[]
  // Financeiro
  equipment_rental_pct?: number
  equipment_rental_value?: number
  subtotal: number
  discount?: number
  taxes?: number
  total_value: number
  // Terceirizado
  outsource_fuel_cost?: number
  outsource_meal_cost?: number
  outsource_truck_cost?: number
  outsource_other_cost?: number
  outsource_profit_pct?: number
  // Pagamento
  payment_method?: string
  payment_status: PaymentStatus
  amount_paid?: number
  remaining_amount?: number
  remaining_due_date?: string
  conditions?: string
  observations?: string
  created_at: string
}

export interface ServiceOrderItem {
  id: string
  service_order_id: string
  quantity: number
  description: string
  unit_price: number
  total: number
}

export interface Expense {
  id: string
  description: string
  category: string
  amount: number
  type: ExpenseType
  status: ExpenseStatus
  due_date: string
  paid_date?: string
  recurrence_day?: number
  notes?: string
  created_at: string
}

export interface DashboardStats {
  total_calls: number
  approved_calls: number
  gross_revenue: number
  net_revenue: number
  pending_receivables: number
  total_expenses: number
}
