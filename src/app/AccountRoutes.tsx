import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { AuthPage } from '@/pages/AuthPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { WalletsPage } from '@/pages/WalletsPage'
import type { SavedWallet } from '@/types/account'

const loginApi = getRouteApi('/login')
const registrationApi = getRouteApi('/register')
const profileApi = getRouteApi('/profile')
const walletsApi = getRouteApi('/wallets')
const presentationWallets: readonly SavedWallet[] = [
  {
    id: 'reserve',
    label: 'Reserva',
    draft: {
      displayName: 'Colecionador',
      walletNickname: 'Reserva',
      network: 'Polygon',
      profileName: 'Kurio',
      address: '0x1111111111111111111111111111111111111111',
      secondary: '',
      walletType: 'MetaMask',
      referral: 'KURIO',
      email: 'colecionador@example.com',
      ens: 'nova.eth',
    },
  },
]

export function LoginRoute() {
  const { view } = loginApi.useSearch()
  const navigate = useNavigate()
  return (
    <AuthPage
      mode="login"
      state={view}
      onClose={() => void navigate({ to: '/' })}
    />
  )
}
export function RegistrationRoute() {
  const { view } = registrationApi.useSearch()
  const navigate = useNavigate()
  return (
    <AuthPage
      mode="register"
      state={view}
      onClose={() => void navigate({ to: '/' })}
    />
  )
}
export function ProfileRoute() {
  const { view } = profileApi.useSearch()
  const navigate = useNavigate()
  return (
    <ProfilePage
      key={view}
      state={view}
      onRetry={() => void navigate({ to: '/profile', search: {} })}
    />
  )
}
export function WalletsRoute() {
  const { view } = walletsApi.useSearch()
  const navigate = useNavigate()
  const wallets = view === 'ready' ? presentationWallets : []
  return (
    <WalletsPage
      key={view}
      state={view}
      wallets={wallets}
      onRetry={() => void navigate({ to: '/wallets', search: {} })}
    />
  )
}
