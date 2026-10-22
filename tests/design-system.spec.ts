import { visitWithAccount, signInFixture } from './helpers/auth'
import { visit } from './helpers/navigation'
import { test, expect } from '@playwright/test'

test.describe('Componentes compartilhados e identidade visual', () => {
  test('permite rolar as opções do cenário sem rolar o diálogo ou a página', async ({
    page,
  }) => {
    await visit(page, '/')
    await page
      .getByRole('contentinfo')
      .getByRole('button', { name: 'Demonstração', exact: true })
      .click()
    const dialog = page.getByRole('dialog', {
      name: 'Controle da demonstração',
      exact: true,
    })
    const select = dialog.getByRole('combobox', {
      name: 'Cenário',
      exact: true,
    })
    await select.click()
    const first = select.getByRole('option', { name: 'Padrão', exact: true })
    const firstBox = await first.boundingBox()
    expect(firstBox).not.toBeNull()
    const scroll = await page.evaluate(() => window.scrollY)
    const dialogScroll = await dialog.evaluate((element) => element.scrollTop)
    await page.mouse.move(
      firstBox!.x + firstBox!.width / 2,
      firstBox!.y + firstBox!.height / 2,
    )
    await page.mouse.wheel(0, 450)
    await expect
      .poll(async () => (await first.boundingBox())!.y)
      .toBeLessThan(firstBox!.y - 30)
    expect(await page.evaluate(() => window.scrollY)).toBe(scroll)
    expect(await dialog.evaluate((element) => element.scrollTop)).toBe(
      dialogScroll,
    )
    await select
      .getByRole('option', {
        name: 'Pedido pendente (conta fictícia)',
        exact: true,
      })
      .click()
    await expect(select).toHaveValue('pending-order')
    await expect(select).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  })

  test('abre as opções do seletor e preserva escolha e foco pelo teclado', async ({
    page,
  }) => {
    await visitWithAccount(page, '/checkout')
    const select = page.getByRole('combobox', { name: 'Rede', exact: true })
    await select.click()
    await page.getByRole('option', { name: 'Solana', exact: true }).click()
    await expect(select).toHaveValue('Solana')
    await select.focus()
    await page.keyboard.press('Space')
    await expect(
      page.getByRole('option', { name: 'Polygon', exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(select).toBeFocused()
    await expect(select).toHaveValue('Solana')
  })

  test('mantém o foco no menu e devolve ao acionador ao pressionar Escape', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await visit(page, '/')
    const trigger = page.getByRole('button', {
      name: 'Abrir menu',
      exact: true,
    })
    await trigger.click()
    const drawer = page.getByRole('dialog', { name: 'Menu', exact: true })
    await expect(drawer).toBeVisible()
    await expect(
      drawer.getByRole('button', { name: 'Fechar', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(
      drawer.getByRole('button', { name: 'Demonstração', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(
      drawer.getByRole('button', { name: 'Fechar', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(drawer).not.toBeVisible()
    await expect(trigger).toBeFocused()
  })

  test('fecha o menu ao navegar e suporta uma rota direta após atualizar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await visit(page, '/')
    await signInFixture(page)
    await page.reload()
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: 'Menu', exact: true })
    await drawer.getByRole('link', { name: 'Carteiras', exact: true }).click()
    await expect(drawer).not.toBeVisible()
    await expect(page).toHaveURL('/wallets')
    await page.reload()
    await expect(
      page
        .getByRole('main')
        .getByRole('heading', { name: 'Carteiras', exact: true }),
    ).toBeVisible()
  })

  test('informa ações fora do escopo sem apresentar sucesso falso', async ({
    page,
  }) => {
    await visit(page, '/')
    const trigger = page
      .getByRole('contentinfo')
      .getByRole('button', { name: 'Como comprar NFTs', exact: true })
    await trigger.click()
    const dialog = page.getByRole('dialog', {
      name: 'Conteúdo indisponível',
      exact: true,
    })
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByText(
        'Esta funcionalidade não está disponível neste marketplace.',
        { exact: true },
      ),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
  })

  test('abre um diálogo dentro da gaveta sem perder o foco do menu', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 414, height: 896 })
    await visit(page, '/')
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: 'Menu', exact: true })
    const trigger = drawer.getByRole('button', {
      name: 'Criadores',
      exact: true,
    })
    await trigger.click()
    const dialog = page.getByRole('dialog', {
      name: 'Conteúdo indisponível',
      exact: true,
    })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
    await expect(drawer).toBeVisible()
  })

  test('carrega fonte e artes locais e navega pelo card', async ({ page }) => {
    const externalRequests: string[] = []
    page.on('request', (request) => {
      if (
        !request.url().startsWith('http://127.0.0.1:4180') &&
        !request.url().startsWith('data:')
      )
        externalRequests.push(request.url())
    })
    await visit(page, '/')
    await page.evaluate(() => document.fonts.ready)
    expect(
      await page.evaluate(() => document.fonts.check('16px "Roboto Mono"')),
    ).toBe(true)
    const artwork = page.locator('.catalog-grid').getByRole('img', {
      name: 'Macaco com óculos redondos e jaqueta verde',
      exact: true,
    })
    await expect(artwork).toBeVisible()
    await expect
      .poll(() =>
        artwork.evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
      )
      .toBe(true)
    expect(externalRequests).toEqual([])
    await page
      .getByRole('link', { name: 'Ver Emerald Ape #042', exact: true })
      .click()
    await expect(page).toHaveURL('/nfts/emerald-ape-042')
    await expect(
      page
        .getByRole('main')
        .getByRole('heading', { name: 'Emerald Ape #042', exact: true }),
    ).toBeVisible()
  })

  for (const width of [390, 414, 768, 1440]) {
    test(`preserva layout e idioma sem overflow em ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await visit(page, '/')
      await page.evaluate(() => document.fonts.ready)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
      if (width < 1100)
        await page
          .getByRole('button', { name: 'Abrir menu', exact: true })
          .click()
      await page
        .getByRole('combobox', { name: 'Idioma', exact: true })
        .selectOption('en')
      if (width < 1100) await page.keyboard.press('Escape')
      await expect(
        page
          .getByRole('contentinfo')
          .getByRole('heading', { name: 'Wallet security', exact: true }),
      ).toBeVisible()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
    })
  }

  test('permite pular para o conteúdo com teclado e mantém a preferência de movimento', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await visit(page, '/')
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('link', { name: 'Ir para o conteúdo', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('main')).toBeFocused()
    expect(
      await page.evaluate(
        () => matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
    ).toBe(true)
  })
})
