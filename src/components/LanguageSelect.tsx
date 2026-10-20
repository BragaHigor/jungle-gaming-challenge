import { useTranslation } from 'react-i18next'

export function LanguageSelect({
  compact = false,
  id = 'language',
}: {
  compact?: boolean
  id?: string
}) {
  const { t, i18n } = useTranslation()

  return (
    <div className="language-select">
      <label htmlFor={id} className={compact ? 'sr-only' : undefined}>
        {t('language')}
      </label>
      <select
        id={id}
        value={i18n.resolvedLanguage ?? 'pt-BR'}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
        className={`field-control field-select ${compact ? 'language-select--compact' : ''}`}
      >
        <option value="pt-BR">
          {compact ? 'PT-BR' : 'Português (Brasil)'}
        </option>
        <option value="en">{compact ? 'EN' : 'English'}</option>
      </select>
    </div>
  )
}
