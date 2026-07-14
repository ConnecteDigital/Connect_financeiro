'use client'

import { Building2, Phone, Mail } from 'lucide-react'
import { MOCK_SUPPLIERS } from '../data'

export default function DemoFornecedores() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.1)' }}>
          <Building2 className="w-5 h-5" style={{ color: '#2563eb' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Fornecedores</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Empresas e parceiros cadastrados</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {MOCK_SUPPLIERS.map((s, i) => (
          <div key={s.id} className="flex items-center justify-between p-4 transition"
            style={{ borderBottom: i < MOCK_SUPPLIERS.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(37,99,235,0.1)' }}>
                <Building2 className="w-5 h-5" style={{ color: '#2563eb' }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {s.category && (
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
                      {s.category}
                    </span>
                  )}
                  {s.phone && (
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                      <Phone className="w-3 h-3" />{s.phone}
                    </span>
                  )}
                  {s.email && (
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                      <Mail className="w-3 h-3" />{s.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
