'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import {
  PhoneCall, BarChart3, DollarSign, ChevronRight,
  Upload, Check, Palette, Building2, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'connect_onboarding_done'

const FEATURES = [
  { icon: PhoneCall, title: 'Chamados em tempo real', desc: 'Registre e acompanhe cada atendimento do começo ao fim.' },
  { icon: DollarSign, title: 'Controle financeiro completo', desc: 'Receitas, despesas, pagamentos pendentes — tudo em um lugar.' },
  { icon: BarChart3, title: 'Relatórios e insights', desc: 'Veja sua performance e tome decisões baseadas em dados.' },
]

const PRESET_COLORS = [
  '#f97316', '#3b82f6', '#8b5cf6', '#10b981',
  '#ef4444', '#f59e0b', '#06b6d4', '#ec4899',
]

interface Props {
  tenantId: string
  initialName: string
  onComplete: () => void
}

export default function OnboardingWizard({ tenantId, initialName, onComplete }: Props) {
  const [step, setStep] = useState(0) // 0=welcome, 1=brand, 2=done
  const [slideDir, setSlideDir] = useState<'forward' | 'back'>('forward')
  const [companyName, setCompanyName] = useState(initialName)
  const [primaryColor, setPrimaryColor] = useState('#f97316')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [featureIdx, setFeatureIdx] = useState(0)
  const logoRef = useRef<HTMLInputElement>(null)

  // Auto-advance feature slides
  useEffect(() => {
    if (step !== 0) return
    const t = setInterval(() => setFeatureIdx(i => (i + 1) % FEATURES.length), 3000)
    return () => clearInterval(t)
  }, [step])

  function pickLogo(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function goTo(s: number) {
    setSlideDir(s > step ? 'forward' : 'back')
    setStep(s)
  }

  async function finish() {
    setSaving(true)
    try {
      const supabase = createClient()
      let logo_url: string | undefined

      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `${tenantId}/logo.${ext}`
        await supabase.storage.from('tenant-logos').upload(path, logoFile, { upsert: true })
        const { data } = supabase.storage.from('tenant-logos').getPublicUrl(path)
        logo_url = data.publicUrl
      }

      await supabase.from('tenants').update({
        name: companyName,
        primary_color: primaryColor,
        ...(logo_url ? { logo_url } : {}),
      }).eq('id', tenantId)

      localStorage.setItem(STORAGE_KEY, '1')
      goTo(2)
      setTimeout(() => {
        onComplete()
        window.location.reload()
      }, 2000)
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  function skip() {
    localStorage.setItem(STORAGE_KEY, '1')
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>

      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-lg)',
          maxHeight: '92dvh',
        }}>

        {/* Drag handle (mobile) */}
        <div className="sm:hidden w-10 h-1 bg-zinc-200 rounded-full mx-auto mt-3 mb-1" />

        {/* Skip */}
        {step < 2 && (
          <button onClick={skip}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition"
            style={{ background: 'rgba(0,0,0,0.06)' }}>
            <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
        )}

        {/* Step indicators */}
        <div className="flex justify-center gap-1.5 pt-5 pb-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                background: i <= step ? 'var(--primary)' : '#e5e5ea',
              }} />
          ))}
        </div>

        <div className="overflow-hidden">
          {/* ── Step 0: Welcome ───────────────────────────────── */}
          {step === 0 && (
            <div className="p-6 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold mb-3"
                  style={{ background: 'var(--primary)', boxShadow: 'var(--shadow-primary)' }}>
                  C
                </div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Bem-vindo ao Connect!
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Seu sistema de gestão financeira e operacional.
                </p>
              </div>

              {/* Feature carousel */}
              <div className="rounded-2xl p-5 text-center min-h-[110px] flex flex-col items-center justify-center transition-all"
                style={{ background: 'var(--primary-light)' }}>
                {FEATURES.map((f, i) => (
                  <div key={i}
                    className="transition-all duration-300 absolute"
                    style={{ opacity: i === featureIdx ? 1 : 0, transform: `translateY(${i === featureIdx ? 0 : 8}px)`, position: i === featureIdx ? 'relative' : 'absolute' }}>
                    <f.icon className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--primary)' }} />
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{f.title}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
                  </div>
                ))}
              </div>

              {/* Feature dots */}
              <div className="flex justify-center gap-1.5">
                {FEATURES.map((_, i) => (
                  <button key={i} onClick={() => setFeatureIdx(i)}
                    className="rounded-full transition-all"
                    style={{ width: i === featureIdx ? 16 : 6, height: 6, background: i === featureIdx ? 'var(--primary)' : '#e5e5ea' }} />
                ))}
              </div>

              <button onClick={() => goTo(1)} className="btn-primary w-full">
                Começar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 1: Brand setup ───────────────────────────── */}
          {step === 1 && (
            <div className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: '75dvh' }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Configure sua marca
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  O sistema vai usar essas informações em todos os documentos.
                </p>
              </div>

              {/* Company name */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  <Building2 className="w-4 h-4 inline mr-1.5" />Nome da Empresa
                </label>
                <input
                  className="input-field"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Ex: Líder Desentupidora"
                />
              </div>

              {/* Logo */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Logo da empresa
                </label>
                <button type="button" onClick={() => logoRef.current?.click()}
                  className="w-full rounded-2xl border-2 border-dashed p-6 flex flex-col items-center gap-2 transition"
                  style={{ borderColor: logoPreview ? 'var(--primary)' : 'var(--border)', background: logoPreview ? 'var(--primary-light)' : 'var(--surface-secondary)' }}>
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="Logo" className="h-16 object-contain rounded-xl" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Toque para enviar a logo</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>PNG, JPG ou SVG</p>
                    </>
                  )}
                </button>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => pickLogo(e.target.files)} />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  <Palette className="w-4 h-4 inline mr-1.5" />Cor principal
                </label>
                <div className="flex flex-wrap gap-2.5 mb-3">
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setPrimaryColor(c)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition"
                      style={{ background: c, boxShadow: c === primaryColor ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none' }}>
                      {c === primaryColor && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                    </button>
                  ))}
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                    className="w-9 h-9 rounded-xl cursor-pointer border-0 p-0 overflow-hidden"
                    style={{ background: 'transparent' }} />
                </div>
                {/* Live preview */}
                <div className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: primaryColor, boxShadow: `0 4px 14px ${primaryColor}60` }}>
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                    {companyName?.[0]?.toUpperCase() ?? 'C'}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{companyName || 'Sua empresa'}</p>
                    <p className="text-white/70 text-xs">Connect Financeiro</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => goTo(0)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium transition"
                  style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
                  Voltar
                </button>
                <button type="button" onClick={finish} disabled={saving || !companyName.trim()}
                  className="btn-primary flex-[2]">
                  {saving ? 'Salvando…' : 'Salvar e entrar'}
                  {!saving && <Check className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Done ──────────────────────────────────── */}
          {step === 2 && (
            <div className="p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'var(--primary-light)' }}>
                <Check className="w-10 h-10" style={{ color: 'var(--primary)' }} strokeWidth={3} />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Tudo pronto!</h2>
                <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                  {companyName} está configurada. Bem-vindo ao sistema!
                </p>
              </div>
              <div className="w-full rounded-2xl h-1.5 overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full animate-pulse" style={{ width: '100%', background: 'var(--primary)' }} />
              </div>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Carregando seu dashboard…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function useOnboarding() {
  if (typeof window === 'undefined') return false
  return !localStorage.getItem(STORAGE_KEY)
}
