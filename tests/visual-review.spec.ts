import { visitWithAccount } from './helpers/auth'
import { visit } from './helpers/navigation'
import { expect, test } from '@playwright/test'

const routes = [
  '/',
  '/nfts/emerald-ape-042',
  '/cart',
  '/checkout',
  '/confirmation',
  '/login',
  '/register',
  '/profile',
  '/wallets',
]

test.describe('Revisão do conjunto visual', () => {
  test('preserva o reflow com texto ampliado nos dois idiomas', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    for (const locale of ['pt-BR', 'en']) {
      await page.addInitScript(
        (language) => localStorage.setItem('kurio-language', language),
        locale,
      )
      for (const width of [320, 390, 768]) {
        await page.setViewportSize({ width, height: 844 })
        for (const route of routes) {
          await visitWithAccount(page, route)
          await page.evaluate(() => document.fonts.ready)
          await page.evaluate(() => {
            document.documentElement.style.fontSize = '200%'
          })
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${locale} ${width}px ${route}`,
          ).toBe(true)
        }
      }
    }
  })

  test('permite trocar carteiras e provedores usando as setas do teclado', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await visitWithAccount(page, '/checkout')
    const reserve = page.getByRole('radio', { name: /Reserva/ })
    const main = page.getByRole('radio', { name: /Principal/ })
    await reserve.focus()
    await page.keyboard.press('ArrowDown')
    await expect(main).toBeChecked()
    const metamask = page.getByRole('radio', { name: 'MetaMask', exact: true })
    const coinbase = page.getByRole('radio', {
      name: 'Coinbase Wallet',
      exact: true,
    })
    await metamask.focus()
    await page.keyboard.press('ArrowDown')
    await expect(coinbase).toBeChecked()
    await page.keyboard.press('ArrowUp')
    await expect(metamask).toBeChecked()
    await expect(coinbase).not.toBeChecked()
  })

  test('identifica os campos obrigatórios do pagamento e a nova senha no cadastro', async ({
    page,
  }) => {
    await visitWithAccount(page, '/checkout')
    const name = page.getByRole('textbox', {
      name: 'Nome de exibição',
      exact: true,
    })
    await expect(name).toHaveAttribute('aria-required', 'true')
    await visit(page, '/register')
    await expect(page.getByLabel(/^Senha\s*\*?$/)).toHaveAttribute(
      'autocomplete',
      'new-password',
    )
    await visit(page, '/login')
    await expect(page.getByLabel(/^Senha\s*\*?$/)).toHaveAttribute(
      'autocomplete',
      'current-password',
    )
  })
})

test('mantém o texto do botão da newsletter em uma única linha', async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 })
    await visit(page, '/')
    await page.evaluate(() => document.fonts.ready)
    const button = page.getByRole('button', { name: 'Enviar', exact: true })
    await button.scrollIntoViewIfNeeded()
    const lines = await button.evaluate((element) => {
      const range = document.createRange()
      range.selectNodeContents(element)
      return range.getClientRects().length
    })
    expect(lines, `${width}px`).toBe(1)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  }
})

test('alterna a hero com o dedo sem bloquear a rolagem vertical', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await visit(page, '/')
  const client = await page.context().newCDPSession(page)
  await client.send('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: 1,
  })
  const hero = page.locator('.catalog-hero')
  const image = hero.locator('.catalog-hero__art > img').first()
  const swipe = async (deltaX: number, deltaY = 0, cancel = false) => {
    const box = await hero.boundingBox()
    const x = box!.x + box!.width / 2
    const y = box!.y + box!.height / 2
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 1 }],
    })
    for (let step = 1; step <= 5; step++) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: x + (deltaX * step) / 5, y: y + (deltaY * step) / 5, id: 1 },
        ],
      })
    }
    await client.send('Input.dispatchTouchEvent', {
      type: cancel ? 'touchCancel' : 'touchEnd',
      touchPoints: [],
    })
  }
  await expect(image).toHaveAttribute('src', '/images/nft-artwork-01.webp')
  await swipe(-100)
  await expect(image).toHaveAttribute('src', '/images/nft-artwork-03.webp')
  await swipe(-100)
  await expect(image).toHaveAttribute('src', '/images/nft-artwork-04.webp')
  await swipe(-100)
  await expect(image).toHaveAttribute('src', '/images/nft-artwork-01.webp')
  await swipe(100)
  await expect(image).toHaveAttribute('src', '/images/nft-artwork-04.webp')
  await swipe(-15)
  await expect(image).toHaveAttribute('src', '/images/nft-artwork-04.webp')
  await swipe(-100, 0, true)
  await expect(image).toHaveAttribute('src', '/images/nft-artwork-04.webp')
  await swipe(0, -100)
  await expect(image).toHaveAttribute('src', '/images/nft-artwork-04.webp')
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0)
  await hero
    .getByRole('button', { name: 'Mostrar destaque 1', exact: true })
    .click()
  await expect(image).toHaveAttribute('src', '/images/nft-artwork-01.webp')
  const secondSlide = hero.getByRole('button', {
    name: 'Mostrar destaque 2',
    exact: true,
  })
  await secondSlide.focus()
  await page.keyboard.press('Enter')
  await expect(image).toHaveAttribute('src', '/images/nft-artwork-03.webp')
  await expect(secondSlide).toHaveAttribute('aria-pressed', 'true')
  await client.detach()
})
