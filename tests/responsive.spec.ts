import { test, expect } from '@playwright/test'

test.describe('Revisão visual e responsividade', () => {
  test('mantém a mesma grade no catálogo carregado e no skeleton de tablet', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 900 })
    await page.goto('/')
    const media = page.locator('.catalog-grid .nft-card__media')
    const ready = await Promise.all([
      media.nth(0).boundingBox(),
      media.nth(1).boundingBox(),
      media.nth(2).boundingBox(),
    ])
    await page.goto('/?view=loading')
    const loading = page.locator('.catalog-main .nft-card__media')
    for (const index of [0, 1, 2]) {
      const box = await loading.nth(index).boundingBox()
      expect(box?.width).toBeCloseTo(ready[index]!.width, 0)
      expect(box?.x).toBeCloseTo(ready[index]!.x, 0)
    }
    expect(ready[2]!.y).toBeGreaterThan(ready[0]!.y)
    const first = await loading.nth(0).boundingBox()
    const third = await loading.nth(2).boundingBox()
    expect(third!.y).toBeGreaterThan(first!.y)
  })

  test('apresenta skeleton próprio do detalhe, preserva navegação e respeita movimento reduzido', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/nfts/emerald-ape-042?view=loading')
    await expect(page.getByRole('status')).toHaveText('Carregando NFT…')
    await expect(page.locator('.nft-detail-loading')).toHaveAttribute(
      'aria-busy',
      'true',
    )
    await expect(page.locator('.nft-detail-loading .nft-card')).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: 'Voltar ao catálogo' }),
    ).toBeVisible()
    await page
      .getByRole('combobox', { name: 'Idioma', exact: true })
      .selectOption('en')
    await expect(page.getByRole('status')).toHaveText('Loading NFT…')
    expect(
      await page
        .locator('.nft-detail-loading [data-slot="skeleton"]')
        .first()
        .evaluate(
          (element) => getComputedStyle(element, '::after').animationName,
        ),
    ).toBe('none')
    await page.getByRole('link', { name: 'Back to catalog' }).click()
    await expect(page).toHaveURL('/')
  })

  test('preserva a proporção da imagem ampliada em um celular na horizontal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 666, height: 375 })
    await page.goto('/nfts/emerald-ape-042')
    const trigger = page.getByRole('button', {
      name: 'Ampliar Emerald Ape #042',
      exact: true,
    })
    await trigger.click()
    const dialog = page.getByRole('dialog', {
      name: 'Emerald Ape #042',
      exact: true,
    })
    const image = await dialog.locator('.gallery-zoom').boundingBox()
    expect(image!.height).toBeCloseTo(image!.width, 0)
    await dialog
      .getByRole('button', { name: 'Detalhe da roupa', exact: true })
      .click()
    await expect(
      dialog.getByRole('button', { name: 'Detalhe da roupa', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
  })

  test('mantém compra no fluxo em telas baixas e fixa em retrato', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 666, height: 375 })
    await page.goto('/nfts/emerald-ape-042')
    const panel = page.locator('.mobile-purchase')
    await expect(panel).toHaveCSS('position', 'static')
    await panel
      .getByRole('link', { name: 'COMPRAR NFT', exact: true })
      .scrollIntoViewIfNeeded()
    await expect(
      panel.getByRole('link', { name: 'COMPRAR NFT', exact: true }),
    ).toBeInViewport()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(panel).toHaveCSS('position', 'fixed')
    await expect(
      panel.getByRole('link', { name: 'COMPRAR NFT', exact: true }),
    ).toBeInViewport()
  })

  test('mantém o acesso à conta na barra inferior das outras rotas', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/wallets')
    await page
      .getByRole('navigation', { name: 'Navegação mobile', exact: true })
      .getByRole('link', { name: 'Minha conta', exact: true })
      .click()
    await expect(page).toHaveURL('/profile')
    await expect(
      page
        .getByRole('main')
        .getByRole('heading', { name: 'Perfil do colecionador' }),
    ).toBeVisible()
  })

  test('mantém conteúdos e diálogos acessíveis em 320px com títulos longos em inglês', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.addInitScript(() => localStorage.setItem('kurio-language', 'en'))
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    const menu = page.getByRole('dialog', { name: 'Menu', exact: true })
    await menu
      .getByRole('combobox', { name: 'Language', exact: true })
      .scrollIntoViewIfNeeded()
    await expect(
      menu.getByRole('combobox', { name: 'Language', exact: true }),
    ).toBeInViewport()
    await page.keyboard.press('Escape')
    await page.goto('/nfts/golden-frequency-071')
    await expect(
      page.getByRole('heading', { name: 'Golden Frequency #071', exact: true }),
    ).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.goto('/nfts/inexistente')
    await expect(
      page.getByRole('heading', { name: 'NFT unavailable', level: 1 }),
    ).toBeVisible()
    await expect(
      page.getByRole('combobox', { name: 'Language', exact: true }),
    ).toBeVisible()
  })
})
