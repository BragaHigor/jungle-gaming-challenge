import { createContext, useContext } from 'react'

export type AuthMode = 'login' | 'register'
export const AuthDialogContext = createContext<{
  openAuth: (mode?: AuthMode, returnTo?: string) => void
} | null>(null)

export function useAuthDialog() {
  const value = useContext(AuthDialogContext)
  if (!value) throw new Error('AuthDialogProvider is required')
  return value
}
