import type { ComponentProps } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useAuthDialog } from '@/hooks/useAuthDialog'
import { useSession } from '@/hooks/useSession'

export function AccountLink({
  to,
  onClick,
  ...props
}: Omit<ComponentProps<'a'>, 'href'> & {
  to: '/login' | '/register' | '/profile' | '/wallets' | '/checkout'
}) {
  const { session } = useSession()
  const { openAuth } = useAuthDialog()
  const { href } = useLocation()
  const authRoute = to === '/login' || to === '/register'
  const destination = authRoute ? href : to
  return (
    <Link
      {...props}
      to={to}
      search={authRoute ? { redirect: destination } : undefined}
      onClick={(event) => {
        onClick?.(event)
        const modified =
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        if (event.defaultPrevented || modified || props.target === '_blank')
          return
        if (authRoute || !session) {
          event.preventDefault()
          openAuth(to === '/register' ? 'register' : 'login', destination)
        }
      }}
    />
  )
}
