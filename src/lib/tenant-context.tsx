'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface BusinessHours {
  weekday_start?: string | null
  weekday_end?: string | null
  saturday_start?: string | null
  saturday_end?: string | null
}

export interface Tenant {
  id: string
  slug: string
  name: string
  logo_url: string | null
  primary_color: string
  call_origins: string[]
  enable_commissions: boolean
  cnpj: string | null
  phone: string | null
  address: string | null
  origin_branding: Record<string, { color?: string; logo_url?: string }> | null
  call_form_config: {
    simplified?: boolean; millenium_custom_os?: boolean; vertical?: string; rodrigues_custom?: boolean
    business_hours?: BusinessHours
  } | null
}

interface TenantContextValue {
  tenant: Tenant | null
  loading: boolean
  updateTenant: (patch: Partial<Tenant>) => void
  profileRole: string | null
  isTecnico: boolean
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  loading: true,
  updateTenant: () => {},
  profileRole: null,
  isTecnico: false,
})

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileRole, setProfileRole] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single()
        .then(({ data: profile }) => {
          if (!profile?.tenant_id) { setLoading(false); return }
          setProfileRole(profile.role ?? null)
          supabase
            .from('tenants')
            .select('id, slug, name, logo_url, primary_color, call_origins, enable_commissions, cnpj, phone, address, origin_branding, call_form_config')
            .eq('id', profile.tenant_id)
            .single()
            .then(({ data }) => {
              setTenant(data)
              setLoading(false)
            })
        })
    })
  }, [])

  function updateTenant(patch: Partial<Tenant>) {
    setTenant(prev => prev ? { ...prev, ...patch } : prev)
  }

  return (
    <TenantContext.Provider value={{ tenant, loading, updateTenant, profileRole, isTecnico: profileRole === 'tecnico' }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  return useContext(TenantContext)
}
