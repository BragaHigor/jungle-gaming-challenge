import type { CollectorDraft } from '@/schemas/collector'
import type { WalletOption } from '@/types/purchase'

export function collectorDraft(
  wallet?: WalletOption,
  profile: Partial<CollectorDraft> = {},
): CollectorDraft {
  const saved = wallet?.collector
  return {
    displayName: profile.displayName || saved?.displayName || '',
    username: profile.username || '',
    email: profile.email || saved?.email || '',
    ens: profile.ens || saved?.ens || '',
    network: wallet?.network ?? 'Ethereum',
    address: wallet?.address ?? '',
    walletType: wallet?.walletType ?? 'Coinbase Wallet',
    profileName: saved?.profileName ?? '',
    secondary: saved?.secondary ?? '',
    referral: saved?.referral ?? '',
    note: '',
  }
}
