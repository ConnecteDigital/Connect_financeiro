'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import Image from 'next/image'
import { getCall } from '@/lib/db/calls'
import { useTenant } from '@/lib/tenant-context'
import { Share2 } from 'lucide-react'

const fmt = (v: number | string) =>
  `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

function ImprimirContent({ id }: { id: string }) {
  const { tenant } = useTenant()
  const [call, setCall] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCall(id).then(setCall).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-500">Carregando...</div>
  if (!call) return <div className="flex items-center justify-center h-screen text-slate-500">Chamado não encontrado.</div>

  const so = call.service_orders?.[0]
  if (!so) return <div className="flex items-center justify-center h-screen text-slate-500">Este chamado não possui ordem de serviço.</div>

  const companyName = tenant?.name ?? 'Empresa'
  const primaryColor = tenant?.primary_color ?? '#f97316'
  const logoUrl = tenant?.logo_url

  const originLabel = call.origin ?? null

  const client = call.client
  const items = so.items ?? []

  const levantamento = [
    so.has_floor_plan && 'Com planta baixa',
    so.has_no_floor_plan && 'Sem planta baixa',
    so.has_no_knowledge && 'Sem conhecimento',
    so.has_hydraulic_plan && 'Com planta hidráulica',
    so.has_no_hydraulic_plan && 'Sem planta hidráulica',
    so.has_guarantee && 'Com garantia de 30 dias',
    so.has_no_guarantee && 'Sem garantia',
  ].filter(Boolean)

  return (
    <>
      <div className="print:hidden fixed bottom-6 inset-x-0 flex justify-center z-50 px-4">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2.5 text-white font-semibold px-8 py-4 rounded-2xl shadow-2xl transition active:scale-95"
          style={{ backgroundColor: primaryColor, boxShadow: `0 8px 24px ${primaryColor}60` }}>
          <Share2 className="w-5 h-5" />
          Compartilhar PDF
        </button>
      </div>

      <div className="print:m-0 bg-white p-6 pb-28 print:pb-6 font-sans text-[13px] text-black max-w-[800px] mx-auto min-h-screen">
        {/* Cabeçalho */}
        <div className="border-2 border-black mb-0">
          <div className="flex">
            {/* Logo / empresa */}
            <div className="border-r-2 border-black flex items-center justify-center w-40 min-h-[80px]"
              style={{ backgroundColor: primaryColor }}>
              {logoUrl ? (
                <Image src={logoUrl} alt={companyName} width={80} height={64}
                  className="object-contain p-2"
                  style={{ width: 80, height: 64 }} />
              ) : (
                <div className="text-center text-white p-3">
                  <p className="font-black text-xl leading-tight">{companyName.split(' ')[0]}</p>
                  <p className="text-[10px] leading-tight opacity-80">
                    {companyName.split(' ').slice(1).join(' ') || 'Serviços'}
                  </p>
                </div>
              )}
            </div>
            {/* Dados empresa */}
            <div className="flex-1 p-3 text-[11px] leading-snug">
              <p className="font-bold text-[13px]">{companyName}</p>
              <p>Atendimento 24h · Domingos e Feriados</p>
              {originLabel && (
                <p className="mt-1 font-semibold" style={{ color: primaryColor }}>
                  {originLabel}
                </p>
              )}
            </div>
            {/* OS número */}
            <div className="border-l-2 border-black p-3 flex flex-col items-center justify-center w-36">
              <p className="text-[10px] font-bold uppercase tracking-wide">Ordem de Serviço</p>
              <p className="text-3xl font-black mt-1">{so.os_number}</p>
            </div>
          </div>
        </div>

        {/* Dados do cliente */}
        <div className="border-x-2 border-b-2 border-black">
          <div className="px-3 py-1 font-bold text-center text-[11px] uppercase border-b border-black text-white"
            style={{ backgroundColor: primaryColor }}>
            Dados do Cliente
          </div>
          <div className="grid grid-cols-3 divide-x divide-black">
            <div className="p-2 col-span-2">
              <p className="text-[10px] font-bold uppercase text-gray-500">Nome</p>
              <p className="font-semibold">{client?.name ?? call.contact_name ?? '—'}</p>
            </div>
            <div className="p-2">
              <p className="text-[10px] font-bold uppercase text-gray-500">CNPJ / CPF</p>
              <p>{client?.cpf_cnpj ?? '—'}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 divide-x divide-black border-t border-black">
            <div className="p-2 col-span-2">
              <p className="text-[10px] font-bold uppercase text-gray-500">Endereço</p>
              <p>{call.call_address || client?.address || '—'}</p>
            </div>
            <div className="p-2">
              <p className="text-[10px] font-bold uppercase text-gray-500">Bairro</p>
              <p>{call.call_neighborhood || client?.neighborhood || '—'}</p>
            </div>
            <div className="p-2">
              <p className="text-[10px] font-bold uppercase text-gray-500">CEP</p>
              <p>{client?.cep ?? '—'}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 divide-x divide-black border-t border-black">
            <div className="p-2 col-span-2">
              <p className="text-[10px] font-bold uppercase text-gray-500">Município</p>
              <p>{call.call_city || client?.city || '—'}</p>
            </div>
            <div className="p-2">
              <p className="text-[10px] font-bold uppercase text-gray-500">Fone</p>
              <p>{call.contact_phone || client?.phone || '—'}</p>
            </div>
            <div className="p-2">
              <p className="text-[10px] font-bold uppercase text-gray-500">UF</p>
              <p>{client?.state ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Tipo de serviço */}
        <div className="border-x-2 border-b-2 border-black">
          <div className="px-3 py-1 font-bold text-center text-[11px] uppercase border-b border-black text-white"
            style={{ backgroundColor: primaryColor }}>
            Dados do Serviço
          </div>
          <div className="grid grid-cols-2 divide-x divide-black">
            <div className="p-2">
              <p className="text-[10px] font-bold uppercase text-gray-500">Categoria</p>
              <p>{call.service_category ?? '—'}</p>
            </div>
            <div className="p-2">
              <p className="text-[10px] font-bold uppercase text-gray-500">Data</p>
              <p>{so.date ? new Date(so.date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</p>
            </div>
          </div>
          {call.notes && (
            <div className="p-2 border-t border-black">
              <p className="text-[10px] font-bold uppercase text-gray-500">Observações do chamado</p>
              <p>{call.notes}</p>
            </div>
          )}
        </div>

        {/* Levantamento */}
        {levantamento.length > 0 && (
          <div className="border-x-2 border-b-2 border-black">
            <div className="px-3 py-1 font-bold text-center text-[11px] uppercase border-b border-black text-white"
              style={{ backgroundColor: primaryColor }}>
              Levantamento
            </div>
            <div className="p-2 flex flex-wrap gap-x-6 gap-y-1">
              {levantamento.map(item => (
                <span key={item as string} className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 border border-black flex items-center justify-center text-[10px]">✓</span>
                  <span>{item as string}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Itens do serviço */}
        <div className="border-x-2 border-b-2 border-black">
          <div className="px-3 py-1 font-bold text-center text-[11px] uppercase border-b border-black text-white"
            style={{ backgroundColor: primaryColor }}>
            Serviços / Peças
          </div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left p-2 w-12 border-r border-black font-bold">Qtd</th>
                <th className="text-left p-2 border-r border-black font-bold">Descrição</th>
                <th className="text-right p-2 w-28 border-r border-black font-bold">Vlr Unit.</th>
                <th className="text-right p-2 w-28 font-bold">Vlr Total</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? items.map((item: any) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="p-2 border-r border-black text-center">{item.quantity}</td>
                  <td className="p-2 border-r border-black">{item.description}</td>
                  <td className="p-2 border-r border-black text-right">{fmt(item.unit_price)}</td>
                  <td className="p-2 text-right">{fmt(item.total ?? item.quantity * item.unit_price)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="p-2 text-center text-gray-400">Nenhum item</td></tr>
              )}
              {Array.from({ length: Math.max(0, 3 - items.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-gray-200">
                  <td className="p-2 border-r border-black">&nbsp;</td>
                  <td className="p-2 border-r border-black">&nbsp;</td>
                  <td className="p-2 border-r border-black">&nbsp;</td>
                  <td className="p-2">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totais */}
        <div className="border-x-2 border-b-2 border-black">
          <div className="flex">
            <div className="flex-1 p-3 border-r border-black">
              {so.conditions && (
                <>
                  <p className="text-[10px] font-bold uppercase text-gray-500">Condições de Pagamento</p>
                  <p className="mt-0.5">{so.conditions}</p>
                </>
              )}
              {so.observations && (
                <div className="mt-2">
                  <p className="text-[10px] font-bold uppercase text-gray-500">Observações</p>
                  <p className="mt-0.5">{so.observations}</p>
                </div>
              )}
            </div>
            <div className="w-52 divide-y divide-black">
              {Number(so.equipment_rental_value) > 0 && (
                <div className="flex justify-between px-3 py-1.5">
                  <span className="font-semibold">Locação / M.O.</span>
                  <span>{fmt(so.equipment_rental_value)}</span>
                </div>
              )}
              {Number(so.discount) > 0 && (
                <div className="flex justify-between px-3 py-1.5">
                  <span className="font-semibold">Desconto</span>
                  <span>- {fmt(so.discount)}</span>
                </div>
              )}
              {Number(so.taxes) > 0 && (
                <div className="flex justify-between px-3 py-1.5">
                  <span className="font-semibold">Impostos</span>
                  <span>{fmt(so.taxes)}</span>
                </div>
              )}
              <div className="flex justify-between px-3 py-2 text-white"
                style={{ backgroundColor: primaryColor }}>
                <span className="font-bold text-[14px]">TOTAL</span>
                <span className="font-bold text-[14px]">{fmt(so.total_value)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pagamento / NF / Equipe */}
        <div className="border-x-2 border-b-2 border-black">
          <div className="grid grid-cols-3 divide-x divide-black">
            {so.nf_number && (
              <div className="p-2">
                <p className="text-[10px] font-bold uppercase text-gray-500">Nº NF</p>
                <p>{so.nf_number}</p>
              </div>
            )}
            {so.payment_method && (
              <div className="p-2">
                <p className="text-[10px] font-bold uppercase text-gray-500">Forma de Pagamento</p>
                <p>{so.payment_method}</p>
              </div>
            )}
            {so.team && (
              <div className="p-2">
                <p className="text-[10px] font-bold uppercase text-gray-500">Equipe</p>
                <p>{so.team.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Assinaturas */}
        <div className="border-x-2 border-b-2 border-black">
          <div className="grid grid-cols-3 divide-x divide-black">
            <div className="p-3">
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-6">Data</p>
              <div className="border-t border-black pt-1">
                <p className="text-[10px] text-center text-gray-500">
                  {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            <div className="p-3">
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-6">Técnico Responsável</p>
              <div className="border-t border-black pt-1">
                <p className="text-[10px] text-center text-gray-500">{so.driver ?? ''}</p>
              </div>
            </div>
            <div className="p-3">
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-6">Assinatura do Cliente</p>
              <div className="border-t border-black pt-1">
                <p className="text-[10px] text-center text-gray-500">{client?.name ?? call.contact_name ?? ''}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="text-center text-[10px] text-gray-400 mt-2">
          {companyName} · Atendimento 24 horas, inclusive domingos e feriados
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 10mm; size: A4; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  )
}

export default function ImprimirOSPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ImprimirContent id={id} />
}
