'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CallRow {
  id: string
  date: string
  call_time: string | null
  contact_name: string | null
  call_neighborhood: string | null
  call_city: string | null
  contact_phone: string | null
  service_category: string | null
  status: string
  notes: string | null
  service_orders: { total_value: number | null; payment_status: string | null }[]
}

const STATUS_LABEL: Record<string, string> = {
  aprovado: 'Feito',
  agendado: 'Agendado',
  nao_aprovou: 'Não aprovou',
  nao_quis_visita: 'Não quis',
  cancelado: 'Cancelado',
}

const PAYMENT_LABEL: Record<string, string> = {
  pago: 'Pago',
  pago_parcial: 'Parcial',
  pendente: 'Pendente',
}

function fmt(date: string) {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

export default function ResumoDiaPage() {
  const [calls, setCalls] = useState<CallRow[]>([])
  const [date, setDate] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedDate = sessionStorage.getItem('resumo_dia_date') || new Date().toISOString().slice(0, 10)
    setDate(storedDate)

    const supabase = createClient()

    async function load() {
      // Get tenant
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
        if (profile?.tenant_id) {
          const { data: tenant } = await supabase.from('tenants').select('name').eq('id', profile.tenant_id).single()
          if (tenant) setTenantName(tenant.name)
        }
      }

      const { data } = await supabase
        .from('calls')
        .select(`
          id, date, call_time, contact_name, call_neighborhood, call_city,
          contact_phone, service_category, status, notes,
          service_orders(total_value, payment_status)
        `)
        .eq('date', storedDate)
        .order('call_time', { ascending: true, nullsFirst: false })

      setCalls((data as CallRow[]) ?? [])
      setLoading(false)
    }

    load()
  }, [])

  useEffect(() => {
    if (!loading && calls !== null) {
      setTimeout(() => window.print(), 600)
    }
  }, [loading, calls])

  const totalValue = calls.reduce((sum, c) => {
    const os = c.service_orders?.[0]
    return sum + (os?.total_value ?? 0)
  }, 0)

  const totalFeitos = calls.filter(c => c.status === 'aprovado').length

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; background: white; color: #111; }
        @page { margin: 12mm 10mm; size: A4 landscape; }
        @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

        .page { padding: 16px; }

        .header { margin-bottom: 12px; }
        .header h1 { font-size: 16px; font-weight: bold; color: #1a1a1a; }
        .header p { font-size: 11px; color: #555; margin-top: 2px; }

        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #1e4d2b; color: white; }
        thead th { padding: 6px 8px; text-align: left; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.03em; white-space: nowrap; }
        tbody tr:nth-child(even) { background: #f5f9f5; }
        tbody tr:hover { background: #eaf4ea; }
        tbody td { padding: 6px 8px; border-bottom: 1px solid #e5e5e5; vertical-align: middle; }

        .status-pill { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: bold; }
        .status-feito { background: #dcfce7; color: #15803d; }
        .status-agendado { background: #dbeafe; color: #1d4ed8; }
        .status-outros { background: #fee2e2; color: #b91c1c; }

        .total-row { background: #b91c1c !important; color: white; }
        .total-row td { padding: 7px 8px; font-weight: bold; font-size: 12px; }

        .summary { display: flex; gap: 20px; margin-bottom: 14px; }
        .summary-card { background: #f0faf0; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 14px; }
        .summary-card .label { font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 0.05em; }
        .summary-card .value { font-size: 16px; font-weight: bold; color: #15803d; margin-top: 1px; }

        .footer { margin-top: 16px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }

        .print-btn { position: fixed; bottom: 24px; right: 24px; background: #1e4d2b; color: white; border: none; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.2); z-index: 100; }

        .date-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .date-bar input { border: 1px solid #ccc; padding: 4px 8px; border-radius: 6px; font-size: 11px; }
        .date-bar button { background: #1e4d2b; color: white; border: none; padding: 5px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; }
      `}</style>

      <div className="page">
        {/* Date picker (only on screen) */}
        <div className="date-bar no-print">
          <label style={{ fontWeight: 600 }}>Data:</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          <button onClick={async () => {
            setLoading(true)
            const supabase = createClient()
            const { data } = await supabase
              .from('calls')
              .select(`id, date, call_time, contact_name, call_neighborhood, call_city, contact_phone, service_category, status, notes, service_orders(total_value, payment_status)`)
              .eq('date', date)
              .order('call_time', { ascending: true, nullsFirst: false })
            setCalls((data as CallRow[]) ?? [])
            setLoading(false)
          }}>Buscar</button>
        </div>

        <div className="header">
          <h1>{tenantName} — Resumo do Dia</h1>
          <p>Data: {date ? fmt(date) : '—'} &nbsp;·&nbsp; Gerado em: {new Date().toLocaleString('pt-BR')}</p>
        </div>

        {/* Summary cards */}
        <div className="summary">
          <div className="summary-card">
            <div className="label">Total de chamados</div>
            <div className="value">{calls.length}</div>
          </div>
          <div className="summary-card">
            <div className="label">Feitos (OS)</div>
            <div className="value">{totalFeitos}</div>
          </div>
          <div className="summary-card" style={{ borderColor: '#fbbf24', background: '#fffbeb' }}>
            <div className="label">Faturamento do dia</div>
            <div className="value" style={{ color: '#b45309' }}>R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>Carregando...</p>
        ) : calls.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>Nenhum chamado nesta data.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Bairro / Cidade</th>
                <th>Telefone</th>
                <th>Solicitação</th>
                <th>Status</th>
                <th>Pagamento</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {calls.map(c => {
                const os = c.service_orders?.[0]
                const value = os?.total_value ?? null
                const statusLabel = STATUS_LABEL[c.status] ?? c.status
                const pillCls = c.status === 'aprovado' ? 'status-feito' : c.status === 'agendado' ? 'status-agendado' : 'status-outros'
                const local = [c.call_neighborhood, c.call_city].filter(Boolean).join(' / ') || '—'
                return (
                  <tr key={c.id}>
                    <td>{fmt(c.date)}</td>
                    <td>{c.call_time ? c.call_time.slice(0, 5) : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{c.contact_name || '—'}</td>
                    <td>{local}</td>
                    <td>{c.contact_phone || '—'}</td>
                    <td>{c.service_category || '—'}</td>
                    <td><span className={`status-pill ${pillCls}`}>{statusLabel}</span></td>
                    <td>{os?.payment_status ? (PAYMENT_LABEL[os.payment_status] ?? os.payment_status) : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {value != null ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                  </tr>
                )
              })}
              <tr className="total-row">
                <td colSpan={8}>TOTAL DO DIA — {calls.length} chamado{calls.length !== 1 ? 's' : ''} ({totalFeitos} feito{totalFeitos !== 1 ? 's' : ''})</td>
                <td style={{ textAlign: 'right' }}>R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        )}

        <div className="footer">
          {tenantName} &nbsp;·&nbsp; Connect Financeiro &nbsp;·&nbsp; Impresso em {new Date().toLocaleString('pt-BR')}
        </div>
      </div>

      <button className="print-btn no-print" onClick={() => window.print()}>
        🖨️ Imprimir / Salvar PDF
      </button>
    </>
  )
}
