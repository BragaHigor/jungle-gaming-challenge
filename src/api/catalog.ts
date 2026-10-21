import {
  catalogQuerySchema,
  catalogResponseSchema,
  nftSchema,
  type CatalogQuery,
} from '@/schemas/api/catalog'
import { client, parseResponse } from './client'

export async function getCatalog(
  input: CatalogQuery = {},
  signal?: AbortSignal,
) {
  const query = catalogQuerySchema.parse(input)
  const response = await client.get<unknown>('/nfts', {
    signal,
    params: {
      ...query,
      categories: query.categories.join(','),
      networks: query.networks.join(','),
    },
  })
  return parseResponse(catalogResponseSchema, response.data)
}
export async function getNft(id: string, signal?: AbortSignal) {
  const response = await client.get<unknown>(
    `/nfts/${encodeURIComponent(id)}`,
    { signal },
  )
  return parseResponse(nftSchema, response.data)
}
