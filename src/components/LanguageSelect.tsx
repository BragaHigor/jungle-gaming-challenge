import { useTranslation } from 'react-i18next'

export function LanguageSelect() {
  const { t, i18n } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="language">{t('language')}</label>
      <select
        id="language"
        value={i18n.resolvedLanguage ?? 'pt-BR'}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
        className="min-h-11 rounded-md border border-border bg-background py-2 pr-9 pl-3"
      >
        <option value="pt-BR">Português (Brasil)</option>
        <option value="en">English</option>
      </select>
    </div>
  )
}
