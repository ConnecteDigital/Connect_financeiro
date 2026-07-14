'use client'

import { Settings, Building2, Palette, Bell, Shield } from 'lucide-react'
import { COMPANY } from '../data'

export default function DemoConfiguracoes() {
  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.1)' }}>
          <Settings className="w-5 h-5" style={{ color: '#2563eb' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Configurações</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Personalize seu sistema</p>
        </div>
      </div>

      {[
        { icon: Building2, title: 'Dados da Empresa',   desc: COMPANY,            sub: 'Nome, logo e informações gerais' },
        { icon: Palette,   title: 'Personalização',      desc: 'Cor e aparência',  sub: 'Cor primária, tema e layout' },
        { icon: Bell,      title: 'Notificações',        desc: 'Alertas e avisos', sub: 'Configure lembretes e notificações' },
        { icon: Shield,    title: 'Segurança',           desc: 'Acesso e senha',   sub: 'Gerencie usuários e permissões' },
      ].map(item => (
        <div key={item.title} className="flex items-center gap-4 rounded-2xl p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--surface-secondary)' }}>
            <item.icon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{item.sub}</p>
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded-lg" style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
            Demo
          </span>
        </div>
      ))}
    </div>
  )
}
