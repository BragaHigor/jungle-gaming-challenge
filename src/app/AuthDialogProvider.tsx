import { lazy, Suspense, useState, type ReactNode } from 'react'
import { useLocation } from '@tanstack/react-router'
import { AuthDialogContext, type AuthMode } from '@/hooks/useAuthDialog'
import { safeReturn } from '@/services/session'

const AuthPage = lazy(() =>
  import('@/pages/AuthPage').then((module) => ({ default: module.AuthPage })),
)

type AuthDialogState = {
  mode: AuthMode
  origin: string
  returnTo: string
  trigger: HTMLElement | null
}

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const { href } = useLocation()
  const [dialog, setDialog] = useState<AuthDialogState | null>(null)
  if (dialog && dialog.origin !== href) setDialog(null)
  const openAuth = (mode: AuthMode = 'login', returnTo = href) => {
    setDialog({
      mode,
      origin: href,
      returnTo: safeReturn(returnTo),
      trigger: document.activeElement as HTMLElement | null,
    })
  }
  return (
    <AuthDialogContext.Provider value={{ openAuth }}>
      {children}
      {dialog && dialog.origin === href && (
        <Suspense>
          <AuthPage
            key={dialog.mode}
            mode={dialog.mode}
            returnTo={dialog.returnTo}
            showBackground={false}
            onClose={() => setDialog(null)}
            onSwitchMode={(mode) => setDialog({ ...dialog, mode })}
            onRestoreFocus={() => {
              if (document.querySelector('[role="dialog"][data-state="open"]'))
                return
              if (dialog.trigger?.isConnected)
                dialog.trigger.focus({ preventScroll: true })
              else
                document
                  .getElementById('content')
                  ?.focus({ preventScroll: true })
            }}
          />
        </Suspense>
      )}
    </AuthDialogContext.Provider>
  )
}
