import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { FavoritesContext, useFavoritesController } from '@/hooks/useFavorites'
import { useSession } from '@/hooks/useSession'

function UserFavorites({ children }: { children: ReactNode }) {
  const value = useFavoritesController()
  const { t } = useTranslation('card')
  return (
    <FavoritesContext.Provider value={value}>
      {children}
      {(value.mutation.isError || value.query.isError) && (
        <div
          role="alert"
          className="fixed top-3 left-1/2 z-90 w-[min(30rem,calc(100%_-_2rem))] -translate-x-1/2 rounded-md border border-destructive bg-surface p-4 text-sm text-destructive"
        >
          <p>
            {t(value.query.isError ? 'favoritesLoadError' : 'favoriteError')}
          </p>
          <button
            type="button"
            className="mt-2 min-h-11 underline"
            onClick={() => {
              value.mutation.reset()
              if (value.query.isError) void value.query.refetch()
            }}
          >
            {t('retry')}
          </button>
        </div>
      )}
    </FavoritesContext.Provider>
  )
}
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { session } = useSession()
  return (
    <UserFavorites key={session?.token ?? 'visitor'}>{children}</UserFavorites>
  )
}
