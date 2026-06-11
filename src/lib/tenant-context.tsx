'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Tenant {
  id: string
  slug: string
  name: string
  logo_url: string | null
  primary_color: string
  call_origins: string[]
  enable_commissions: boolean
}

interface TenantContextValue {
  tenant: Tenant | null
  loading: boolean
  updateTenant: (patch: Partial<Tenant>) => void
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  loading: true,
  updateTenant: () => {},
})

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('tenants')
      .select('id, slug, name, logo_url, primary_color, call_origins, enable_commissions')
      .single()
      .then(({ data }) => {
        setTenant(data)
        setLoading(false)
      })
  }, [])

  function updateTenant(patch: Partial<Tenant>) {
    setTenant(prev => prev ? { ...prev, ...patch } : prev)
  }

  return (
    <TenantContext.Provider value={{ tenant, loading, updateTenant }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  return useContext(TenantContext)
}
