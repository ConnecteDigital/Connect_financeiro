'use client'

import { Users, Phone, MapPin } from 'lucide-react'
import { MOCK_CLIENTS } from '../data'

export default function DemoClientes() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.1)' }}>
          <Users className="w-5 h-5" style={{ color: '#2563eb' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Clientes</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{MOCK_CLIENTS.length} clientes cadastrados</p>
        </div>
      </div>

      <div className="space-y-2">
        {MOCK_CLIENTS.map(client => (
          <div key={client.id} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ background: '#2563eb', fontSize: 16 }}>
                {client.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{client.name}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <Phone className="w-3 h-3" />{client.phone}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <MapPin className="w-3 h-3" />{client.neighborhood} · {client.city}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>
                  {client.calls} chamado{client.calls !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
