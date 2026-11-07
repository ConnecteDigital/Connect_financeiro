'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { DocHeader } from '@/lib/rodrigues-doc'

// Documento da Rodrigues (Orçamento / Ordem de serviço) no modelo que eles
// usam: folha A4 (794px), Arial, faixas cinza por seção. Só estilos inline,
// porque a folha é capturada pelo html2canvas pra virar PDF/imagem.

export const DOC_WIDTH = 794

const GRAY_TITLE = '#bdbdbd'
const GRAY_SECTION = '#f2f2f2'
const GRAY_TOTAL = '#e3e3e3'
const PAD_X = 76

export interface DocItem { description: string; unit?: string; unit_price: number; quantity: number }

export interface RodriguesDocProps {
  header: DocHeader
  title: string           // "Orçamento ORC-00009" / "Ordem de serviço OS-00018"
  date: string            // dd/mm/aaaa
  client: { name: string; addressLines: string[]; phone?: string | null }
  info: [string, string | null | undefined][]
  visit?: { date?: string; period?: string } | null
  items: DocItem[]
  showPrices?: boolean
  discount?: number
  payment?: { methods?: string; pix?: string; conditions?: string | null } | null
  guarantee?: string | null
  extraInfo?: string | null
  photos?: string[]        // fotos do aparelho/etiqueta anexadas ao chamado
  signatures: string[]
}

const BRL = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function PhoneIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#111" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="#111" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.3" fill="none" stroke="#111" strokeWidth="2" />
      <circle cx="17.4" cy="6.6" r="1.3" fill="#111" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#111" d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V2zm12 8H5v10h14V10zM7 12h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z" />
    </svg>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ background: GRAY_SECTION, padding: '5px 6px', fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>{title}</div>
      <div style={{ padding: '9px 6px 0' }}>{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontSize: 12, lineHeight: 1.25, whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  )
}

const half: CSSProperties = { width: '50%', boxSizing: 'border-box', paddingRight: 10 }

