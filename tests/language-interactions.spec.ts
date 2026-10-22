import { test, expect, type Page } from '@playwright/test'
import { visit, waitForAppReady } from './helpers/navigation'
import { visitWithAccount } from './helpers/auth'
import { cartRequest, seedCart } from './helpers/cart'
import { seedWallets } from './helpers/account'
import { seedPendingOrder } from './helpers/orders'
import { openDemo, messages, type Language } from './helpers/demo'

async function switchLanguage(page: Page, language: Language) {
  const languageName = /^(Idioma|Language)$/
  let select = page
    .getByRole('combobox', { name: languageName })
    .filter({ visible: true })
    .first()
  if (!(await select.count())) {
    await page
      .getByRole('button', { name: /^(Abrir menu|Open menu)$/ })
      .filter({ visible: true })
      .first()
      .click()
    select = page
      .getByRole('combobox', { name: languageName })
      .filter({ visible: true })
      .first()
  }
  await select.selectOption(language)
  await expect(page.locator('html')).toHaveAttribute('lang', language)
  const menu = page.getByRole('dialog', { name: 'Menu', exact: true })
  if (await menu.isVisible()) await page.keyboard.press('Escape')
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('kurio-language')))
    .toBe(language)
}

for (const route of [
  '/',
  '/nfts/emerald-ape-042',
  '/cart',
  '/checkout',
  '/confirmation',
  '/profile',
  '/wallets',
]) {
  test(`alterna PT-BR e EN sem perder a rota e os dados em ${route}`, async ({
    page,
  }) => {
    test.setTimeout(60000)
    if (route === '/confirmation') {
      const order = await seedPendingOrder(page)
      await cartRequest(page, '/demo/events', 'POST', {
        type: 'order.updated',
        resourceId: order.id,
        outcome: 'confirmed',
      })
      await visit(page, `/confirmation?orderId=${order.id}`)
    } else {
      await visitWithAccount(page, route)
      if (route === '/wallets') {
        await seedWallets(page)
        await page.reload()
        await waitForAppReady(page)
      }
    }
    const url = page.url()
    const cart = (await cartRequest(page)).body
    const token = await page.evaluate(() =>
      sessionStorage.getItem('kurio-session'),
    )
    for (const language of ['en', 'pt-BR'] as const) {
      await switchLanguage(page, language)
      await expect(page).toHaveURL(url)
      await expect(page).toHaveTitle(messages[language].common.pageTitle)
      expect(
        await page.evaluate(() => sessionStorage.getItem('kurio-session')),
      ).toBe(token)
      expect((await cartRequest(page)).body).toEqual(cart)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
      await expect(
        page.getByText(/^(catalog|account|purchase|demo):/),
      ).toHaveCount(0)
    }
    await switchLanguage(page, 'en')
    await page.reload()
    await waitForAppReady(page)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await switchLanguage(page, 'pt-BR')
  })
}

