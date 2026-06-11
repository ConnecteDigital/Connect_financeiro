'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import {
  PhoneCall, BarChart3, DollarSign, ChevronRight,
  Upload, Check, Palette, Building2, X, Globe, Plus,
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

const ORIGIN_PRESETS = [
  'Indicação', 'WhatsApp', 'Site', 'Instagram',
  'Facebook', 'Google', 'Terceirizado', 'Telefone',
]

interface Props {
  tenantId: string
  initialName: string
  onComplete: () => void
}

// 0=welcome  1=brand  2=origins  3=done
export default function OnboardingWizard({ tenantId, initialName, onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [companyName, setCompanyName] = useState(initialName)
  const [primaryColor, setPrimaryColor] = useState('#f97316')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [origins, setOrigins] = useState<string[]>(['Indicação', 'Terceirizado'])
  const [customOrigin, setCustomOrigin] = useState('')
  const [saving, setSaving] = useState(false)
  const [featureIdx, setFeatureIdx] = useState(0)
  const logoRef = useRef<HTMLInputElement>(null)
  const TOTAL_STEPS = 4 // 0..3

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

  function toggleOrigin(o: string) {
    setOrigins(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o])
  }

  function addCustomOrigin() {
    const v = customOrigin.trim()
    if (!v || origins.includes(v)) return
    setOrigins(prev => [...prev, v])
    setCustomOrigin('')
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

      const { error } = await supabase.from('tenants').update({
        name: companyName,
        primary_color: primaryColor,
        call_origins: origins,
        ...(logo_url ? { logo_url } : {}),
      }).eq('id', tenantId).select('id').single()
      if (error) throw error

      localStorage.setItem(STORAGE_KEY, '1')
      setStep(3)
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
        style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', maxHeight: '92dvh' }}>

        <div className="sm:hidden w-10 h-1 bg-zinc-200 rounded-full mx-auto mt-3 mb-1" />

        {step < 3 && (
          <button onClick={skip}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition"
            style={{ background: 'rgba(0,0,0,0.06)' }}>
            <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
        )}

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 pt-5 pb-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                background: i <= step ? 'var(--primary)' : '#e5e5ea',
              }} />
          ))}
        </div>

        <div className="overflow-hidden">

          {/* ── Step 0: Welcome ── */}
          {step === 0 && (
            <div className="p-6 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold mb-3"
                  style={{ background: 'var(--primary)', boxShadow: 'var(--shadow-primary)' }}>C</div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Bem-vindo ao Connect!</h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Seu sistema de gestão financeira e operacional.</p>
              </div>

              <div className="rounded-2xl p-5 text-center min-h-[110px] flex flex-col items-center justify-center transition-all"
                style={{ background: 'var(--primary-light)' }}>
                {FEATURES.map((f, i) => (
                  <div key={i} className="transition-all duration-300 absolute"
                    style={{ opacity: i === featureIdx ? 1 : 0, transform: `translateY(${i === featureIdx ? 0 : 8}px)`, position: i === featureIdx ? 'relative' : 'absolute' }}>
                    <f.icon className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--primary)' }} />
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{f.title}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-1.5">
                {FEATURES.map((_, i) => (
                  <button key={i} onClick={() => setFeatureIdx(i)} className="rounded-full transition-all"
                    style={{ width: i === featureIdx ? 16 : 6, height: 6, background: i === featureIdx ? 'var(--primary)' : '#e5e5ea' }} />
                ))}
              </div>

              <button onClick={() => setStep(1)} className="btn-primary w-full">
                Começar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 1: Marca ── */}
          {step === 1 && (
            <div className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: '75dvh' }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Configure sua marca</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>O sistema vai usar essas informações em todos os documentos.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  <Building2 className="w-4 h-4 inline mr-1.5" />Nome da Empresa
                </label>
                <input className="input-field" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ex: Líder Desentupidora" />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Logo da empresa</label>
                <button type="button" onClick={() => logoRef.current?.click()}
                  className="w-full rounded-2xl border-2 border-dashed p-6 flex flex-col items-center gap-2 transition"
                  style={{ borderColor: logoPreview ? 'var(--primary)' : 'var(--border)', background: logoPreview ? 'var(--primary-light)' : 'var(--surface-secondary)' }}>
                  {logoPreview
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={logoPreview} alt="Logo" className="h-16 object-contain rounded-xl" />
                    : (<>
                        <Upload className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Toque para enviar a logo</p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>PNG, JPG ou SVG</p>
                      </>)
                  }
                </button>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => pickLogo(e.target.files)} />
              </div>

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
                    className="w-9 h-9 rounded-xl cursor-pointer border-0 p-0 overflow-hidden" style={{ background: 'transparent' }} />
                </div>
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
                <button type="button" onClick={() => setStep(0)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium transition"
                  style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
                  Voltar
                </button>
                <button type="button" onClick={() => setStep(2)} disabled={!companyName.trim()}
                  className="btn-primary flex-[2]">
                  Próximo <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Origens dos chamados ── */}
          {step === 2 && (
            <div className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: '75dvh' }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  <Globe className="w-5 h-5 inline mr-2" style={{ color: 'var(--primary)' }} />
                  De onde chegam seus chamados?
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Selecione os canais que seus clientes usam para te encontrar. Isso aparece no formulário de cada chamado.
                </p>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-2">
                {ORIGIN_PRESETS.map(o => {
                  const active = origins.includes(o)
                  return (
                    <button key={o} type="button" onClick={() => toggleOrigin(o)}
                      className="px-4 py-2 rounded-xl text-sm font-medium border-2 transition"
                      style={{
                        background: active ? 'var(--primary)' : 'var(--surface-secondary)',
                        borderColor: active ? 'var(--primary)' : 'transparent',
                        color: active ? '#fff' : 'var(--text-primary)',
                      }}>
                      {active && <Check className="w-3.5 h-3.5 inline mr-1.5" strokeWidth={3} />}
                      {o}
                    </button>
                  )
                })}
              </div>

              {/* Custom */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Adicionar canal personalizado</p>
                <div className="flex gap-2">
                  <input
                    className="input-field flex-1"
                    value={customOrigin}
                    onChange={e => setCustomOrigin(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomOrigin())}
                    placeholder="Ex: Site do Google, TikTok..."
                  />
                  <button type="button" onClick={addCustomOrigin} disabled={!customOrigin.trim()}
                    className="btn-primary px-3 disabled:opacity-40">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Selected list */}
              {origins.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Selecionados ({origins.length}):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {origins.map(o => (
                      <span key={o} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white"
                        style={{ background: 'var(--primary)' }}>
                        {o}
                        <button type="button" onClick={() => toggleOrigin(o)} className="opacity-70 hover:opacity-100 transition">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium transition"
                  style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
                  Voltar
                </button>
                <button type="button" onClick={finish} disabled={saving || origins.length === 0}
                  className="btn-primary flex-[2]">
                  {saving ? 'Salvando…' : 'Concluir'}
                  {!saving && <Check className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === 3 && (
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
