import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/Icon'
import { CarouselDots } from '@/components/ui/CarouselDots'

export function CatalogHero() {
  const { t } = useTranslation(['catalog', 'card'])
  const [slide, setSlide] = useState(0)
  const images = ['01', '03', '04']
  const alts = ['emeraldAlt', 'neonAlt', 'goldenAlt'] as const
  return (
    <section
      className="catalog-hero relative grid grid-cols-[minmax(0,1fr)_138px] items-center gap-2 rounded-3xl max-tablet:min-h-47.5 max-tablet:bg-[image:var(--gradient-hero)] max-tablet:py-2 max-tablet:pr-2.5 max-tablet:pl-4 tablet:grid-cols-[minmax(0,1fr)_340px] tablet:gap-8 desktop:grid-cols-[minmax(0,1fr)_450px] desktop:gap-12 max-xs:grid-cols-[minmax(0,1fr)_110px]"
      aria-label={t('catalog:highlights')}
    >
      <div className="catalog-hero__copy tablet:py-4 desktop:pt-8 desktop:pb-16 desktop:pl-10">
        <p className="catalog-hero__kicker mb-1 text-[12px] leading-[14px] text-foreground tablet:mb-3 tablet:text-[14px] tablet:leading-[1.5] tablet:tracking-[0.1em] tablet:text-secondary">
          {t('catalog:welcome')}
        </p>
        <h1 className="text-[18px] leading-[30px] font-bold tablet:text-[clamp(22px,calc(3.5vw_-_2.5px),34px)] tablet:leading-[1.65] tablet:tracking-[0.06em] desktop:text-[clamp(36px,3.1vw,43px)] desktop:leading-[1.63] max-xs:text-[15px] max-xs:leading-[26px]">
          <span className="hero-desktop max-tablet:hidden">
            {t('catalog:heroTitle')}
            <br />
            {t('catalog:heroTitleEnd')}
          </span>
          <span className="hero-mobile hidden max-tablet:inline">
            {t('catalog:heroMobileTitle')}
            <br />
            {t('catalog:heroMobileEnd')}
          </span>
        </h1>
        <p className="catalog-hero__text mt-1 max-w-140 text-[12px] leading-[20px] text-secondary tablet:mt-3 tablet:text-[14px] tablet:leading-[24px] max-xs:text-[11px]">
          <span className="hero-desktop max-tablet:hidden">
            {t('catalog:heroText')}
          </span>
          <span className="hero-mobile hidden max-tablet:inline">
            {t('catalog:heroMobileText')}
          </span>
        </p>
        <Button
          asChild
          className="hero-explore mt-8 min-w-35 max-tablet:mt-0 max-tablet:min-h-11 max-xs:mb-4 max-tablet:min-w-0 max-tablet:bg-transparent max-tablet:p-0 max-tablet:text-[11px] max-tablet:text-primary-hover"
        >
          <a href="#marketplace">
            {t('catalog:explore')}
            <Icon
              name="arrow"
              className="hidden max-tablet:block max-tablet:w-4"
            />
          </a>
        </Button>
        <CarouselDots
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 tablet:hidden"
          dotClassName="size-1.5"
          count={images.length}
          value={slide}
          onChange={setSlide}
          label={t('catalog:heroSlides')}
        />
      </div>
      <div className="catalog-hero__art relative aspect-square rounded-3xl max-tablet:mt-[3px] max-tablet:self-start tablet:overflow-hidden">
        <img
          className="size-full rounded-2xl object-cover tablet:rounded-none"
          src={`/images/nft-artwork-${images[slide]}.webp`}
          alt={t(`card:${alts[slide]}`)}
          width="450"
          height="450"
          fetchPriority="high"
        />
        <img
          className="hero-mini absolute -bottom-2 left-3.5 h-14.5 w-13.5 rounded-xl border-3 border-surface object-cover tablet:hidden"
          src="/images/nft-artwork-02.webp"
          width="80"
          height="80"
          alt=""
        />
      </div>
    </section>
  )
}
