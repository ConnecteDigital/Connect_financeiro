'use client'

import { useEffect, useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { useTenant } from '@/lib/tenant-context'
import { isLojaMode } from '@/lib/loja'

// Campo de valor em dinheiro que funciona "que nem calculadora" (Rodrigues
// e Loja): a pessoa digita só os números e o ponto de milhar entra
// sozinho — 1100 vira 1.100. Centavos, se tiver, depois da vírgula:
// 1100,5 vira 1.100,50. Ponto digitado é ignorado (1.100 = mil e cem),
// então não tem mais valor "bugado" por causa de ponto ou vírgula.
//
// É um substituto direto do <input type="number">: recebe o mesmo value
// (número ou texto) e chama o mesmo onChange, com e.target.value no
// formato de sempre ("1100.5"). Para os outros clientes o campo continua
// exatamente o <input type="number"> que era.

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'type'> & {
  value: number | string | null | undefined
}

const toNumber = (text: string): number | null => {
  if (!text) return null
  const n = Number(text.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const numOf = (v: Props['value']): number | null => {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Valor pronto (2 casas): 1100.5 → "1.100,50"
const pretty = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Enquanto digita: só dígitos e uma vírgula; milhar automático; até 2 centavos
function typing(raw: string): string {
  const s = raw.replace(/[^\d,]/g, '')
  const i = s.indexOf(',')
  let int = (i === -1 ? s : s.slice(0, i)).replace(/^0+(?=\d)/, '')
  const dec = i === -1 ? null : s.slice(i + 1).replace(/,/g, '').slice(0, 2)
  if (dec !== null && int === '') int = '0'
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return dec === null ? grouped : `${grouped},${dec}`
}

// Quantos dígitos/vírgulas existem antes do cursor (pra devolver o cursor ao lugar)
const significantBefore = (s: string, pos: number) => s.slice(0, pos).replace(/[^\d,]/g, '').length
function caretFor(s: string, count: number) {
  if (count <= 0) return 0
  let seen = 0
  for (let i = 0; i < s.length; i++) {
    if (/[\d,]/.test(s[i])) seen++
    if (seen === count) return i + 1
  }
  return s.length
}

export default function MoneyInput({ value, onChange, onFocus, onBlur, ...rest }: Props) {
  const { tenant } = useTenant()
  const masked = tenant?.call_form_config?.rodrigues_custom === true || isLojaMode(tenant)

  const ext = numOf(value)
  const [text, setText] = useState(() => (ext ? pretty(ext) : ''))
  const ref = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)
  const focused = useRef(false)

  // Valor mudou por fora (carregou do banco, limpou o formulário...): acompanha
  useEffect(() => {
    if ((toNumber(text) ?? 0) === (ext ?? 0)) return
    setText(ext ? (focused.current ? typing(String(ext).replace('.', ',')) : pretty(ext)) : '')
  }, [ext]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (caret.current == null || !ref.current) return
    ref.current.setSelectionRange(caret.current, caret.current)
    caret.current = null
  })

  if (!masked) {
    return <input type="number" value={value ?? ''} onChange={onChange} onFocus={onFocus} onBlur={onBlur} {...rest} />
  }

  // min / max / step só fazem sentido no campo numérico antigo
  const { min: _min, max: _max, step: _step, inputMode: _mode, ...clean } = rest
  void _min; void _max; void _step; void _mode

  const emit = (e: React.SyntheticEvent<HTMLInputElement>, next: string) => {
    const n = toNumber(next)
    const out = n == null ? '' : String(n)
    onChange?.({ ...e, target: { value: out }, currentTarget: { value: out } } as unknown as React.ChangeEvent<HTMLInputElement>)
  }

  return (
    <input
      {...clean}
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder={clean.placeholder ?? '0,00'}
      value={text}
      onChange={e => {
        const raw = e.target.value
        const next = typing(raw)
        caret.current = caretFor(next, significantBefore(raw, e.target.selectionStart ?? raw.length))
        setText(next)
        emit(e, next)
      }}
      onFocus={e => {
        focused.current = true
        // "1.100,00" → "1.100": continua digitando sem brigar com os centavos
        if (text.endsWith(',00')) setText(text.slice(0, -3))
        onFocus?.(e)
      }}
      onBlur={e => {
        focused.current = false
        const n = toNumber(text)
        setText(n ? pretty(n) : '')
        onBlur?.(e)
      }}
    />
  )
}
