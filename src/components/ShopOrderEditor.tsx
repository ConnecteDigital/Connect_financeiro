'use client'

import { PART_PERIODS } from '@/lib/parts-guarantee'
import MoneyInput from '@/components/MoneyInput'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, Plus, Trash2, Wrench, Package, Percent, Truck, Receipt, CalendarClock, Loader2, Save, BookOpen, Search, Check, ShoppingCart } from 'lucide-react'
import { localYmd } from '@/lib/tecnico-queue'
import { APPLIANCE_BRANDS, APPLIANCE_TYPES } from '@/lib/service-config'
import {
  createShopOrder, updateShopOrder, saveSale, getCatalog, addToCatalog, removeFromCatalog, getPastClients, orderTotal, linesTotal, orderNumber,
  isSale, orderTitle, PAYMENT_METHODS, type ShopOrder, type ShopOrderInput, type OrderLine, type CatalogService, type OrderKind,
} from '@/lib/db/shop-orders'
import { getLojaItems, type LojaItem } from '@/lib/db/loja'
import { Sheet, input } from '@/components/LojaModals'
import { toastSuccess } from '@/components/Toast'
import { lookupCep } from '@/lib/cep'

const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const GUARANTEES = ['Sem garantia', '30 dias', '60 dias', '90 dias', '6 meses', '1 ano']

