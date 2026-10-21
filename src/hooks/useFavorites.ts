import { createContext, useContext } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getFavorites, setFavorite, type Favorites } from '@/api/account'
import { useSession } from './useSession'
import { readToken } from '@/services/session'

export function useFavoritesController() {
  const { session } = useSession()
  const token = session?.token
  const cache = useQueryClient()
  const key = ['private', session?.user.id, token, 'favorites']
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => getFavorites(token!, signal),
    enabled: Boolean(token),
    retry: false,
  })
  const mutation = useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean }) =>
      setFavorite(token!, nftId, favorite),
    onMutate: async ({ nftId, favorite }) => {
      await cache.cancelQueries({ queryKey: key })
      const snapshot = cache.getQueryData<Favorites>(key)
      if (snapshot && readToken() === token) {
        const ids = new Set(snapshot.nftIds)
        if (favorite) ids.add(nftId)
        else ids.delete(nftId)
        cache.setQueryData(key, { ...snapshot, nftIds: Array.from(ids) })
      }
      return { snapshot, token, key }
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot && readToken() === context.token)
        cache.setQueryData(context.key, context.snapshot)
    },
    onSuccess: (data, _variables, context) => {
      if (readToken() === context.token) cache.setQueryData(context.key, data)
    },
    onSettled: (_data, _error, _variables, context) => {
      if (readToken() === context?.token)
        void cache.invalidateQueries({ queryKey: context?.key })
    },
  })
  return { query, mutation, token }
}
export const FavoritesContext = createContext<ReturnType<
  typeof useFavoritesController
> | null>(null)
export function useFavorites() {
  const value = useContext(FavoritesContext)
  if (!value) throw new Error('FavoritesProvider is required')
  return value
}
