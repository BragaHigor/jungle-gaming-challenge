import { useTranslation } from 'react-i18next'
import { NftCard, type NftCardData } from '@/components/NftCard'

type CardPresentation = Omit<NftCardData, 'imageAlt'> & {
  imageAltKey: 'emeraldAlt' | 'sageAlt' | 'neonAlt' | 'goldenAlt'
}

export function HomePage({ cards }: { cards: readonly CardPresentation[] }) {
  const { t } = useTranslation(['common', 'card', 'navigation'])

  return (
    <section id="marketplace">
      <h1 className="sr-only">{t('common:title')}</h1>
      <h2 className="sr-only">{t('navigation:market')}</h2>
      <div className="nft-grid">
        {cards.map((card) => (
          <NftCard
            key={card.id}
            nft={{ ...card, imageAlt: t(`card:${card.imageAltKey}`) }}
          />
        ))}
      </div>
    </section>
  )
}
