import type { NftCardData } from '@/components/NftCard'

export const categories = [
  'digitalArt',
  'photography',
  'music',
  'art3d',
  'collectibles',
  'generative',
  'games',
  'subscriptions',
  'utility',
] as const
export const networks = ['Ethereum', 'Polygon', 'Solana'] as const
export type Category = (typeof categories)[number]
export type Network = (typeof networks)[number]
export type CatalogNft = Omit<NftCardData, 'imageAlt'> & {
  imageAltKey: 'emeraldAlt' | 'sageAlt' | 'neonAlt' | 'goldenAlt'
  category: Category
  network: Network
  isNew: boolean
  hot: boolean
  token: string
}
export type ViewState = 'ready' | 'loading' | 'empty' | 'error' | 'unavailable'
export type CatalogTab = 'all' | 'new' | 'hot'
export type CatalogSort = 'recent' | 'lowest' | 'highest' | 'name'
