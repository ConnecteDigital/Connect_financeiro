'use client'

import { useState } from 'react'
import { Settings, UserCog, Users, Wrench, Radio, Building2, Palette, Trash2, Power, Plus } from 'lucide-react'
import { COMPANY } from '../data'

const MOCK_TEAMS = ['Equipe Alpha', 'Equipe Beta', 'Equipe Gamma']
const MOCK_SERVICES = [
  { name: 'Desentupimento de cano',   category: 'Desentupimento' },
  { name: 'Desentupimento de coluna', category: 'Desentupimento' },
  { name: 'Desentupimento de esgoto', category: 'Desentupimento' },
  { name: 'Limpeza de caixa d\'água', category: 'Limpeza' },
  { name: 'Higienização de fossas',   category: 'Limpeza' },
]
const MOCK_ORIGINS = ['Indicação', 'WhatsApp', 'Site', 'Instagram', 'Facebook', 'Google', 'Telefone']
const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2', '#db2777', '#65a30d']

export default function DemoConfiguracoes() {
  const [commActive] = useState(true)

  return (
    <div className="space-y-5 max-w-2xl mx-auto lg:mx-0">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Configurações</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Gerencie equipes, tipos de serviço, auxiliares e preferências do sistema</p>
      </div>

      {/* Módulo de Comissões */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <UserCog className="w-4 h-4" style={{ color: '#2563eb' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Módulo de Comissões</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Ativar controle de comissões</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Permite múltiplos auxiliares por chamado, comissão do dono e geração automática de saídas
            </p>
          </div>
          <div className="flex-shrink-0 ml-4">
            <div className="w-12 h-6 rounded-full flex items-center px-1 transition-all"
              style={{ background: commActive ? '#2563eb' : 'var(--border)', justifyContent: commActive ? 'flex-end' : 'flex-start' }}>
              <div className="w-4 h-4 rounded-full bg-white shadow" />
            </div>
          </div>
        </div>
        {commActive && (
          <div className="rounded-xl px-3 py-2 text-xs font-medium" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}>
            ✓ Comissões ativas — múltiplos auxiliares e geração automática de saídas habilitados
          </div>
        )}
      </div>

      {/* Equipes */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: '#2563eb' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Equipes</p>
        </div>
        <div className="space-y-1.5">
          {MOCK_TEAMS.map(team => (
            <div key={team} className="flex items-center justify-between py-2.5 px-3 rounded-xl"
              style={{ border: '1px solid var(--border)', background: 'var(--surface-secondary)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{team}</span>
              <button disabled className="opacity-30 cursor-not-allowed">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input disabled placeholder="Nome da nova equipe..." className="input-field flex-1 py-2 text-sm opacity-50 cursor-not-allowed" />
          <button disabled className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white opacity-40 cursor-not-allowed"
            style={{ background: '#2563eb' }}>
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
      </div>

      {/* Tipos de Serviço */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4" style={{ color: '#2563eb' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Tipos de Serviço</p>
        </div>
        <div className="space-y-1.5">
          {MOCK_SERVICES.map(s => (
            <div key={s.name} className="flex items-center justify-between py-2.5 px-3 rounded-xl"
              style={{ border: '1px solid var(--border)', background: 'var(--surface-secondary)' }}>
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                <span className="ml-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{s.category}</span>
              </div>
              <div className="flex items-center gap-2 opacity-30">
                <Power className="w-4 h-4" style={{ color: '#2563eb' }} />
                <Trash2 className="w-4 h-4 text-red-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Origens dos Chamados */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4" style={{ color: '#2563eb' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Origens dos Chamados</p>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Canais pelos quais seus clientes entram em contato.</p>
        <div className="flex flex-wrap gap-2">
          {MOCK_ORIGINS.map((o, i) => (
            <span key={o} className="px-3 py-1.5 rounded-xl text-xs font-medium border"
              style={i < 4
                ? { background: 'rgba(37,99,235,0.08)', color: '#2563eb', borderColor: 'rgba(37,99,235,0.3)' }
                : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
              {i < 4 ? '✓ ' : ''}{o}
            </span>
          ))}
        </div>
      </div>

      {/* Dados da Empresa */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4" style={{ color: '#2563eb' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Dados da Empresa</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Nome da Empresa</label>
            <input disabled value={COMPANY} className="input-field w-full py-2 text-sm opacity-60 cursor-not-allowed" readOnly />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>CNPJ</label>
              <input disabled placeholder="00.000.000/0000-00" className="input-field w-full py-2 text-sm opacity-50 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Telefone</label>
              <input disabled placeholder="(51) 99999-9999" className="input-field w-full py-2 text-sm opacity-50 cursor-not-allowed" />
            </div>
          </div>
          <button disabled className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white opacity-40 cursor-not-allowed"
            style={{ background: '#2563eb' }}>
            Salvar
          </button>
        </div>
      </div>

      {/* Identidade Visual */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4" style={{ color: '#2563eb' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Identidade Visual</p>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Logo e cor que aparecem no sistema, nas Ordens de Serviço e nos Romaneios.</p>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
            style={{ background: '#2563eb' }}>{COMPANY[0]}</div>
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Logo da empresa</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>PNG ou JPG, de preferência com fundo transparente</p>
            <button disabled className="mt-1.5 text-xs font-medium px-3 py-1 rounded-lg opacity-40 cursor-not-allowed"
              style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              Trocar logo
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Cor do sistema</p>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c, i) => (
              <button key={c} disabled className="w-8 h-8 rounded-full flex items-center justify-center cursor-not-allowed"
                style={{ background: c, outline: i === 0 ? `3px solid ${c}` : 'none', outlineOffset: '2px' }}>
                {i === 0 && <span className="text-white text-xs font-bold">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
