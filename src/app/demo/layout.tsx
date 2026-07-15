import type { Metadata } from 'next'
import DemoLayoutClient from './DemoLayoutClient'

export const metadata: Metadata = {
  manifest: '/demo-manifest.json',
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoLayoutClient>{children}</DemoLayoutClient>
}
