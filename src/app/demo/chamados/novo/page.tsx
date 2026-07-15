'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, Save } from 'lucide-react'

const ORIGINS = ['WhatsApp', 'Indicação', 'Instagram', 'Telefone', 'Site']
const STATUSES = ['agendado', 'aprovado', 'nao_aprovou', 'nao_quis_visita', 'cancelado']
const STATUS_LABELS: Record<string, string> = {
  agendado: 'Agendado', aprovado: 'Aprovado', nao_aprovou: 'Não aprovou',
  nao_quis_visita: 'Não quis visita', cancelado: 'Cancelado',
}
const SERVICE_TYPES = ['Desentupimento', 'Hidrojateamento', 'Limpeza', 'Sucção', 'Aplicação de CO2', 'Outros', 'Reclamação']

const inputCls = "w-full rounded-xl px-4 py-3 text-sm border outline-none"

export default function DemoNovoChamado() {
  const [origin, setOrigin] = useState('')
  const [status, setStatus] = useState('agendado')
  const [services, setServices] = useState<string[]>([])

  const toggleService = (s: string) =>
    setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const isScheduled = status === 'agendado'

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/demo/chamados"
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Novo Chamado</h1>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Registre um novo chamado recebido</p>
        </div>
      </div>

      <div className="rounded-2xl p-5 space-y-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Informações do Chamado</p>

        {/* Origem */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Origem <span style={{ color: '#2563eb' }}>*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {ORIGINS.map(o => (
              <button key={o} onClick={() => setOrigin(o)}
                className="px-4 py-2 rounded-full text-sm font-medium transition border"
                style={origin === o
                  ? { background: '#2563eb', color: '#fff', borderColor: '#2563eb' }
                  : { background: 'var(--surface-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                {o}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Status <span style={{ color: '#2563eb' }}>*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className="px-4 py-2 rounded-full text-sm font-medium transition border"
                style={status === s
                  ? { background: '#2563eb', color: '#fff', borderColor: '#2563eb' }
                  : { background: 'var(--surface-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Data do Chamado */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Data do Chamado <span style={{ color: '#2563eb' }}>*</span>
          </label>
          <input type="date" defaultValue="2026-07-15"
            className={inputCls}
            style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        </div>

        {/* Nome do Contato */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Nome do Contato <span style={{ color: '#2563eb' }}>*</span>
            <span className="ml-1 font-normal text-xs" style={{ color: '#2563eb' }}>(quem vai ser atendido)</span>
          </label>
          <input type="text" placeholder="Ex: João Silva"
            className={inputCls}
            style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        </div>

        {/* Telefone + CPF */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Telefone</label>
            <input type="tel" placeholder="(51) 99999-9999"
              className={inputCls}
              style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>CPF / CNPJ</label>
            <input type="text" placeholder="000.000.000-00"
              className={inputCls}
              style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
        </div>

        {/* Solicitante */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Solicitante
            <span className="ml-1 font-normal text-xs" style={{ color: '#2563eb' }}>(quem ligou para pedir o serviço)</span>
          </label>
          <input type="text" placeholder="Ex: Maria (esposa do João), síndico..."
            className={inputCls}
            style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        </div>

        {/* Detalhes do Agendamento (only if agendado) */}
        {isScheduled && (
          <div className="rounded-2xl p-4 space-y-4" style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.2)' }}>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: '#2563eb' }} />
              <p className="text-sm font-semibold" style={{ color: '#2563eb' }}>Detalhes do Agendamento</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Data do Serviço</label>
                <input type="date" defaultValue="2026-07-15"
                  className={inputCls}
                  style={{ background: 'var(--surface)', borderColor: 'rgba(37,99,235,0.3)', color: 'var(--text-primary)' }} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Horário</label>
                <input type="time"
                  className={inputCls}
                  style={{ background: 'var(--surface)', borderColor: 'rgba(37,99,235,0.3)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Endereço do Serviço</label>
              <input type="text" placeholder="Rua, número, bairro, cidade"
                className={inputCls}
                style={{ background: 'var(--surface)', borderColor: 'rgba(37,99,235,0.3)', color: 'var(--text-primary)' }} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Técnico Responsável</label>
              <input type="text" placeholder="Nome do técnico que vai atender"
                className={inputCls}
                style={{ background: 'var(--surface)', borderColor: 'rgba(37,99,235,0.3)', color: 'var(--text-primary)' }} />
            </div>
          </div>
        )}

        {/* Tipo(s) de Serviço */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Tipo(s) de Serviço</label>
          <div className="flex flex-wrap gap-2">
            {SERVICE_TYPES.map(s => (
              <button key={s} onClick={() => toggleService(s)}
                className="px-4 py-2 rounded-full text-sm font-medium transition border"
                style={services.includes(s)
                  ? { background: '#2563eb', color: '#fff', borderColor: '#2563eb' }
                  : { background: 'var(--surface-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Observações */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Observações</label>
          <textarea rows={3} placeholder="Anotações sobre o chamado..."
            className={inputCls}
            style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)', resize: 'none' }} />
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-3 pb-4">
        <Link href="/demo/chamados"
          className="px-6 py-2.5 rounded-xl text-sm font-medium transition"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          Cancelar
        </Link>
        <button disabled
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white opacity-50 cursor-not-allowed"
          style={{ background: '#2563eb' }}>
          <Save className="w-4 h-4" />
          Salvar Chamado
        </button>
      </div>
    </div>
  )
}