export default function RodriguesDocument(p: RodriguesDocProps) {
  const h = p.header
  const showPrices = p.showPrices !== false
  const services = p.items.reduce((s, it) => s + it.quantity * it.unit_price, 0)
  const discount = Number(p.discount || 0)
  const total = services - discount
  const info = p.info.filter(([, v]) => v != null && String(v).trim() !== '') as [string, string][]
  const small: CSSProperties = { fontSize: 10.5, lineHeight: 1.3, margin: '0 0 3.5px' }

  return (
    <div style={{ width: DOC_WIDTH, boxSizing: 'border-box', padding: `26px ${PAD_X}px 40px`, background: '#fff', color: '#111', fontFamily: 'Arial, Helvetica, "Liberation Sans", sans-serif' }}>
      {/* ── Empresa ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '0 6px' }}>
        <div style={{ width: '38%' }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, margin: '2px 0 5px' }}>{h.name}</div>
          <p style={small}>{h.legal_name}</p>
          <p style={small}>CNPJ: {h.cnpj}</p>
          {h.address_lines.map(l => <p key={l} style={small}>{l}</p>)}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, marginTop: 26 }}>
          <PhoneIcon /> {h.phone}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: GRAY_SECTION, borderRadius: 6, padding: '5px 7px', fontSize: 10.5, fontWeight: 700, marginTop: 4 }}>
          <CalendarIcon /> {p.date}
        </div>
      </div>
      {h.instagram && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: GRAY_SECTION, padding: '5px 6px', fontSize: 10.5, marginTop: 6 }}>
          <InstagramIcon /> {h.instagram}
        </div>
      )}

      {/* ── Título ── */}
      <div style={{ background: GRAY_TITLE, padding: '5px 6px', fontSize: 18, fontWeight: 700, marginTop: 10 }}>{p.title}</div>

      {/* ── Cliente ── */}
      <div style={{ display: 'flex', padding: '10px 6px 0' }}>
        <div style={half}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Cliente: {p.client.name}</div>
          {p.client.addressLines.filter(Boolean).map(l => <p key={l} style={small}>{l}</p>)}
        </div>
        {p.client.phone && (
          <div style={{ ...half, display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5 }}>
            <PhoneIcon /> {p.client.phone}
          </div>
        )}
      </div>

      {/* ── Informações básicas ── */}
      {(info.length > 0 || p.visit) && (
        <Section title="Informações básicas">
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {info.map(([l, v]) => <div key={l} style={half}><Field label={l} value={v} /></div>)}
          </div>
          {p.visit && (p.visit.date || p.visit.period) && (
            <div style={{ borderTop: '1px solid #ececec', paddingTop: 10, marginTop: 2 }}>
              <Field label="Visita técnica" value={
                <>
                  {p.visit.date && <div>Data: {p.visit.date}</div>}
                  {p.visit.period && <div>Horário: {p.visit.period}</div>}
                </>
              } />
            </div>
          )}
        </Section>
      )}

      {/* ── Serviços ── */}
      <Section title="Serviços">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: '#666', fontSize: 10.5 }}>
              <th style={{ textAlign: 'left', fontWeight: 700, padding: '0 0 8px', width: '50%' }}>Descrição</th>
              <th style={{ textAlign: 'left', fontWeight: 700, padding: '0 0 8px' }}>Unidade</th>
              {showPrices && <th style={{ textAlign: 'right', fontWeight: 700, padding: '0 0 8px' }}>Preço unitário</th>}
              <th style={{ textAlign: 'right', fontWeight: 700, padding: '0 0 8px', width: 60 }}>Qtd.</th>
              {showPrices && <th style={{ textAlign: 'right', fontWeight: 700, padding: '0 0 8px', width: 100 }}>Preço</th>}
            </tr>
          </thead>
          <tbody>
            {p.items.map((it, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 700, padding: '0 9px 9px 0', verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>{it.description}</td>
                <td style={{ padding: '0 0 8px', verticalAlign: 'top' }}>{it.unit ?? 'un.'}</td>
                {showPrices && <td style={{ textAlign: 'right', padding: '0 0 8px', verticalAlign: 'top' }}>{BRL(it.unit_price)}</td>}
                <td style={{ textAlign: 'right', padding: '0 0 8px', verticalAlign: 'top' }}>{it.quantity.toLocaleString('pt-BR')}</td>
                {showPrices && <td style={{ textAlign: 'right', padding: '0 0 8px', verticalAlign: 'top' }}>{BRL(it.quantity * it.unit_price)}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {showPrices && (
          <div style={{ marginLeft: '50%', marginRight: -6, marginTop: 2, fontSize: 12 }}>
            {[
              { l: 'Serviços', v: BRL(services) },
              { l: 'Subtotal', v: BRL(services), bold: true },
              ...(discount > 0 ? [{ l: 'Desconto sobre serviços', v: `- ${BRL(discount)}` }] : []),
              { l: 'Total', v: BRL(total), bold: true, total: true },
            ].map(r => (
              <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: r.total ? GRAY_TOTAL : GRAY_SECTION, fontWeight: r.bold ? 700 : 400 }}>
                <span>{r.l}</span><span>{r.v}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Pagamento ── */}
      {p.payment && (p.payment.methods || p.payment.pix || p.payment.conditions) && (
        <Section title="Pagamento">
          {(p.payment.methods || p.payment.pix) && (
            <div style={{ display: 'flex' }}>
              {p.payment.methods && <div style={half}><Field label="Meios de pagamento" value={p.payment.methods} /></div>}
              {p.payment.pix && <div style={half}><Field label="PIX" value={p.payment.pix} /></div>}
            </div>
          )}
          {p.payment.conditions && <Field label="Condições de pagamento" value={p.payment.conditions} />}
        </Section>
      )}

      {/* ── Garantia ── */}
      {p.guarantee && (
        <Section title="Garantia">
          <Field label="Período de garantia" value={p.guarantee} />
        </Section>
      )}

      {/* ── Informações adicionais ── */}
      {p.extraInfo && (
        <Section title="Informações adicionais">
          <div style={{ fontSize: 12, lineHeight: 1.4, whiteSpace: 'pre-wrap', marginBottom: 10 }}>{p.extraInfo}</div>
        </Section>
      )}

      {/* ── Fotos ── */}
      {p.photos && p.photos.length > 0 && (
        <Section title="Fotos">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {p.photos.slice(0, 6).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" style={{ width: 'calc(33.33% - 6px)', height: 170, objectFit: 'contain', background: '#f7f7f7', border: '1px solid #e5e5e5', borderRadius: 4 }} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Local, data e assinaturas ── */}
      <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, marginTop: 14 }}>{h.city}, {p.date}</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 110, marginTop: 50 }}>
        {p.signatures.map(s => (
          <div key={s} style={{ width: p.signatures.length > 1 ? 240 : 320, borderTop: '1px solid #111', paddingTop: 2, textAlign: 'center', fontSize: 12, fontWeight: 700 }}>
            {s}
          </div>
        ))}
      </div>
    </div>
  )
}
