import { expect, type Page } from '@playwright/test'
import { visit } from './navigation'

export async function signInFixture(
  page: Page,
  email = 'colecionador@kurio.demo',
) {
  if (!page.url().startsWith('http')) await visit(page, '/')
  const status = await page.evaluate(async (email) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Kurio@2026' }),
    })
    const session = await response.json()
    if (response.ok) sessionStorage.setItem('kurio-session', session.token)
    return response.status
  }, email)
  expect(status).toBe(200)
}

export async function visitWithAccount(page: Page, path: string) {
  if (/^\/(profile|wallets|checkout|confirmation)(?:\?|$)/.test(path)) {
    if (!page.url().startsWith('http')) await visit(page, '/')
    if (!(await page.evaluate(() => sessionStorage.getItem('kurio-session'))))
      await signInFixture(page)
  }
  await visit(page, path)
}

export async function submitLogin(
  page: Page,
  email = 'colecionador@kurio.demo',
) {
  const dialog = page.getByRole('dialog', { name: /^(Entrar|Sign in)$/ })
  await dialog
    .getByRole('textbox', { name: /^(E-mail|Email)$/, exact: true })
    .fill(email)
  await dialog.getByLabel(/^(Senha|Password)\s*\*?$/).fill('Kurio@2026')
  await dialog
    .getByRole('button', { name: /^(Entrar|Sign in)$/, exact: true })
    .click()
}
