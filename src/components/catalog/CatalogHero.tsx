import { useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/Icon'
import { CarouselDots } from '@/components/ui/CarouselDots'

export function CatalogHero() {
  const { t } = useTranslation(['catalog', 'card'])
  const [slide, setSlide] = useState(0)
  const swipeStart = useRef<{ x: number; y: number; pointerId: number } | null>(
    null,
  )
  const images = ['01', '03', '04']
  const alts = ['emeraldAlt', 'neonAlt', 'goldenAlt'] as const
  const startSwipe = (event: PointerEvent<HTMLElement>) => {
    swipeStart.current = null
    const isTouchOnMobile =
      event.isPrimary &&
      event.pointerType === 'touch' &&
      window.matchMedia('(width < 700px)').matches
    const isInteractive = (event.target as Element).closest(
      'a, button, input, select',
    )
    if (!isTouchOnMobile || isInteractive) return
    swipeStart.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const finishSwipe = (event: PointerEvent<HTMLElement>) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start || start.pointerId !== event.pointerId) return
    const deltaX = event.clientX - start.x
    const deltaY = event.clientY - start.y
    const isHorizontalSwipe =
      Math.abs(deltaX) >= 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25
    if (!isHorizontalSwipe) return
    const direction = deltaX < 0 ? 1 : -1
    setSlide((current) => (current + direction + images.length) % images.length)
  }
  return (
    <section
      className="catalog-hero relative isolate grid grid-cols-[minmax(0,1fr)_138px] items-center gap-2 rounded-3xl max-tablet:touch-pan-y max-tablet:touch-pinch-zoom max-tablet:min-h-47.5 max-tablet:rounded-[30px] max-tablet:py-2 max-tablet:pr-2.5 max-tablet:pl-4 tablet:grid-cols-[minmax(0,1fr)_340px] tablet:gap-8 desktop:grid-cols-[minmax(0,1fr)_450px] desktop:gap-12 max-xs:grid-cols-[minmax(0,1fr)_110px]"
      aria-label={t('catalog:highlights')}
      onPointerDown={startSwipe}
      onPointerUp={finishSwipe}
      onPointerCancel={() => {
        swipeStart.current = null
      }}
      onLostPointerCapture={() => {
        swipeStart.current = null
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden rounded-[30px] bg-[image:var(--gradient-hero)] max-tablet:block before:absolute before:top-[-31px] before:left-[-80px] before:size-[248px] before:rounded-full before:bg-[image:var(--gradient-hero-orbit-start)] before:content-[''] after:absolute after:top-[-10px] after:left-[73px] after:size-[248px] after:rounded-full after:bg-[image:var(--gradient-hero-orbit-end)] after:content-['']"
      />
      <div className="catalog-hero__copy tablet:py-4 desktop:pt-8 desktop:pb-16 desktop:pl-10">
        <p className="catalog-hero__kicker mb-1 text-[12px] leading-[16px] font-medium text-foreground tablet:mb-3 tablet:text-[14px] tablet:leading-[1.5] tablet:tracking-[0.1em] tablet:text-secondary">
          {t('catalog:welcome')}
        </p>
        <h1 className="text-[18px] leading-[29px] font-bold tablet:text-[clamp(22px,calc(3.5vw_-_2.5px),34px)] tablet:leading-[1.65] tablet:tracking-[0.06em] desktop:text-[clamp(36px,3.1vw,43px)] desktop:leading-[1.63] max-xs:text-[15px] max-xs:leading-[26px]">
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
        <p className="catalog-hero__text mt-1 max-w-140 text-[12px] leading-[18px] text-secondary max-tablet:tracking-normal tablet:mt-3 tablet:text-[14px] tablet:leading-[24px] max-xs:text-[11px]">
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
          className="hero-mini absolute -bottom-2 left-3.5 h-14.5 w-14.5 rounded-2xl object-cover tablet:hidden"
          src="/images/nft-artwork-02.webp"
          width="80"
          height="80"
          alt=""
        />
      </div>
    </section>
  )
}