function Block({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3">
        <span className="text-base font-bold text-zinc-900">{title}</span>
        <ChevronDown className={`w-5 h-5 text-zinc-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  )
}

function F({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <div className={className}><label className="block text-xs font-medium text-zinc-500 mb-1.5">{label}</label>{children}</div>
}

// Linha do pedido (Serviços, Peças, Desconto...) com "+" pra adicionar
function Row({ icon: Icon, label, value, onAdd, children }: { icon: any; label: string; value?: string; onAdd?: () => void; children?: ReactNode }) {
  return (
    <div className="border-b border-zinc-50 last:border-0 py-2.5">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        <span className="text-sm font-medium text-zinc-700 flex-1">{label}</span>
        {value && <span className="text-sm font-semibold text-zinc-800">{value}</span>}
        {onAdd && (
          <button type="button" onClick={onAdd} className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: 'var(--primary)' }}>
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

// Valor avulso do pedido (desconto, taxa de entrega, frete, outras taxas)
function Money({ label, icon, value, onChange, negative }: { label: string; icon: any; value: number; onChange: (n: number) => void; negative?: boolean }) {
  const [open, setOpen] = useState(Number(value) > 0)
  return (
    <Row icon={icon} label={label} value={Number(value) > 0 ? `${negative ? '− ' : ''}${fmt(Number(value))}` : undefined} onAdd={open ? undefined : () => setOpen(true)}>
      {open && (
        <div className="flex items-center gap-2 mt-2">
          <MoneyInput min="0" step="0.01" autoFocus={!Number(value)} value={value || ''} onChange={e => onChange(Number(e.target.value) || 0)} className={input} placeholder="0,00" />
          <button type="button" onClick={() => { onChange(0); setOpen(false) }} className="p-2 text-red-400"><Trash2 className="w-4 h-4" /></button>
        </div>
      )}
    </Row>
  )
}

const EMPTY: ShopOrderInput = {
  date: localYmd(), status: 'pendente',
  client_name: '', client_phone: null, client_address: null, client_city: null, client_cep: null,
  validity_days: 7, brand: null, model: null, appliance: null, serial_number: null, defect: null, observations: null,
  visit_date: null, visit_time: null, visit_notes: null,
  services: [], parts: [], discount: 0, delivery_fee: 0, freight: 0, other_fees: 0, total: 0,
  payment_conditions: 'À vista.', payment_methods: ['PIX'], guarantee: '90 dias', notes: null,
  kind: 'servico', client_cpf: null, owner_name: null, owner_phone: null, owner_amount: 0, card_fee_pct: 0, sale_received: true,
}
// Venda: o comprador chega e leva — sem agendamento, validade nem condições de orçamento
const EMPTY_SALE: ShopOrderInput = { ...EMPTY, kind: 'venda', status: 'enviado', validity_days: null, payment_conditions: null }

export default function ShopOrderEditor({ order, initialKind = 'servico', initialItemId }: { order?: ShopOrder | null; initialKind?: OrderKind; initialItemId?: string | null }) {
  const router = useRouter()
  const [v, setV] = useState<ShopOrderInput>(() => order ? { ...EMPTY, ...order } : initialKind === 'servico' ? EMPTY : { ...EMPTY_SALE, kind: initialKind })
  const sale = isSale(v)
  const set = (patch: Partial<ShopOrderInput>) => setV(prev => ({ ...prev, ...patch }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pastClients, setPastClients] = useState<any[]>([])
  const [modal, setModal] = useState<'servico' | 'peca' | null>(null)

  useEffect(() => { getPastClients().then(setPastClients).catch(() => {}) }, [])

  // Veio do "Vendi" de um item do estoque: a venda já abre com ele
  useEffect(() => {
    if (order || !initialItemId) return
    getLojaItems().then(items => {
      const i = items.find(x => x.id === initialItemId)
      if (!i) return
      setV(prev => prev.parts.some(p => p.stock_item_id === i.id) ? prev : {
        ...prev,
        parts: [...prev.parts, { description: [i.name, i.brand, i.model].filter(Boolean).join(' '), unit: 'un.', unit_price: i.sale_value || i.unit_value, quantity: 1, stock_item_id: i.id }],
      })
    }).catch(() => {})
  }, [order, initialItemId])

  // CEP completo → preenche rua e bairro/cidade (sem apagar o que já foi digitado)
  const [cepBusy, setCepBusy] = useState(false)
  async function onCep(raw: string) {
    set({ client_cep: raw || null })
    if (raw.replace(/\D/g, '').length !== 8) return
    setCepBusy(true)
    try {
      const r = await lookupCep(raw)
      if (r) setV(prev => ({
        ...prev,
        client_address: prev.client_address?.trim() ? prev.client_address : (r.address || null),
        client_city: prev.client_city?.trim() ? prev.client_city : ([r.neighborhood, r.city ? `${r.city}${r.state ? `-${r.state}` : ''}` : ''].filter(Boolean).join(', ') || null),
      }))
    } catch { /* sem internet ou CEP não encontrado: segue digitando */ }
    finally { setCepBusy(false) }
  }

  const method = v.payment_methods[0] ?? 'PIX'
  const isCard = /cart[aã]o/i.test(method)
  const fee = sale && isCard ? Math.round(orderTotal(v) * Number(v.card_fee_pct || 0)) / 100 : 0

  const total = orderTotal(v)

  function pickClient(name: string) {
    const c = pastClients.find(p => p.client_name.toLowerCase() === name.trim().toLowerCase())
    set(c ? { client_name: c.client_name, client_phone: c.client_phone, client_address: c.client_address, client_city: c.client_city, client_cep: c.client_cep } : { client_name: name })
  }

  async function save() {
    if (!v.client_name.trim()) { setError(sale ? 'Informe o nome do comprador.' : 'Informe o cliente.'); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    if (sale && v.parts.length === 0) { setError('Adicione o produto que foi vendido.'); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    if (sale && total <= 0) { setError('Informe o valor do produto.'); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setSaving(true); setError('')
    try {
      const clean: ShopOrderInput = { ...v, client_name: v.client_name.trim(), total }
      if (sale) {
        // Venda: uma forma de pagamento; taxa da maquininha só no cartão; dono só na revenda
        const id = await saveSale({
          ...clean, services: [], payment_methods: [method], card_fee_pct: isCard ? Number(v.card_fee_pct || 0) : 0,
          ...(v.kind === 'revenda' ? {} : { owner_name: null, owner_phone: null, owner_amount: 0 }),
        }, order)
        toastSuccess(order ? 'Venda atualizada!' : 'Venda registrada!')
        router.push(`/dashboard/pedidos/${id}`)
        return
      }
      if (order) {
        await updateShopOrder(order.id, clean)
        toastSuccess('Pedido atualizado!')
        router.push(`/dashboard/pedidos/${order.id}`)
      } else {
        const created = await createShopOrder(clean)
        toastSuccess('Pedido salvo!')
        router.push(`/dashboard/pedidos/${created.id}`)
      }
    } catch (e: any) {
      console.error(e)
      setError(/schema cache|column .* does not exist/i.test(String(e?.message ?? '')) ? 'Falta atualizar o banco: rode a migration_v38.sql no Supabase.' : String(e?.message ?? '').includes('shop_orders') ? 'Rode a migration_v33.sql no Supabase.' : (e?.message ?? 'Não foi possível salvar.'))
      setSaving(false)
    }
  }

  const removeLine = (key: 'services' | 'parts', idx: number) => set({ [key]: v[key].filter((_, i) => i !== idx) } as any)

  const lines = (k: 'services' | 'parts') => v[k].length === 0 ? null : (
    <div className="mt-2 space-y-1.5">
      {v[k].map((l, i) => (
        <div key={i} className="flex items-center gap-2 bg-zinc-50 rounded-xl px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-800 truncate">{l.description}</p>
            <p className="text-xs text-zinc-500">{l.quantity} {l.unit || 'un.'} × {fmt(l.unit_price)}{l.details ? ` · ${l.details}` : ''}{l.guarantee ? ` · garantia ${l.guarantee}` : ''}</p>
          </div>
          <span className="text-sm font-bold text-zinc-800 flex-shrink-0">{fmt(l.quantity * l.unit_price)}</span>
          <button type="button" onClick={() => removeLine(k, i)} className="p-1.5 text-red-400"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-3 pb-24">
      <div className="flex items-center gap-3">
        <Link href={order ? `/dashboard/pedidos/${order.id}` : '/dashboard/pedidos'} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{order ? `${orderTitle(v)} n. ${orderNumber(order)}` : sale ? 'Nova venda' : 'Novo serviço'}</h1>
          <p className="text-xs text-zinc-500">{sale ? 'Produto vendido na loja — entra no caixa como venda' : 'Aparelho que entrou na loja pra orçamento ou conserto'}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      {sale && (
        <div>
          <div className="flex bg-zinc-100 rounded-xl p-1">
            {([['venda', 'Produto da loja'], ['revenda', 'Revenda']] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => set({ kind: k })}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${v.kind === k ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>{l}</button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-1.5 px-1">
            {v.kind === 'revenda' ? 'Revenda: produto de um cliente que a loja está vendendo pra ele.' : 'Produto que já é da loja (do estoque ou não).'}
          </p>
        </div>
      )}

      <Block title={sale ? 'Comprador' : 'Cliente'}>
        <F label="Nome *">
          <input list="shop-clients" value={v.client_name} onChange={e => pickClient(e.target.value)} className={input} placeholder="Selecione ou digite o cliente" />
          <datalist id="shop-clients">{pastClients.map(c => <option key={c.client_name} value={c.client_name} />)}</datalist>
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Telefone"><input value={v.client_phone ?? ''} onChange={e => set({ client_phone: e.target.value || null })} className={input} placeholder="(31) 9 9999-9999" inputMode="tel" /></F>
          <F label={cepBusy ? 'CEP · buscando...' : 'CEP'}><input value={v.client_cep ?? ''} onChange={e => onCep(e.target.value)} className={input} placeholder="00000-000" inputMode="numeric" /></F>
        </div>
        {sale && <F label="CPF (opcional)"><input value={v.client_cpf ?? ''} onChange={e => set({ client_cpf: e.target.value || null })} className={input} placeholder="000.000.000-00" inputMode="numeric" /></F>}
        <F label="Endereço"><input value={v.client_address ?? ''} onChange={e => set({ client_address: e.target.value || null })} className={input} placeholder="Rua, número, complemento" /></F>
        <F label="Bairro / Cidade"><input value={v.client_city ?? ''} onChange={e => set({ client_city: e.target.value || null })} className={input} placeholder="Ex: Jardim Leblon, Belo Horizonte-MG" /></F>
      </Block>

      {sale && v.kind === 'revenda' && (
        <Block title="Dono do produto">
          <div className="grid grid-cols-2 gap-3">
            <F label="Nome"><input value={v.owner_name ?? ''} onChange={e => set({ owner_name: e.target.value || null })} className={input} placeholder="De quem é o produto" /></F>
            <F label="Telefone"><input value={v.owner_phone ?? ''} onChange={e => set({ owner_phone: e.target.value || null })} className={input} placeholder="(31) 9 9999-9999" inputMode="tel" /></F>
          </div>
          <F label="Quanto repassar pro dono (R$)">
            <MoneyInput value={v.owner_amount || ''} onChange={e => set({ owner_amount: Number(e.target.value) || 0 })} className={input} placeholder="0,00" />
          </F>
          <p className="text-xs text-zinc-500">Esse valor entra no Financeiro como saída a pagar (&quot;Repasse de revenda&quot;). O que sobra é o ganho da loja{v.owner_amount > 0 && total > 0 ? `: ${fmt(total - v.owner_amount - fee)}` : ''}.</p>
        </Block>
      )}

      {!sale && <Block title="Informações básicas">
        <div className="grid grid-cols-2 gap-3">
          <F label="Data do pedido"><input type="date" value={v.date} onChange={e => set({ date: e.target.value })} className={input} /></F>
          <F label="Validade do orçamento (dias)"><input type="number" min="0" value={v.validity_days ?? ''} onChange={e => set({ validity_days: e.target.value ? Number(e.target.value) : null })} className={input} /></F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Aparelho">
            <input list="shop-appliances" value={v.appliance ?? ''} onChange={e => set({ appliance: e.target.value || null })} className={input} placeholder="Ex: Bebedouro" />
            <datalist id="shop-appliances">{APPLIANCE_TYPES.filter(t => t !== 'Outro').map(t => <option key={t} value={t} />)}</datalist>
          </F>
          <F label="Marca">
            <input list="shop-brands" value={v.brand ?? ''} onChange={e => set({ brand: e.target.value || null })} className={input} placeholder="Ex: Consul" />
            <datalist id="shop-brands">{APPLIANCE_BRANDS.filter(b => b !== 'Outra').map(b => <option key={b} value={b} />)}</datalist>
          </F>
          <F label="Modelo"><input value={v.model ?? ''} onChange={e => set({ model: e.target.value || null })} className={input} /></F>
          <F label="Número de série"><input value={v.serial_number ?? ''} onChange={e => set({ serial_number: e.target.value || null })} className={input} /></F>
        </div>
        <F label="Defeito"><input value={v.defect ?? ''} onChange={e => set({ defect: e.target.value || null })} className={input} placeholder="Ex: Não gela" /></F>
        <F label="Observações"><textarea rows={2} value={v.observations ?? ''} onChange={e => set({ observations: e.target.value || null })} className={`${input} resize-none`} placeholder="Estado do aparelho, acessórios que vieram junto..." /></F>
      </Block>}

      {!sale && <Block title="Compromisso" defaultOpen={!!v.visit_date}>
        <p className="text-xs text-zinc-500 flex items-center gap-1.5"><CalendarClock className="w-4 h-4" /> Visita técnica, entrega ou retirada marcada com o cliente</p>
        <div className="grid grid-cols-2 gap-3">
          <F label="Data"><input type="date" value={v.visit_date ?? ''} onChange={e => set({ visit_date: e.target.value || null })} className={input} /></F>
          <F label="Horário"><input type="time" value={v.visit_time?.slice(0, 5) ?? ''} onChange={e => set({ visit_time: e.target.value || null })} className={input} /></F>
        </div>
        <F label="O que é"><input value={v.visit_notes ?? ''} onChange={e => set({ visit_notes: e.target.value || null })} className={input} placeholder="Ex: Visita técnica, cliente busca o aparelho..." /></F>
      </Block>}

      <Block title={sale ? 'Produto vendido' : 'Pedido'}>
        {!sale && <Row icon={Wrench} label="Serviços" value={v.services.length ? fmt(linesTotal(v.services)) : undefined} onAdd={() => setModal('servico')}>{lines('services')}</Row>}
        <Row icon={Package} label={sale ? 'Produtos' : 'Peças'} value={v.parts.length ? fmt(linesTotal(v.parts)) : undefined} onAdd={() => setModal('peca')}>{lines('parts')}</Row>
        <Money label="Desconto" icon={Percent} value={v.discount} onChange={n => set({ discount: n })} negative />
        <Money label="Taxa de entrega" icon={Truck} value={v.delivery_fee} onChange={n => set({ delivery_fee: n })} />
        {!sale && <Money label="Frete" icon={Truck} value={v.freight} onChange={n => set({ freight: n })} />}
        {!sale && <Money label="Outras taxas" icon={Receipt} value={v.other_fees} onChange={n => set({ other_fees: n })} />}
        <div className="flex justify-between items-center bg-zinc-100 rounded-xl px-4 py-3 mt-1">
          <span className="text-sm font-semibold text-zinc-700">Total</span>
          <span className="text-lg font-bold text-zinc-900">{fmt(total)}</span>
        </div>
      </Block>

      {sale && (
        <Block title="Pagamento">
          <div className="grid grid-cols-2 gap-3">
            <F label="Data da venda"><input type="date" value={v.date} onChange={e => set({ date: e.target.value })} className={input} /></F>
            <F label="Forma de pagamento">
              <select value={method} onChange={e => set({ payment_methods: [e.target.value] })} className={input}>{PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}</select>
            </F>
          </div>
          {isCard && (
            <>
              <F label="Taxa da maquininha (%) — deixe em branco se não teve">
                <input type="number" inputMode="decimal" min="0" max="100" step="0.01" value={v.card_fee_pct || ''} onChange={e => set({ card_fee_pct: Number(e.target.value) || 0 })} className={input} placeholder="Ex: 3,5" />
              </F>
              {fee > 0 && <p className="text-xs text-zinc-500">Taxa de {fmt(fee)} lançada como saída · cai na conta {fmt(total - fee)}</p>}
            </>
          )}
          <label className="flex items-center gap-3 p-3 border border-zinc-200 rounded-xl cursor-pointer">
            <input type="checkbox" checked={v.sale_received} onChange={e => set({ sale_received: e.target.checked })} className="w-5 h-5 accent-emerald-500" />
            <span className="text-sm text-zinc-700">Já recebi o dinheiro</span>
          </label>
          {!v.sale_received && <p className="text-xs text-amber-600">A venda entra no caixa como &quot;a receber&quot;. Depois é só marcar como recebida.</p>}
        </Block>
      )}

      <Block title="Detalhes">
        {!sale && <F label="Condições de pagamento"><input value={v.payment_conditions ?? ''} onChange={e => set({ payment_conditions: e.target.value || null })} className={input} placeholder="Ex: À vista. / 50% entrada e 50% na entrega" /></F>}
        {!sale && <F label="Meios de pagamento aceitos">
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map(m => {
              const on = v.payment_methods.includes(m)
              return (
                <button key={m} type="button" onClick={() => set({ payment_methods: on ? v.payment_methods.filter(x => x !== m) : [...v.payment_methods, m] })}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${on ? 'text-white border-transparent' : 'bg-white text-zinc-600 border-zinc-200'}`}
                  style={on ? { background: 'var(--primary)' } : {}}>
                  {on && <Check className="w-3 h-3" />}{m}
                </button>
              )
            })}
          </div>
        </F>}
        <F label="Garantia">
          <div className="flex flex-wrap gap-2">
            {GUARANTEES.map(g => (
              <button key={g} type="button" onClick={() => set({ guarantee: v.guarantee === g ? null : g })}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${v.guarantee === g ? 'text-white border-transparent' : 'bg-white text-zinc-600 border-zinc-200'}`}
                style={v.guarantee === g ? { background: 'var(--primary)' } : {}}>{g}</button>
            ))}
          </div>
        </F>
        {sale && <F label="Observações (saem no recibo)"><textarea rows={2} value={v.observations ?? ''} onChange={e => set({ observations: e.target.value || null })} className={`${input} resize-none`} placeholder="Ex: produto usado, revisado, entregue funcionando..." /></F>}
        <F label="Anotações (só pra você, não saem no documento)"><textarea rows={2} value={v.notes ?? ''} onChange={e => set({ notes: e.target.value || null })} className={`${input} resize-none`} /></F>
      </Block>

      <p className="text-xs text-zinc-400 text-center">{sale ? 'O produto sai do estoque e a venda entra no caixa ao concluir.' : 'As fotos do aparelho são anexadas depois de salvar o pedido.'}</p>

      {/* Salvar fixo embaixo */}
      <div className="fixed left-0 right-0 z-30 px-4 lg:left-64" style={{ bottom: 'calc(var(--bottom-nav-height, 0px) + var(--safe-bottom, 0px) + 12px)' }}>
        <button type="button" onClick={save} disabled={saving}
          className="max-w-2xl mx-auto w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-base font-bold text-white shadow-lg disabled:opacity-60" style={{ background: 'var(--primary)' }}>
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : sale ? <ShoppingCart className="w-5 h-5" /> : <Save className="w-5 h-5" />} {sale ? (order ? 'Salvar venda' : 'Concluir venda') : 'Salvar pedido'} · {fmt(total)}
        </button>
      </div>

      {modal === 'servico' && <ServiceModal onClose={() => setModal(null)} onAdd={l => { set({ services: [...v.services, l] }); setModal(null); toastSuccess('Serviço adicionado ao pedido') }} />}
      {modal === 'peca' && <PartModal sale={sale} onClose={() => setModal(null)} onAdd={l => { set({ parts: [...v.parts, l] }); setModal(null); toastSuccess(sale ? 'Produto adicionado' : 'Peça adicionada ao pedido') }} />}
    </div>
  )
}

function Tabs({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string, any][] }) {
  return (
    <div className="flex bg-zinc-100 rounded-xl p-1">
      {options.map(([k, l, Icon]) => (
        <button key={k} type="button" onClick={() => onChange(k)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${value === k ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
          <Icon className="w-4 h-4" />{l}
        </button>
      ))}
    </div>
  )
}

function LineForm({ initial, onAdd, saveLabel, catalogToggle, partGuarantee }: { initial?: Partial<OrderLine>; onAdd: (l: OrderLine, saveToCatalog: boolean) => void; saveLabel: string; catalogToggle?: boolean; partGuarantee?: boolean }) {
  const [description, setDescription] = useState(initial?.description ?? '')
  const [details, setDetails] = useState(initial?.details ?? '')
  const [unit, setUnit] = useState(initial?.unit ?? 'un.')
  const [price, setPrice] = useState(initial?.unit_price ? String(initial.unit_price) : '')
  const [qty, setQty] = useState('1')
  const [toCatalog, setToCatalog] = useState(false)
  const [guarantee, setGuarantee] = useState(initial?.guarantee ?? '')
  const value = (Number(price) || 0) * (Number(qty) || 0)
  return (
    <>
      <F label="Qual é o item? *"><input autoFocus value={description} onChange={e => setDescription(e.target.value)} className={input} placeholder="Ex: Troca da placa" /></F>
      <F label="Detalhes (opcional)"><textarea rows={2} value={details} onChange={e => setDetails(e.target.value)} className={`${input} resize-none`} /></F>
      <div className="grid grid-cols-3 gap-3">
        <F label="Unidade"><input value={unit} onChange={e => setUnit(e.target.value)} className={input} /></F>
        <F label="Preço unitário"><MoneyInput min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className={input} placeholder="0,00" /></F>
        <F label="Quantidade"><input type="number" min="0" step="any" value={qty} onChange={e => setQty(e.target.value)} className={input} /></F>
      </div>
      {partGuarantee && (
        <F label="Garantia desta peça (opcional)">
          <div className="flex flex-wrap gap-2">
            {PART_PERIODS.map(p => (
              <button key={p} type="button" onClick={() => setGuarantee(guarantee === p ? '' : p)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${guarantee === p ? 'text-white border-transparent' : 'bg-white text-zinc-600 border-zinc-200'}`}
                style={guarantee === p ? { background: 'var(--primary)' } : {}}>{p}</button>
            ))}
          </div>
        </F>
      )}
      <div className="flex justify-between items-center bg-zinc-100 rounded-xl px-4 py-3">
        <span className="text-sm font-medium text-zinc-600">Valor</span><span className="font-bold text-zinc-900">{fmt(value)}</span>
      </div>
      {catalogToggle && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={toCatalog} onChange={e => setToCatalog(e.target.checked)} className="w-5 h-5 accent-orange-500" />
          <span className="text-sm text-zinc-700">Salvar no meu catálogo</span>
        </label>
      )}
      <button type="button" disabled={!description.trim()}
        onClick={() => onAdd({ description: description.trim(), details: details.trim() || undefined, unit: unit.trim() || 'un.', unit_price: Number(price) || 0, quantity: Number(qty) || 1, stock_item_id: initial?.stock_item_id ?? null, ...(partGuarantee && guarantee ? { guarantee } : {}) }, toCatalog)}
        className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: 'var(--primary)' }}>{saveLabel}</button>
    </>
  )
}

