import { useTranslation } from 'react-i18next'

export function QuantityStepper({
  value,
  max,
  onChange,
  disabled = false,
}: {
  value: number
  max: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  const { t } = useTranslation('detail')
  return (
    <div
      className="quantity-stepper inline-flex items-center border border-input rounded shrink-0"
      role="group"
      aria-label={t('quantity')}
    >
      <button
        className="w-11 h-11 text-primary-hover text-[20px] disabled:opacity-35"
        type="button"
        aria-label={t('decrease')}
        disabled={disabled || value <= 1 || max < 1}
        onClick={() => onChange(Math.min(value - 1, max))}
      >
        −
      </button>
      <output
        className="min-w-6 text-center tabular-nums"
        aria-live="polite"
        aria-label={t('quantity')}
      >
        {value}
      </output>
      <button
        className="w-11 h-11 text-primary-hover text-[20px] disabled:opacity-35"
        type="button"
        aria-label={t('increase')}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  )
}
