import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { AuthPage } from '@/pages/AuthPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { WalletsPage } from '@/pages/WalletsPage'
import { useSession } from '@/hooks/useSession'
import { safeReturn, privatePage } from '@/services/session'

const loginApi = getRouteApi('/login')
const registrationApi = getRouteApi('/register')
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
  const { session } = useSession()
  return <ProfilePage key={session?.token} />
}
export function WalletsRoute() {
  const { session } = useSession()
  return <WalletsPage key={session?.token} />
}
