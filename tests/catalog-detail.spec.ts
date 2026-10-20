import { test, expect, type Page } from '@playwright/test'

async function openFilters(page: Page) {
  if (
    await page.getByRole('button', { name: 'Filtros', exact: true }).isVisible()
  ) {
    await page.getByRole('button', { name: 'Filtros', exact: true }).click()
    return page.getByRole('dialog', { name: 'Filtros', exact: true })
  }
  return page.getByRole('complementary', { name: 'Filtros', exact: true })
}

async function closeFilters(page: Page) {
  if (await page.getByRole('dialog', { name: 'Filtros', exact: true }).count())
    await page.getByRole('button', { name: /^Ver resultados/ }).click()
}

test.describe('Visual do catálogo e dos detalhes', () => {
  test('busca por nome, mostra vazio e permite limpar os filtros', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/')
    if (isMobile)
      await page
        .getByRole('searchbox', { name: 'Buscar NFTs' })
        .fill('inexistente')
    else {
      await page
        .getByRole('button', { name: 'Buscar NFTs', exact: true })
        .click()
      await page
        .getByRole('searchbox', { name: 'Buscar NFTs' })
        .fill('inexistente')
      await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    }
    await expect(
      page.getByRole('heading', { name: 'Nenhum NFT encontrado' }),
    ).toBeVisible()
    await page
      .locator('.catalog-state')
      .getByRole('button', { name: 'Limpar filtros' })
      .click()
    await expect(page.locator('.catalog-grid article')).toHaveCount(9)
  })

  test('combina rede e categoria, mantém filtros ao fechar e reinicia a paginação', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Página 2', exact: true }).click()
    await expect(
      page.locator('.catalog-pagination [aria-current="page"]'),
    ).toHaveText('2')
    const filters = await openFilters(page)
    await filters.getByRole('checkbox', { name: /^Música/ }).check()
    await filters.getByRole('checkbox', { name: /^Polygon/ }).check()
    await closeFilters(page)
    await expect(page.locator('.catalog-grid article')).toHaveCount(4)
    await expect(page.locator('.catalog-grid article').first()).toContainText(
      'Golden Frequency',
    )
    await expect(
      page.locator('.catalog-pagination [aria-current="page"]'),
    ).toHaveText('1')
    const reopened = await openFilters(page)
    await expect(
      reopened.getByRole('checkbox', { name: /^Música/ }),
    ).toBeChecked()
    await reopened.getByRole('button', { name: 'Limpar filtros' }).click()
    await closeFilters(page)
    await expect(page.locator('.catalog-grid article')).toHaveCount(9)
  })

  test('ordena por preço e aplica faixa sem cruzar os limites', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/')
    const filters = await openFilters(page)
    const sort = isMobile
      ? filters.getByRole('combobox', { name: 'Ordenar por:' })
      : page.getByRole('combobox', { name: 'Ordenar por:' })
    await sort.selectOption('lowest')
    await closeFilters(page)
    await expect(page.locator('.catalog-grid article').first()).toContainText(
      '0.39 ETH',
    )
    const opened = await openFilters(page)
    const maximum = opened.getByRole('slider', {
      name: 'Preço máximo',
      exact: true,
    })
    await maximum.fill('50')
    await opened.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await closeFilters(page)
    await expect(page.locator('.catalog-grid article')).toHaveCount(4)
    for (const price of await page
      .locator('.catalog-grid .nft-card__price')
      .allTextContents())
      expect(price.trim()).toBe('0.39 ETH')
  })

  test('muda a arte do destaque e navega entre páginas do catálogo', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('button', { name: 'Próxima página', exact: true })
      .click()
    await expect(page.locator('.catalog-grid article').first()).toContainText(
      '#600',
    )
    await page
      .getByRole('button', { name: 'Página anterior', exact: true })
      .click()
    await expect(page.locator('.catalog-grid article').first()).toContainText(
      '#042',
    )
    if (
      await page.getByRole('button', { name: 'Mostrar destaque 2' }).isVisible()
    ) {
      await page.getByRole('button', { name: 'Mostrar destaque 2' }).click()
      await expect(
        page.locator('.catalog-hero__art > img').first(),
      ).toHaveAttribute('src', '/images/nft-artwork-03.webp')
    }
  })

  test('amplia a galeria, seleciona recorte e retorna o foco', async ({
    page,
  }) => {
    await page.goto('/nfts/emerald-ape-042')
    const trigger = page.getByRole('button', {
      name: 'Ampliar Emerald Ape #042',
    })
    await trigger.click()
    const dialog = page.getByRole('dialog', {
      name: 'Emerald Ape #042',
      exact: true,
    })
    await dialog
      .getByRole('button', { name: 'Detalhe do rosto', exact: true })
      .click()
    await expect(
      dialog.getByRole('button', { name: 'Detalhe do rosto', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(dialog.locator('.gallery-zoom img')).toHaveCSS(
      'transform',
      'matrix(1.6, 0, 0, 1.6, 0, 0)',
    )
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
  })

  test('limita a quantidade pela edição e permite navegar pelas abas com teclado', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/nfts/emerald-ape-042')
    const increase = page.getByRole('button', {
      name: 'Aumentar quantidade',
      exact: true,
    })
    await increase.click()
    await increase.click()
    if (isMobile)
      await expect(page.locator('.mobile-purchase .mobile-price')).toHaveText(
        '3.57 ETH',
      )
    await page.getByRole('button', { name: '1/1', exact: true }).click()
    await expect(increase).toBeDisabled()
    await expect(
      page.getByRole('button', { name: 'Diminuir quantidade', exact: true }),
    ).toBeDisabled()
    await page.getByRole('button', { name: '1/10', exact: true }).click()
    await increase.click()
    await expect(
      page.getByRole('status', { name: 'Quantidade', exact: true }),
    ).toHaveText('2')
    const description = page.getByRole('tab', {
      name: 'Detalhes do NFT',
      exact: true,
    })
    await description.focus()
    await page.keyboard.press('ArrowRight')
    await expect(
      page.getByRole('tab', {
        name: 'Avaliações de colecionadores (19)',
        exact: true,
      }),
    ).toBeFocused()
    await page.keyboard.press('End')
    await expect(
      page.getByRole('tabpanel', {
        name: 'Avaliações de colecionadores (19)',
        exact: true,
      }),
    ).toContainText('19 avaliações')
  })

  test('renderiza estados visuais e recupera de erro sem simular uma compra', async ({
    page,
  }) => {
    await page.goto('/?view=empty')
    await expect(
      page.getByRole('heading', { name: 'Nenhum NFT encontrado' }),
    ).toBeVisible()
    await page.goto('/?view=loading')
    await expect(
      page
        .getByRole('status', { name: '', exact: true })
        .filter({ hasText: 'Carregando NFTs' }),
    ).toHaveCount(1)
    await expect(page.locator('.catalog-main [aria-busy="true"]')).toBeVisible()
    await page.goto('/?view=error')
    await page
      .getByRole('button', { name: 'Tentar novamente', exact: true })
      .click()
    await expect(page.locator('.catalog-grid article')).toHaveCount(9)
    await page.goto('/nfts/inexistente')
    await expect(
      page.getByRole('heading', { name: 'NFT indisponível', exact: true }),
    ).toBeVisible()
    await page
      .getByRole('button', { name: 'Tentar novamente', exact: true })
      .click()
    await expect(page).toHaveURL('/')
  })

  for (const width of [390, 414, 768, 1440]) {
    test(`mantém o detalhe traduzido e sem overflow em ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/nfts/emerald-ape-042')
      if (width >= 700 && width < 1100)
        await page
          .getByRole('button', { name: 'Abrir menu', exact: true })
          .click()
      await page
        .getByRole('combobox', { name: 'Idioma', exact: true })
        .selectOption('en')
      if (width >= 700 && width < 1100) await page.keyboard.press('Escape')
      await expect(
        page.getByRole('tab', { name: 'NFT details', exact: true }),
      ).toBeVisible()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
      await expect(page.getByRole('link', { name: /^BUY/ })).toBeVisible()
    })
  }
})
