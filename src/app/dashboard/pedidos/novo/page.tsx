'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ShopOrderEditor from '@/components/ShopOrderEditor'

// /dashboard/pedidos/novo            → serviço (conserto / orçamento)
// /dashboard/pedidos/novo?tipo=venda → venda (ou revenda); ?item= já abre com o produto do estoque
function NovoPedido() {
  const sp = useSearchParams()
  const tipo = sp.get('tipo')
  const kind = tipo === 'venda' || tipo === 'revenda' ? tipo : 'servico'
  return <ShopOrderEditor key={kind} initialKind={kind} initialItemId={sp.get('item')} />
}

export default function NovoPedidoPage() {
  return <Suspense fallback={<div className="max-w-2xl mx-auto h-40 bg-zinc-100 rounded-2xl animate-pulse" />}><NovoPedido /></Suspense>
}
