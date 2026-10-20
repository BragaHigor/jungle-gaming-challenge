import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ptBR from './locales/pt-BR.json'
import en from './locales/en.json'

const storageKey = 'kurio-language'

function getInitialLanguage() {
  try {
    return localStorage.getItem(storageKey) === 'en' ? 'en' : 'pt-BR'
  } catch {
    return 'pt-BR'
  }
}

function synchronizeLanguage(language: string) {
  document.documentElement.lang = language
  try {
    localStorage.setItem(storageKey, language)
  } catch {
    return
  }
}

await i18n.use(initReactI18next).init({
  resources: { 'pt-BR': ptBR, en },
  lng: getInitialLanguage(),
  supportedLngs: ['pt-BR', 'en'],
  fallbackLng: 'pt-BR',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  initAsync: false,
})

synchronizeLanguage(i18n.resolvedLanguage ?? 'pt-BR')
i18n.on('languageChanged', synchronizeLanguage)

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: typeof ptBR
    strictKeyChecks: true
  }
}

export { i18n }
