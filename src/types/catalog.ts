import type { z } from 'zod'
import type { Nft, catalogQuerySchema } from '@/schemas/api/catalog'

export type Category = Nft['category']
export type Network = Nft['network']
export type NftCardData = Pick<
  Nft,
  'id' | 'title' | 'image' | 'price' | 'previousPrice' | 'rare'
> & { imageAlt: string }
export type CatalogNft = Omit<Nft, 'editions' | 'version' | 'publishedAt'>
export type ViewState = 'ready' | 'loading' | 'empty' | 'error' | 'unavailable'
export type CatalogTab = z.output<typeof catalogQuerySchema>['tab']
export type CatalogSort = z.output<typeof catalogQuerySchema>['sort']