function ServiceModal({ onClose, onAdd }: { onClose: () => void; onAdd: (l: OrderLine) => void }) {
  const [tab, setTab] = useState('novo')
  const [catalog, setCatalog] = useState<CatalogService[] | null>(null)
  const [picked, setPicked] = useState<CatalogService | null>(null)
  const [q, setQ] = useState('')
  const load = () => getCatalog().then(setCatalog).catch(() => setCatalog([]))
  useEffect(() => { load() }, [])
  const list = useMemo(() => (catalog ?? []).filter(c => norm(c.name).includes(norm(q.trim()))), [catalog, q])

  return (
    <Sheet title="Adicionar serviço ao pedido" onClose={onClose}>
      <Tabs value={tab} onChange={t => { setTab(t); setPicked(null) }} options={[['catalogo', 'Catálogo', BookOpen], ['novo', 'Cadastrar serviço', Plus]]} />
      {tab === 'novo' || picked ? (
        <LineForm key={picked?.id ?? 'novo'} catalogToggle={!picked} saveLabel="Adicionar esse serviço"
          initial={picked ? { description: picked.name, details: picked.details ?? '', unit: picked.unit ?? 'un.', unit_price: picked.unit_price } : undefined}
          onAdd={async (l, save) => { if (save) await addToCatalog(l).catch(console.error); onAdd(l) }} />
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar no catálogo..." className={`${input} pl-9`} />
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-zinc-50 border border-zinc-100 rounded-xl">
            {catalog === null ? <p className="px-3 py-4 text-sm text-zinc-400 text-center">Carregando...</p>
              : list.length === 0 ? <p className="px-3 py-4 text-sm text-zinc-400 text-center">Catálogo vazio. Cadastre um serviço e marque &quot;Salvar no meu catálogo&quot;.</p>
              : list.map(c => (
                <div key={c.id} className="flex items-center gap-2 px-3 py-2.5">
                  <button type="button" onClick={() => setPicked(c)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-zinc-800 truncate">{c.name}</p>
                    <p className="text-xs text-zinc-500">{fmt(c.unit_price)} / {c.unit || 'un.'}</p>
                  </button>
                  <button type="button" onClick={async () => { if (confirm(`Tirar "${c.name}" do catálogo?`)) { await removeFromCatalog(c.id); load() } }} className="p-1.5 text-red-300"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
          </div>
        </>
      )}
    </Sheet>
  )
}

function PartModal({ onClose, onAdd, sale }: { onClose: () => void; onAdd: (l: OrderLine) => void; sale?: boolean }) {
  const [tab, setTab] = useState('estoque')
  const [items, setItems] = useState<LojaItem[] | null>(null)
  const [picked, setPicked] = useState<LojaItem | null>(null)
  const [q, setQ] = useState('')
  useEffect(() => { getLojaItems().then(setItems).catch(() => setItems([])) }, [])
  const list = (items ?? []).filter(i => norm([i.name, i.equipment_type, i.brand, i.model, i.serial_number].filter(Boolean).join(' ')).includes(norm(q.trim())))

  return (
    <Sheet title={sale ? 'Adicionar produto' : 'Adicionar peça ao pedido'} onClose={onClose}>
      <Tabs value={tab} onChange={t => { setTab(t); setPicked(null) }} options={[['estoque', 'Do estoque', Package], ['novo', sale ? 'Outro produto' : 'Outra peça', Plus]]} />
      {tab === 'novo' || picked ? (
        <LineForm key={picked?.id ?? 'novo'} saveLabel={sale ? 'Adicionar esse produto' : 'Adicionar essa peça'} partGuarantee
          initial={picked ? { description: [picked.name, picked.brand, picked.model].filter(Boolean).join(' '), details: picked.serial_number ? `Nº de série: ${picked.serial_number}` : undefined, unit: 'un.', unit_price: picked.sale_value || picked.unit_value, stock_item_id: picked.id } : undefined}
          onAdd={l => onAdd(l)} />
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar no estoque..." className={`${input} pl-9`} />
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-zinc-50 border border-zinc-100 rounded-xl">
            {items === null ? <p className="px-3 py-4 text-sm text-zinc-400 text-center">Carregando...</p>
              : list.length === 0 ? <p className="px-3 py-4 text-sm text-zinc-400 text-center">Nada no estoque. Use &quot;{sale ? 'Outro produto' : 'Outra peça'}&quot;.</p>
              : list.map(i => (
                <button key={i.id} type="button" onClick={() => setPicked(i)} className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 flex justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-zinc-800 truncate">{i.name}</span>
                    <span className="block text-xs text-zinc-500 truncate">{[i.brand, i.model, fmt(i.sale_value || i.unit_value)].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className={`text-xs font-semibold flex-shrink-0 ${i.quantity > 0 ? 'text-zinc-500' : 'text-red-500'}`}>{i.quantity} un.</span>
                </button>
              ))}
          </div>
          <p className="text-xs text-zinc-400">{sale ? 'O produto sai do estoque quando a venda for concluída.' : 'A peça sai do estoque quando o pedido for marcado como Entregue ou Concluído.'}</p>
        </>
      )}
    </Sheet>
  )
}
