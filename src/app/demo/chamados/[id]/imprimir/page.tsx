'use client'

import { useParams } from 'next/navigation'
import { useRef } from 'react'
import { MOCK_CALLS, COMPANY } from '../../../data'

function fmt(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

export default function DemoImprimir() {
  const { id } = useParams()
  const call = MOCK_CALLS.find(c => c.id === id)
  const sheetRef = useRef<HTMLDivElement>(null)

  if (!call || !call.total_value) return (
    <div className="text-center py-20 text-gray-400">Ordem de Serviço não disponível</div>
  )

  const items = [
    { desc: `${call.service_category} — mão de obra`, qty: 1, unit: call.total_value * 0.6, total: call.total_value * 0.6 },
    { desc: 'Materiais e peças',                       qty: 1, unit: call.total_value * 0.3, total: call.total_value * 0.3 },
    { desc: 'Deslocamento / Visita técnica',           qty: 1, unit: call.total_value * 0.1, total: call.total_value * 0.1 },
  ]

  return (
    <div className="bg-white min-h-screen p-4">
      {/* Action bar */}
      <div className="max-w-2xl mx-auto mb-4 flex gap-2 print:hidden">
        <button onClick={() => window.print()}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: '#2563eb' }}>
          Imprimir / Salvar PDF
        </button>
        <button onClick={() => window.history.back()}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600">
          Voltar
        </button>
      </div>

      {/* Document */}
      <div ref={sheetRef} className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{COMPANY}</h1>
            <p className="text-xs text-gray-500 mt-1">Serviços Especializados</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-blue-600">ORDEM DE SERVIÇO</p>
            <p className="text-sm font-semibold text-gray-700">{call.os_number}</p>
            <p className="text-xs text-gray-500">{new Date(call.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* Client info */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Cliente</p>
            <p className="text-sm font-semibold text-gray-800">{call.contact_name}</p>
            <p className="text-xs text-gray-500">{call.contact_phone}</p>
            {call.contact_cpf && <p className="text-xs text-gray-500">CPF: {call.contact_cpf}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Endereço</p>
            <p className="text-sm text-gray-700">{call.call_address}</p>
            <p className="text-xs text-gray-500">{call.call_neighborhood} · {call.call_city}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5 p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Tipo de Serviço</p>
            <p className="text-sm font-medium text-gray-700">{call.service_category}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Equipe</p>
            <p className="text-sm font-medium text-gray-700">{call.team}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Pagamento</p>
            <p className="text-sm font-medium text-gray-700">{call.payment_method}</p>
          </div>
        </div>

        {/* Service notes */}
        <div className="mb-5 p-3 bg-blue-50 rounded-xl">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Descrição do Problema</p>
          <p className="text-sm text-gray-700">{call.notes}</p>
        </div>

        {/* Items table */}
        <table className="w-full mb-5 text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Descrição</th>
              <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase">Qtd</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Unit.</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 text-gray-700">{item.desc}</td>
                <td className="py-2 text-center text-gray-600">{item.qty}</td>
                <td className="py-2 text-right text-gray-600">{fmt(item.unit)}</td>
                <td className="py-2 text-right font-semibold text-gray-800">{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300">
              <td colSpan={3} className="py-3 text-right font-bold text-gray-800">TOTAL</td>
              <td className="py-3 text-right font-bold text-lg text-blue-600">{fmt(call.total_value)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Status */}
        <div className="flex items-center justify-between p-3 rounded-xl mb-5"
          style={call.payment_status === 'pago'
            ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }
            : { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <p className="text-sm font-semibold" style={{ color: call.payment_status === 'pago' ? '#10b981' : '#f59e0b' }}>
            {call.payment_status === 'pago' ? '✓ Pagamento Recebido' : '⏳ Pagamento Pendente'}
          </p>
          <p className="text-sm font-bold" style={{ color: call.payment_status === 'pago' ? '#10b981' : '#f59e0b' }}>
            {fmt(call.total_value)}
          </p>
        </div>

        {/* Signature */}
        <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="h-12 border-b border-gray-400 mb-1" />
            <p className="text-xs text-gray-500">Assinatura do Cliente</p>
          </div>
          <div className="text-center">
            <div className="h-12 border-b border-gray-400 mb-1" />
            <p className="text-xs text-gray-500">Responsável Técnico</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {COMPANY} · Documento gerado em {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  )
}
