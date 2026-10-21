import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getCatalog, getNft } from '@/api/catalog'
import { ApiError } from '@/api/client'
import { catalogQuerySchema, type CatalogQuery } from '@/schemas/api/catalog'

const retryRead = (attempt: number, error: Error) => {
  if (
    error instanceof ApiError &&
    (error.code === 'CONTRACT' || (error.status >= 400 && error.status < 500))
  )
    return false
  return attempt < 1
}

export function useCatalogQuery(input: CatalogQuery = {}) {
  const query = catalogQuerySchema.parse(input)
  return useQuery({
    queryKey: ['nfts', 'list', query],
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => getCatalog(query, signal),
    retry: retryRead,
  })
}

export function useNftQuery(id: string) {
  return useQuery({
    queryKey: ['nfts', 'detail', id],
    queryFn: ({ signal }) => getNft(id, signal),
    retry: retryRead,
  })
}
