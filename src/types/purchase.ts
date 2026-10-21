import type { CatalogNft } from './catalog'

export type PurchaseItem = {
  nft: CatalogNft
  id?: string
  editionId?: '1/1' | '1/10' | '1/50' | 'open'
  quantity: number
  available: number
}
export type PurchaseTotals = {
  subtotal: string
  discount: string
  fee: string
  total: string
}
export type OrderSnapshot = {
  id: string
  status: 'pending' | 'confirmed' | 'declined'
  date: string
  wallet: string
  reference: string
  items: readonly PurchaseItem[]
  totals: PurchaseTotals
}

export type WalletOption = {
  id: string
  name: 'reserve' | 'primary'
  walletType?: 'WalletConnect' | 'MetaMask' | 'Coinbase Wallet'
  address: string
  label: string
  network: 'Ethereum' | 'Polygon' | 'Solana'
}
