'use client'

import { use, useEffect, useState } from 'react'
import ShopOrderEditor from '@/components/ShopOrderEditor'
import { getShopOrder, type ShopOrder } from '@/lib/db/shop-orders'

export default function EditarPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<ShopOrder | null | undefined>(undefined)
  useEffect(() => { getShopOrder(id).then(setOrder).catch(() => setOrder(null)) }, [id])
  if (order === undefined) return <div className="max-w-2xl mx-auto h-40 bg-zinc-100 rounded-2xl animate-pulse" />
  if (!order) return <p className="text-center text-zinc-500 py-16">Pedido não encontrado.</p>
  return <ShopOrderEditor order={order} />
}
