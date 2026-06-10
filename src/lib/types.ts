export type UserRole = 'owner' | 'secretary'

export type CallStatus = 'agendado' | 'aprovado' | 'nao_quis_visita' | 'cancelado'
export type ServiceType = 'proprio' | 'terceirizado_saida' | 'terceirizado_entrada'
export type PaymentStatus = 'pago' | 'pago_parcial' | 'pendente'
export type ExpenseStatus = 'pago' | 'pendente'
export type ExpenseType = 'fixo' | 'avulso'
export type BillingSystem = 'metro_linear' | 'metro_cubico' | 'litros' | 'carga' | 'valor_fechado' | 'metro_quadrado'

// CallOrigin é dinâmico por tenant — usar string
export type CallOrigin = string

export interface Tenant {
  id: string
  slug: string
  name: string
  logo_url: string | null
  primary_color: string
  call_origins: string[]
}

export interface Profile {
  id: string
  tenant_id: string
  name: string | null
  role: 'admin' | 'user'
  active: boolean
}

export interface Client {
  id: string
  tenant_id: string
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
  tenant_id: string
  name: string
  created_at: string
}

export interface Auxiliary {
  id: string
  tenant_id: string
  name: string
  percentage: number
}

export interface ServiceTypeRecord {
  id: string
  tenant_id: string
  name: string
  category?: string
  active: boolean
}

export interface Call {
  id: string
  tenant_id: string
  date: string
  client_id?: string
  client?: Client
  contact_name?: string
  contact_phone?: string
  origin: string
  status: CallStatus
  notes?: string
  service_category?: string
  scheduled_time?: string
  scheduled_date?: string
  call_address?: string
  service_order?: ServiceOrder
  created_at: string
}

export interface ServiceOrder {
  id: string
  tenant_id: string
  call_id: string
  os_number: string
  date: string
  client_id: string
  client?: Client
  team_id?: string
  team?: Team
  auxiliary_id?: string
  auxiliary?: Auxiliary
  auxiliary_value?: number
  driver?: string
  nf_number?: string
  vehicle?: string
  due_date?: string
  service_type: ServiceType
  billing_system?: BillingSystem
  has_floor_plan?: boolean
  has_no_floor_plan?: boolean
  has_no_knowledge?: boolean
  has_hydraulic_plan?: boolean
  has_no_hydraulic_plan?: boolean
  has_guarantee?: boolean
  has_no_guarantee?: boolean
  has_guarantee_60?: boolean
  has_guarantee_90?: boolean
  items: ServiceOrderItem[]
  equipment_rental_pct?: number
  equipment_rental_value?: number
  subtotal: number
  discount?: number
  taxes?: number
  total_value: number
  other_service_value?: number
  own_material_cost?: number
  own_fuel_cost?: number
  own_other_cost?: number
  outsource_fuel_cost?: number
  outsource_meal_cost?: number
  outsource_truck_cost?: number
  outsource_other_cost?: number
  outsource_profit_pct?: number
  partner_name?: string
  my_revenue_pct?: number
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
  tenant_id: string
  description: string
  category: string
  amount: number
  type: ExpenseType
  status: ExpenseStatus
  due_date: string
  paid_date?: string
  recurrence_day?: number
  notes?: string
  supplier_id?: string
  client_id?: string
  google_site?: string
  created_at: string
}

export interface Supplier {
  id: string
  tenant_id: string
  name: string
  category?: string
  contact?: string
  phone?: string
  email?: string
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
