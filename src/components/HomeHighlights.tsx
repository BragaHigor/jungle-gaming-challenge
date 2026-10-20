import { useTranslation } from 'react-i18next'
import type { CatalogTab, Category } from '@/types/catalog'
import { UnavailableAction } from '@/components/UnavailableAction'
import { Icon } from '@/components/ui/Icon'

export function HomeHighlights({
  onExplore,
}: {
  onExplore: (tab: CatalogTab, category?: Category) => void
}) {
  const { t } = useTranslation('catalog')
  return (
    <>
      <section
        className="home-promos grid grid-cols-2 gap-6 mt-24 max-tablet:mt-16 max-tablet:grid-cols-1"
        aria-label={t('highlights')}
      >
        {(['genesis', 'curated'] as const).map((key, index) => (
          <article
            className="home-promo grid grid-cols-2 items-center bg-surface rounded-3xl overflow-hidden max-desktop:tablet:grid-cols-1 max-tablet:grid-cols-[45%_minmax(0,_1fr)]"
            key={key}
          >
            <img
              className="w-full h-full min-h-70 object-cover max-desktop:tablet:h-60 max-desktop:tablet:min-h-0 max-tablet:min-h-70"
              src={`/images/nft-artwork-0${index === 0 ? 1 : 3}.webp`}
              width="300"
              height="300"
              loading="lazy"
              alt=""
            />
            <div className="pt-6 pr-6 pb-6 pl-6 max-tablet:pt-4 max-tablet:pr-4 max-tablet:pb-4 max-tablet:pl-4">
              <h2 className="text-[18px] font-bold leading-[1.7] max-tablet:text-[15px]">
                {t(`${key}Title`)}
              </h2>
              <p className="text-secondary mt-3 leading-[1.8] text-[13px] max-tablet:text-[12px]">
                {t(`${key}Text`)}
              </p>
              <a
                href="#marketplace"
                className="promo-explore inline-flex gap-4 items-center min-h-11 mt-4 pt-1 pr-3 pb-1 pl-3 [background:var(--gradient-copper)] text-background rounded font-bold text-[12px]"
                onClick={() =>
                  onExplore(
                    index === 0 ? 'new' : 'all',
                    index === 1 ? 'digitalArt' : undefined,
                  )
                }
              >
                {t('explore')}
                <Icon name="arrow" />
              </a>
            </div>
          </article>
        ))}
      </section>
      <section
        className="home-journal mt-24 max-tablet:mt-16"
        aria-labelledby="journal-title"
      >
        <h2
          className="text-[28px] font-bold text-center max-tablet:text-[22px]"
          id="journal-title"
        >
          {t('journal')}
        </h2>
        <p className="mt-3 mr-auto mb-10 ml-auto text-center max-w-175 text-secondary">
          {t('journalIntro')}
        </p>
        <div className="journal-grid grid grid-cols-4 gap-6 [&_.journal-meta]:text-muted-foreground [&_.journal-meta]:text-[11px] [&_.journal-meta]:mt-4 [&_.journal-meta]:mr-0 [&_.journal-meta]:mb-2 [&_.journal-meta]:ml-0 [&_.text-action]:mt-2 [&_.text-action]:text-[13px] max-desktop:tablet:grid-cols-2 max-desktop:tablet:gap-y-10 max-tablet:grid-cols-1 max-tablet:gap-8">
          {(['culture', 'collect', 'creators', 'security'] as const).map(
            (key, index) => (
              <article className="min-w-0" key={key}>
                <img
                  className="w-full aspect-[1.38] object-cover rounded-2xl"
                  src={`/images/nft-artwork-0${index + 1}.webp`}
                  width="280"
                  height="200"
                  loading="lazy"
                  alt=""
                />
                <p className="journal-meta mt-3 text-secondary text-[13px] leading-[1.8]">
                  {t('journalMeta')}
                </p>
                <h3 className="text-[16px] font-bold leading-[1.6]">
                  {t(`${key}Title`)}
                </h3>
                <p className="mt-3 text-secondary text-[13px] leading-[1.8]">
                  {t(`${key}Text`)}
                </p>
                <UnavailableAction className="text-action text-primary-hover inline-flex items-center gap-2 min-h-11 text-left hover:underline">
                  {t('readMore')}
                  <Icon name="arrow" />
                </UnavailableAction>
              </article>
            ),
          )}
        </div>
      </section>
    </>
  )
}
