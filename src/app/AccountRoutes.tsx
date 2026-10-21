import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { AuthPage } from '@/pages/AuthPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { WalletsPage } from '@/pages/WalletsPage'
import { useQuery } from '@tanstack/react-query'
import { getWallets } from '@/api/account'
import { useSession } from '@/hooks/useSession'
import { safeReturn, privatePage } from '@/services/session'

const loginApi = getRouteApi('/login')
const registrationApi = getRouteApi('/register')
const profileApi = getRouteApi('/profile')
const walletsApi = getRouteApi('/wallets')
export function LoginRoute() {
  const { redirect, reason } = loginApi.useSearch()
  const navigate = useNavigate()
  return (
    <AuthPage
      mode="login"
      state={reason === 'expired' ? 'expired' : 'ready'}
      returnTo={redirect}
      onClose={() => {
        const destination = safeReturn(redirect)
        void navigate({
          href: privatePage(
            new URL(destination, window.location.origin).pathname,
          )
            ? '/'
            : destination,
        })
      }}
    />
  )
}
export function RegistrationRoute() {
  const { redirect, reason } = registrationApi.useSearch()
  const navigate = useNavigate()
  return (
    <AuthPage
      mode="register"
      state={reason === 'expired' ? 'expired' : 'ready'}
      returnTo={redirect}
      onClose={() => {
        const destination = safeReturn(redirect)
        void navigate({
          href: privatePage(
            new URL(destination, window.location.origin).pathname,
          )
            ? '/'
            : destination,
        })
      }}
    />
  )
}
export function ProfileRoute() {
  const { view } = profileApi.useSearch()
  const { session } = useSession()
  const navigate = useNavigate()
  return (
    <ProfilePage
      user={session?.user}
      key={view}
      state={view}
      onRetry={() => void navigate({ to: '/profile', search: {} })}
    />
  )
}
export function WalletsRoute() {
  const { view } = walletsApi.useSearch()
  const navigate = useNavigate()
  const { session } = useSession()
  const query = useQuery({
    queryKey: ['private', session?.user.id, session?.token, 'wallets'],
    queryFn: ({ signal }) => getWallets(session!.token, signal),
    enabled: Boolean(session),
    retry: false,
  })
  const wallets = query.data ?? []
  let requestState: 'ready' | 'loading' | 'error' = 'ready'
  if (query.isPending) requestState = 'loading'
  if (query.isError) requestState = 'error'
  const state = view ?? requestState
  return (
    <WalletsPage
      key={view}
      state={state}
      wallets={wallets}
      onRetry={() => {
        void query.refetch()
        void navigate({ to: '/wallets', search: {} })
      }}
    />
  )
}
