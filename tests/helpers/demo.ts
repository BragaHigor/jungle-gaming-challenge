import { expect, type Page } from '@playwright/test'
import english from '../../src/i18n/locales/en.json' with { type: 'json' }
import portuguese from '../../src/i18n/locales/pt-BR.json' with { type: 'json' }

export const languages = ['pt-BR', 'en'] as const
export type Language = (typeof languages)[number]
export const messages = { 'pt-BR': portuguese, en: english }
export async function useLanguage(page: Page, language: Language) {
  await page.addInitScript(
    (language) => localStorage.setItem('kurio-language', language),
    language,
  )
}
export async function openDemo(page: Page, language: Language = 'pt-BR') {
  const labels = messages[language].demo
  const trigger = page
    .getByRole('button', { name: labels.open, exact: true })
    .filter({ visible: true })
    .first()
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: labels.title, exact: true })
  await expect(dialog).toBeVisible()
  return { dialog, trigger, labels }
}
