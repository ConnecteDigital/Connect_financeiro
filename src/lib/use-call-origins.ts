'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface CallOriginOption {
  value: string
  label: string
}

const ORIGIN_LABELS: Record<string, string> = {
  site_lider: 'Site Líder',
  site_poa: 'Site POA',
  site_millenium: 'Site Millenium',
  site_praja: 'Site Pra Já',
  indicacao: 'Indicação',
  terceirizado: 'Terceirizado',
}

export function getOriginLabel(origin: string): string {
  return ORIGIN_LABELS[origin] ?? origin
}

export function useCallOrigins() {
  const [origins, setOrigins] = useState<CallOriginOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('tenants')
      .select('call_origins')
      .single()
      .then(({ data }) => {
        if (data?.call_origins) {
          setOrigins(
            data.call_origins.map((v: string) => ({
              value: v,
              label: ORIGIN_LABELS[v] ?? v,
            }))
          )
        }
        setLoading(false)
      })
  }, [])

  return { origins, loading }
}
