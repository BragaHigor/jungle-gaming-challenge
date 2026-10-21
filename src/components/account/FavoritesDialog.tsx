import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getNft } from '@/api/catalog'
import { useFavorites } from '@/hooks/useFavorites'
import { useSession } from '@/hooks/useSession'
import { safeReturn } from '@/services/session'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FavoriteButton } from './FavoriteButton'

function FavoriteItem({
  id,
  onNavigate,
}: {
  id: string
  onNavigate: () => void
}) {
  const { t } = useTranslation('card')
  const query = useQuery({
    queryKey: ['nfts', 'detail', id],
    queryFn: ({ signal }) => getNft(id, signal),
    retry: false,
  })
  if (!query.data)
    return (
      <li className="space-y-2 border-b border-border py-3">
        <p role={query.isError ? 'alert' : 'status'}>
          {t(query.isError ? 'favoritesLoadError' : 'favoritesLoading')}
        </p>
        {query.isError && (
          <Button variant="outline" onClick={() => void query.refetch()}>
            {t('retry')}
          </Button>
        )}
      </li>
    )
  const nft = query.data
  return (
    <li className="flex items-center gap-3 border-b border-border py-3">
      <img
        src={nft.image}
        alt={t(nft.imageAltKey)}
        width={64}
        height={64}
        className="size-16 rounded-md object-cover"
      />
      <Link
        to="/nfts/$nftId"
        params={{ nftId: id }}
        onClick={onNavigate}
        className="min-w-0 flex-1 text-sm hover:text-primary"
      >
        {nft.title}
        <span className="block text-primary">{nft.price} ETH</span>
      </Link>
      <FavoriteButton
        nftId={id}
        title={nft.title}
        className="grid size-11 shrink-0 place-items-center text-primary disabled:opacity-55"
      />
    </li>
  )
}

export function FavoritesDialog({
  children,
  className,
  label,
}: {
  children: ReactNode
  className?: string
  label: string
}) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation(['card', 'navigation'])
  const { session } = useSession()
  const { query, mutation } = useFavorites()
  const navigate = useNavigate()
  const { href } = useLocation()
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next && !session) {
          void navigate({
            to: '/login',
            search: { redirect: safeReturn(href) },
          })
          return
        }
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>
        <button type="button" className={className} aria-label={label}>
          {children}
        </button>
      </DialogTrigger>
      <DialogContent
        title={t('navigation:favorites')}
        description={session?.user.username ?? ''}
      >
        {query.isPending && <p role="status">{t('card:favoritesLoading')}</p>}
        {query.isError && (
          <>
            <p role="alert">{t('card:favoritesLoadError')}</p>
            <Button onClick={() => void query.refetch()}>
              {t('card:retry')}
            </Button>
          </>
        )}
        {query.isSuccess && query.data.nftIds.length === 0 && (
          <p role="status">{t('card:favoritesEmpty')}</p>
        )}
        {mutation.isError && (
          <div role="alert" className="space-y-2 text-sm text-destructive">
            <p>{t('card:favoriteError')}</p>
            <Button variant="outline" onClick={() => mutation.reset()}>
              {t('card:retry')}
            </Button>
          </div>
        )}
        <ul>
          {query.data?.nftIds.map((id) => (
            <FavoriteItem key={id} id={id} onNavigate={() => setOpen(false)} />
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