test('traduz a validação do perfil e preserva as alterações não salvas', async ({
  page,
}) => {
  await visitWithAccount(page, '/profile')
  await page
    .getByRole('textbox', {
      name: messages['pt-BR'].account.displayName,
      exact: true,
    })
    .fill('Nome em edição')
  await page
    .getByRole('textbox', {
      name: messages['pt-BR'].account.email,
      exact: true,
    })
    .fill('email-invalido')
  await page
    .getByRole('button', { name: messages['pt-BR'].account.save, exact: true })
    .click()
  for (const language of ['en', 'pt-BR'] as const) {
    await switchLanguage(page, language)
    const text = messages[language].account
    await expect(
      page.getByRole('textbox', { name: text.displayName, exact: true }),
    ).toHaveValue('Nome em edição')
    await expect(
      page.getByRole('textbox', { name: text.email, exact: true }),
    ).toHaveValue('email-invalido')
    await expect(
      page.getByText(text.emailInvalid, { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('dialog', { name: text.unsavedTitle, exact: true }),
    ).toHaveCount(0)
  }
})

test('preserva o coletor e a carteira selecionada ao traduzir o checkout', async ({
  page,
}) => {
  await visitWithAccount(page, '/checkout')
  await page
    .getByRole('textbox', {
      name: messages['pt-BR'].purchase.displayName,
      exact: true,
    })
    .fill('Alex em edição')
  const mobile = (page.viewportSize()?.width ?? 0) < 700
  if (mobile) await page.getByRole('radio', { name: /Reserva/ }).check()
  else {
    const wallets = page.getByRole('combobox', {
      name: messages['pt-BR'].purchase.savedWallets,
      exact: true,
    })
    await wallets.selectOption({ index: 1 })
  }
  const selected = await page
    .locator('input[name="saved-wallet"]:checked')
    .getAttribute('value')
  for (const language of ['en', 'pt-BR'] as const) {
    await switchLanguage(page, language)
    await expect(
      page.getByRole('textbox', {
        name: messages[language].purchase.displayName,
        exact: true,
      }),
    ).toHaveValue('Alex em edição')
    if (mobile)
      expect(
        await page
          .locator('input[name="saved-wallet"]:checked')
          .getAttribute('value'),
      ).toBe(selected)
    else
      await expect(
        page.getByRole('combobox', {
          name: messages[language].purchase.savedWallets,
          exact: true,
        }),
      ).toHaveJSProperty('selectedIndex', 1)
  }
})

test('traduz erro de cupom e mantém o código digitado sem aplicar novamente', async ({
  page,
}) => {
  await visit(page, '/')
  await seedCart(page)
  await visit(page, '/cart')
  await page
    .getByRole('button', {
      name: messages['pt-BR'].purchase.apply,
      exact: true,
    })
    .click()
  await switchLanguage(page, 'en')
  await expect(
    page.getByText(messages.en.purchase.couponRequired, { exact: true }),
  ).toBeVisible()
  await page
    .getByRole('textbox', { name: messages.en.purchase.coupon, exact: true })
    .fill('PROMO-TEST')
  for (const language of ['pt-BR', 'en'] as const) {
    await switchLanguage(page, language)
    const input = page.getByRole('textbox', {
      name: messages[language].purchase.coupon,
      exact: true,
    })
    await expect(input).toHaveValue('PROMO-TEST')
    await expect(input).toHaveAttribute(
      'placeholder',
      messages[language].purchase.couponPlaceholder,
    )
    await expect(input).toHaveAttribute('aria-invalid', 'false')
  }
})

test('abre login e cadastro no idioma escolhido e retorna ao NFT em ambos os sentidos', async ({
  page,
}) => {
  const route = '/nfts/emerald-ape-042'
  await visit(page, route)
  for (const language of ['en', 'pt-BR'] as const) {
    await switchLanguage(page, language)
    const text = messages[language]
    await page
      .getByRole('button', {
        name: text.card.favorite.replace('{{title}}', 'Emerald Ape #042'),
        exact: true,
      })
      .filter({ visible: true })
      .first()
      .click()
    const login = page.getByRole('dialog', {
      name: text.account.login,
      exact: true,
    })
    await expect(
      login.getByRole('textbox', { name: text.account.email, exact: true }),
    ).toBeVisible()
    const label =
      (page.viewportSize()?.width ?? 0) < 700
        ? text.account.newAccount
        : text.account.createAccount
    await login
      .getByRole('link', { name: label, exact: true })
      .filter({ visible: true })
      .click()
    const registration = page.getByRole('dialog', {
      name: text.account.registerTitle,
      exact: true,
    })
    await expect(
      registration.getByRole('textbox', {
        name: text.account.username,
        exact: true,
      }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(registration).toHaveCount(0)
    await expect(page).toHaveURL(route)
  }
})

test('reabre o pedido correto da demonstração e traduz o aviso sem alterar o resultado', async ({
  page,
}) => {
  await visit(page, '/')
  const { dialog, labels } = await openDemo(page)
  await dialog
    .getByRole('combobox', { name: labels.guidedScenario, exact: true })
    .selectOption('order-confirmed')
  await dialog
    .getByRole('button', { name: labels.guidedStart, exact: true })
    .click()
  await expect(page).toHaveURL('/confirmation?orderId=order-demo-pending')
  const order = (await cartRequest(page, '/orders/order-demo-pending')).body
  await visit(page, '/confirmation?orderId=pedido-inexistente')
  const banner = page.getByRole('region', {
    name: labels.activeTitle,
    exact: true,
  })
  await banner
    .getByRole('button', { name: labels.returnToDemo, exact: true })
    .click()
  await expect(page).toHaveURL('/confirmation?orderId=order-demo-pending')
  for (const language of ['en', 'pt-BR'] as const) {
    await switchLanguage(page, language)
    await expect(
      page.getByRole('region', {
        name: messages[language].demo.activeTitle,
        exact: true,
      }),
    ).toContainText(messages[language].demo['scenario_order-confirmed'])
    await expect(
      page.getByRole('heading', {
        name: messages[language].purchase.confirmed,
        exact: true,
      }),
    ).toBeVisible()
    expect(
      (await cartRequest(page, '/orders/order-demo-pending')).body,
    ).toEqual(order)
  }
})
