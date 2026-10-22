import { expect, type Page } from '@playwright/test'
import { visit } from './navigation'
import { visitWithAccount } from './auth'
import { seedCart, cartRequest } from './cart'
import { seedWallets } from './account'
import { seedPendingOrder } from './orders'
import { messages, useLanguage, type Language } from './demo'

export const visualPages = {
  home: '/',
  nft: '/nfts/emerald-ape-042',
  cart: '/cart',
  checkout: '/checkout',
  confirmation: '/confirmation',
  login: '/login',
  register: '/register',
  profile: '/profile',
  wallets: '/wallets',
} as const
export type VisualPage = keyof typeof visualPages
export async function prepareVisualPage(
  page: Page,
  name: VisualPage,
  language: Language,
) {
  await useLanguage(page, language)
  if (name === 'confirmation') {
    const order = await seedPendingOrder(page)
    const result = await cartRequest(page, '/demo/events', 'POST', {
      type: 'order.updated',
      resourceId: order.id,
      outcome: 'confirmed',
    })
    expect(result.status).toBe(200)
    await visit(page, `/confirmation?orderId=${order.id}`)
  } else {
    await visitWithAccount(page, visualPages[name])
    if (name === 'cart') {
      await seedCart(page)
      await visit(page, visualPages[name])
    }
    if (name === 'wallets') {
      await seedWallets(page)
      await visit(page, visualPages[name])
    }
  }
  await expect(
    page.locator('[aria-busy=true]').filter({ visible: true }),
  ).toHaveCount(0)
  if (name === 'home')
    await expect(page.locator('.catalog-grid article')).toHaveCount(9)
  if (name === 'nft')
    await expect(
      page.getByRole('heading', { name: 'Emerald Ape #042', exact: true }),
    ).toBeVisible()
  if (name === 'cart' || name === 'checkout')
    await expect(
      page
        .getByText('26.846 ETH', { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible()
  if (name === 'profile' || name === 'wallets')
    await expect(
      page.getByRole('textbox', {
        name: messages[language].account.displayName,
        exact: true,
      }),
    ).toBeVisible()
  if (name === 'confirmation')
    await expect(
      page.getByRole('heading', {
        name: messages[language].purchase.confirmed,
        exact: true,
      }),
    ).toBeVisible()
  if (name === 'login' || name === 'register')
    await expect(
      page
        .getByRole('dialog')
        .getByRole('textbox', { name: /^(E-mail|Email)$/, exact: true }),
    ).toBeVisible()
  await page.evaluate(async () => {
    await document.fonts.ready
    const images = [...document.images].filter(
      (image) => image.getClientRects().length > 0,
    )
    for (const image of images) image.loading = 'eager'
    await Promise.all(images.map((image) => image.decode()))
  })
  await expect(
    page.locator('[aria-busy=true]').filter({ visible: true }),
  ).toHaveCount(0)
  await page.clock.setFixedTime(new Date('2026-10-21T15:00:00Z'))
}
