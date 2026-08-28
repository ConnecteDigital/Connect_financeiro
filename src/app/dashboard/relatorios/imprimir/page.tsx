'use client'

import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'

const fmt = (v: number) =>
  `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

function Badge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    pago:      { label: 'Pago',      color: '#10b981' },
    pendente:  { label: 'Pendente',  color: '#f59e0b' },
    cancelado: { label: 'Cancelado', color: '#ef4444' },
  }
  const s = map[status] ?? map.pendente
  return (
    <span style={{ color: s.color, fontWeight: 600, fontSize: 11 }}>
      {s.label}
    </span>
  )
}

export default function RelatoriosImprimirPage() {
  const [payload, setPayload] = useState<any>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('relatorio_print')
      if (raw) setPayload(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    if (payload) {
      const t = setTimeout(() => window.print(), 500)
      return () => clearTimeout(t)
    }
  }, [payload])

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <p className="text-sm">Nenhum dado para imprimir. Acesse Relatórios e clique em Baixar PDF.</p>
      </div>
    )
  }

  const { tab, range, tenantName, tenantCnpj, data, expData, ceData } = payload

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#1d1d1f', background: 'white', padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>
      {/* Print button — hidden in actual print */}
      <div className="no-print" style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f97316', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <Printer size={16} />
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* Header */}
      <div style={{ borderBottom: '2px solid #f97316', paddingBottom: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{tenantName ?? 'Relatório'}</h1>
            {tenantCnpj && <p style={{ fontSize: 11, color: '#6e6e73', marginTop: 2 }}>CNPJ: {tenantCnpj}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f97316', margin: 0 }}>
              {tab === 'chamados' ? 'Relatório de Chamados' : tab === 'saidas' ? 'Relatório de Saídas' : 'Relatório de Entradas'}
            </p>
            <p style={{ fontSize: 11, color: '#6e6e73', marginTop: 2 }}>
              Período: {range?.label ?? `${range?.start} a ${range?.end}`}
            </p>
            <p style={{ fontSize: 10, color: '#aeaeb2', marginTop: 2 }}>
              Gerado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* ── CHAMADOS ── */}
      {tab === 'chamados' && data && (() => {
        const s = data.summary
        return (
          <>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total de Chamados', value: s.totalCalls, color: '#1d1d1f' },
                { label: 'Aprovados', value: s.approvedCalls, color: '#10b981' },
                { label: 'Taxa de Aprovação', value: `${s.totalCalls > 0 ? Math.round((s.approvedCalls / s.totalCalls) * 100) : 0}%`, color: '#10b981' },
                { label: 'Cancelados', value: s.cancelledCalls, color: '#ef4444' },
              ].map(k => (
                <div key={k.label} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6e6e73', margin: 0 }}>{k.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: k.color, margin: '4px 0 0' }}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Financeiro */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Receita Bruta', value: fmt(s.grossRevenue), color: '#f97316' },
                { label: 'Receita Líquida', value: fmt(s.netRevenue), color: '#10b981' },
                { label: 'Recebido', value: fmt(s.paidRevenue), color: '#10b981' },
                { label: 'A Receber', value: fmt(s.pendingRevenue), color: '#f59e0b' },
              ].map(k => (
                <div key={k.label} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6e6e73', margin: 0 }}>{k.label}</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: k.color, margin: '4px 0 0' }}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Por origem */}
            {data.byOrigin?.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #f3f4f6' }}>Por Origem</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={th}>Origem</th>
                      <th style={{ ...th, textAlign: 'right' }}>Chamados</th>
                      <th style={{ ...th, textAlign: 'right' }}>Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byOrigin.map((o: any) => (
                      <tr key={o.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={td}>{o.name}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{o.calls}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmt(o.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Por categoria */}
            {data.byCategory?.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #f3f4f6' }}>Por Tipo de Serviço</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={th}>Tipo</th>
                      <th style={{ ...th, textAlign: 'right' }}>OS</th>
                      <th style={{ ...th, textAlign: 'right' }}>Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCategory.map((c: any) => (
                      <tr key={c.category} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={td}>{c.category}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{c.calls}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmt(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Por cidade */}
            {data.byCity?.length > 0 && (
              <div>
                <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #f3f4f6' }}>Ranking por Cidade</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={th}>#</th>
                      <th style={th}>Cidade</th>
                      <th style={{ ...th, textAlign: 'right' }}>OS</th>
                      <th style={{ ...th, textAlign: 'right' }}>Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCity.map((c: any, i: number) => (
                      <tr key={c.city} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ ...td, color: '#aeaeb2', fontWeight: 700 }}>#{i + 1}</td>
                        <td style={td}>{c.city}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{c.calls}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmt(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      })()}

      {/* ── SAÍDAS ── */}
      {tab === 'saidas' && expData && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total', value: fmt(expData.total), color: '#1d1d1f' },
              { label: 'Pago', value: fmt(expData.paid), color: '#ef4444' },
              { label: 'Pendente', value: fmt(expData.pending), color: '#f59e0b' },
            ].map(k => (
              <div key={k.label} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px' }}>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6e6e73', margin: 0 }}>{k.label}</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: k.color, margin: '4px 0 0' }}>{k.value}</p>
              </div>
            ))}
          </div>

          {expData.expenses?.length > 0 && (
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #f3f4f6' }}>Lançamentos</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={th}>Data</th>
                    <th style={th}>Descrição</th>
                    <th style={th}>Categoria</th>
                    <th style={th}>Fornecedor</th>
                    <th style={th}>Status</th>
                    <th style={{ ...th, textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {expData.expenses.map((e: any) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ ...td, whiteSpace: 'nowrap', color: '#6e6e73' }}>
                        {e.due_date ? new Date(e.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td style={{ ...td, fontWeight: 600 }}>{e.description}</td>
                      <td style={{ ...td, textTransform: 'capitalize', color: '#6e6e73' }}>{e.category || '—'}</td>
                      <td style={{ ...td, color: '#6e6e73' }}>{e.supplier?.name || '—'}</td>
                      <td style={td}><Badge status={e.status} /></td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{fmt(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── ENTRADAS ── */}
      {tab === 'entradas' && ceData && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total', value: fmt(ceData.total), color: '#1d1d1f' },
              { label: 'Recebido', value: fmt(ceData.paid), color: '#10b981' },
              { label: 'A Receber', value: fmt(ceData.pending), color: '#f59e0b' },
            ].map(k => (
              <div key={k.label} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px' }}>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6e6e73', margin: 0 }}>{k.label}</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: k.color, margin: '4px 0 0' }}>{k.value}</p>
              </div>
            ))}
          </div>

          {ceData.entries?.length > 0 && (
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #f3f4f6' }}>Lançamentos</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={th}>Data</th>
                    <th style={th}>Descrição</th>
                    <th style={th}>Cliente</th>
                    <th style={th}>Status</th>
                    <th style={{ ...th, textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {ceData.entries.map((e: any) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ ...td, whiteSpace: 'nowrap', color: '#6e6e73' }}>
                        {e.due_date ? new Date(e.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td style={{ ...td, fontWeight: 600 }}>{e.description}</td>
                      <td style={{ ...td, color: '#6e6e73' }}>{e.client?.name || '—'}</td>
                      <td style={td}><Badge status={e.status} /></td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{fmt(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div style={{ marginTop: 40, paddingTop: 12, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 10, color: '#aeaeb2', margin: 0 }}>Connect Financeiro · Documento gerado automaticamente</p>
        <p style={{ fontSize: 10, color: '#aeaeb2', margin: 0 }}>{tenantName}</p>
      </div>
    </div>
  )
}

const th: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#6e6e73',
  padding: '8px 10px',
  textAlign: 'left',
}

const td: React.CSSProperties = {
  fontSize: 12,
  color: '#1d1d1f',
  padding: '8px 10px',
}
