import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { logout } from '@/api/account'
import { SessionContext } from '@/hooks/useSession'
import {
  readToken,
  replaceSession,
  safeReturn,
  sessionOptions,
} from '@/services/session'

export function SessionProvider({ children }: { children: ReactNode }) {
  const query = useQuery(sessionOptions())
  const { t } = useTranslation('account')
  const navigate = useNavigate()
  const { href } = useLocation()
  const previous = useRef<string | null>(readToken())
  const session = query.data ?? null
  const token = session?.token
  useEffect(() => {
    const expire = async (expected: string) => {
      const active = readToken()
      if (active && active !== expected) return
      if (!active && previous.current !== expected) return
      previous.current = null
      if (!(await replaceSession(null))) return
      await navigate({
        to: '/login',
        search: { redirect: safeReturn(href), reason: 'expired' },
        replace: true,
      })
    }
    const onUnauthorized = (event: Event) => {
      const expected = (event as CustomEvent<string>).detail
      if (readToken() === expected) void expire(expected)
    }
    window.addEventListener('kurio:unauthorized', onUnauthorized)
    let timer: ReturnType<typeof setTimeout> | undefined
    if (session) {
      previous.current = session.token
      timer = setTimeout(
        () => void expire(session.token),
        Math.max(0, Date.parse(session.expiresAt) - Date.now()),
      )
    } else if (query.isSuccess && previous.current) {
      void expire(previous.current)
    }
    return () => {
      window.removeEventListener('kurio:unauthorized', onUnauthorized)
      clearTimeout(timer)
    }
  }, [session, query.isSuccess, navigate, href, token])
  const endSession = async () => {
    const old = readToken()
    previous.current = null
    if (!(await replaceSession(null))) return
    await navigate({ to: '/', replace: true })
    if (old) {
      try {
        await logout(old)
      } catch {
        return
      }
    }
  }
  if (query.isPending)
    return (
      <p role="status" className="p-8 text-center text-primary">
        {t('processing')}
      </p>
    )
  return (
    <SessionContext.Provider
      value={{ session, recovering: query.isPending, endSession }}
    >
      {query.isError && (
        <div
          role="alert"
          className="mx-auto max-w-lg space-y-3 border border-border bg-surface p-4"
        >
          <p>{t('sessionError')}</p>
          <button
            type="button"
            className="min-h-11 underline"
            onClick={() => void query.refetch()}
          >
            {t('retry')}
          </button>
          <button
            type="button"
            className="ml-4 min-h-11 underline"
            onClick={() => void endSession()}
          >
            {t('logout')}
          </button>
        </div>
      )}
      {children}
    </SessionContext.Provider>
  )
}
