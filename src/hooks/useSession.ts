import { createContext, useContext } from 'react'
import type { Session } from '@/schemas/api/account'

export const SessionContext = createContext<{
  session: Session | null
  recovering: boolean
  endSession: () => Promise<void>
} | null>(null)

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error('SessionProvider is required')
  return context
}
