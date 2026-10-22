import { expect, type Page } from '@playwright/test'
import english from '../../src/i18n/locales/en.json' with { type: 'json' }
import portuguese from '../../src/i18n/locales/pt-BR.json' with { type: 'json' }

export async function fillCollector(
  page: Page,
  language: 'pt-BR' | 'en' = 'pt-BR',
) {
  const labels = language === 'en' ? english.purchase : portuguese.purchase
  const values = {
    [labels.displayName]: 'Alex Silva',
    [labels.username]: 'alexsilva',
    [labels.profileName]: 'Minha coleção',
    [labels.referral]: 'KURIO',
    [labels.email]: 'alex@example.com',
    [labels.ens]: 'alex.eth',
  }
  for (const [name, value] of Object.entries(values))
    await page.getByRole('textbox', { name, exact: true }).fill(value)
  await page.getByRole('button', { name: labels.review, exact: true }).click()
  const review = page.getByRole('dialog', {
    name: labels.reviewTitle,
    exact: true,
  })
  await expect(review).toBeVisible()
  return review
}
