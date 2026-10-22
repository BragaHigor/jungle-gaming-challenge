import { test, expect } from '@playwright/test'
import { visit } from './helpers/navigation'
import { seedCart } from './helpers/cart'
import { submitLogin } from './helpers/auth'
import { languages, messages, useLanguage } from './helpers/demo'

for (const language of languages) {
  test.describe(`Autenticação sobre a página atual em ${language}`, () => {
    test.beforeEach(async ({ page }) => {
      await useLanguage(page, language)
    })

    test('mantém o NFT e a rolagem ao alternar login e cadastro e fechar', async ({
      page,
    }) => {
      const text = messages[language]
      const route = '/nfts/emerald-ape-042'
      await visit(page, route)
      const favorite = page
        .getByRole('button', {
          name: text.card.favorite.replace('{{title}}', 'Emerald Ape #042'),
          exact: true,
        })
        .filter({ visible: true })
        .first()
      await favorite.scrollIntoViewIfNeeded()
      const before = await page.evaluate(() => scrollY)
      await favorite.click()
      const login = page.getByRole('dialog', {
        name: text.account.login,
        exact: true,
      })
      await expect(login).toBeVisible()
      await expect(page).toHaveURL(route)
      await expect(page.locator('.catalog-grid')).toHaveCount(0)
      const registrationLabel =
        (page.viewportSize()?.width ?? 0) < 700
          ? text.account.newAccount
          : text.account.createAccount
      await login
        .getByRole('link', { name: registrationLabel, exact: true })
        .filter({ visible: true })
        .click()
      const registration = page.getByRole('dialog', {
        name: text.account.registerTitle,
        exact: true,
      })
      await expect(registration).toBeVisible()
      await expect(page).toHaveURL(route)
      await registration
        .getByRole('button', { name: text.common.close, exact: true })
        .click()
      await expect(registration).toHaveCount(0)
      await expect(page).toHaveURL(route)
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(before)
      await expect(favorite).toBeFocused()
    })

    test('fecha o acesso no carrinho e só segue ao checkout após autenticar', async ({
      page,
    }) => {
      const text = messages[language]
      await visit(page, '/')
      await seedCart(page)
      await visit(page, '/cart')
      const checkout = page.getByRole('link', {
        name: text.purchase.checkout,
        exact: true,
      })
      await expect(checkout).toBeVisible()
      await checkout.click()
      const login = page.getByRole('dialog', {
        name: text.account.login,
        exact: true,
      })
      await expect(login).toBeVisible()
      await expect(page).toHaveURL('/cart')
      await page.keyboard.press('Escape')
      await expect(login).toHaveCount(0)
      await expect(page).toHaveURL('/cart')
      await expect(checkout).toBeFocused()
      await checkout.click()
      await submitLogin(page)
      await expect(login).toHaveCount(0)
      await expect(page).toHaveURL('/checkout')
    })

    test('preserva filtros e fragmento ao fechar o acesso pelo menu', async ({
      page,
    }) => {
      const text = messages[language]
      const route = '/?sort=lowest#marketplace'
      await visit(page, route)
      const trigger = page
        .getByRole('link', { name: text.navigation.signIn, exact: true })
        .filter({ visible: true })
      if (await trigger.count()) await trigger.click()
      else {
        await page
          .getByRole('button', { name: text.navigation.menu, exact: true })
          .filter({ visible: true })
          .first()
          .click()
        await page
          .getByRole('dialog', { name: text.navigation.menuTitle, exact: true })
          .getByRole('link', { name: text.navigation.signIn, exact: true })
          .click()
      }
      const login = page.getByRole('dialog', {
        name: text.account.login,
        exact: true,
      })
      await expect(login).toBeVisible()
      await expect(page).toHaveURL(route)
      await page.keyboard.press('Escape')
      await expect(login).toHaveCount(0)
      await expect(page).toHaveURL(route)
      if ((page.viewportSize()?.width ?? 0) < 700)
        await page
          .getByRole('button', { name: text.catalog.filters, exact: true })
          .click()
      await expect(
        page
          .getByRole('combobox', { name: text.catalog.sort, exact: true })
          .filter({ visible: true }),
      ).toHaveValue('lowest')
    })
  })
}
