import type { ReactNode } from 'react'
import { DemoContext, useDemoController } from '@/hooks/useDemo'
import { mocksEnabled } from '@/constants/environment'

function MockProvider({ children }: { children: ReactNode }) {
  const demo = useDemoController()
  return <DemoContext.Provider value={demo}>{children}</DemoContext.Provider>
}

export function DemoProvider({ children }: { children: ReactNode }) {
  if (!mocksEnabled) return children
  return <MockProvider>{children}</MockProvider>
}
