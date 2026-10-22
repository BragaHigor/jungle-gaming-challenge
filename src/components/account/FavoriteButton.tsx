import { useAuthDialog } from '@/hooks/useAuthDialog'
import { useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import { useFavorites } from '@/hooks/useFavorites'
import { useSession } from '@/hooks/useSession'
import { Icon } from '@/components/ui/Icon'

const feedbackAnimations = {
  add: 'motion-safe:animate-favorite-add',
  remove: 'motion-safe:animate-favorite-remove',
} as const

export function FavoriteButton({
  nftId,
  title,
  className,
  children,
}: {
  nftId: string
  title: string
  className?: string
  children?: ReactNode
}) {
  const { t } = useTranslation('card')
  const [feedback, setFeedback] = useState<
    keyof typeof feedbackAnimations | null
  >(null)
  const { session, recovering } = useSession()
  const { query, mutation } = useFavorites()
  const { openAuth } = useAuthDialog()
  const favorite = query.data?.nftIds.includes(nftId) ?? false
  return (
    <>
      <button
        type="button"
        className={className}
        aria-pressed={favorite}
        aria-label={t(favorite ? 'unfavorite' : 'favorite', { title })}
        disabled={
          recovering || mutation.isPending || Boolean(session && !query.data)
        }
        onClick={() => {
          if (!session) {
            openAuth()
            return
          }
          setFeedback(favorite ? 'remove' : 'add')
          mutation.mutate({ nftId, favorite: !favorite })
        }}
      >
        <Icon
          name="heart"
          className={cn(
            'origin-center',
            favorite && 'fill-current',
            feedback && feedbackAnimations[feedback],
          )}
          onAnimationEnd={() => setFeedback(null)}
        />
        {children}
      </button>
    </>
  )
}
