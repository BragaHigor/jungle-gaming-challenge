import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

export function CarouselDots({
  count,
  value,
  onChange,
  label,
  className,
  dotClassName,
}: {
  count: number
  value: number
  onChange: (value: number) => void
  label: string
  className?: string
  dotClassName?: string
}) {
  const { t } = useTranslation('catalog')
  return (
    <div
      className={cn('carousel-dots flex justify-center gap-0', className)}
      role="group"
      aria-label={label}
    >
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          className="group/dot grid h-11 w-8 place-items-center"
          aria-label={t('slide', { number: index + 1 })}
          aria-pressed={value === index}
          onClick={() => onChange(index)}
        >
          <span
            className={cn(
              'size-2 rounded-full bg-input group-aria-pressed/dot:bg-primary-hover',
              dotClassName,
            )}
          />
        </button>
      ))}
    </div>
  )
}
