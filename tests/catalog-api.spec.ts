import { expect, test, type Page } from '@playwright/test'
import { visit } from './helpers/navigation'
import { setScenario } from './helpers/scenarios'

async function search(page: Page, value: string, mobile: boolean) {
  if (!mobile)
    await page.getByRole('button', { name: 'Buscar NFTs', exact: true }).click()
  await page
    .getByRole('searchbox', { name: 'Buscar NFTs', exact: true })
    .fill(value)
  if (!mobile)
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
}

test.describe('Catálogo e detalhe integrados à API', () => {
  test('fecha o controle após aplicar e mostra o erro na página, com restauração', async ({
    page,
  }) => {
    await visit(page, '/')
    await expect(page.locator('.catalog-grid article')).toHaveCount(9)
    await page
      .getByRole('button', { name: 'Demonstração', exact: true })
      .click()
    const dialog = page.getByRole('dialog', {
      name: 'Controle da demonstração',
      exact: true,
    })
    await dialog
      .getByRole('combobox', { name: 'Cenário', exact: true })
      .selectOption('server-error')
    await dialog
      .getByRole('button', { name: 'Aplicar cenário', exact: true })
      .click()
    await expect(dialog).not.toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Não foi possível carregar os NFTs' }),
    ).toBeVisible()
    await page
      .getByRole('button', { name: 'Demonstração', exact: true })
      .click()
    await expect(
      dialog.getByRole('combobox', { name: 'Cenário', exact: true }),
    ).toHaveValue('server-error')
    await dialog
      .getByRole('button', { name: 'Restaurar demonstração', exact: true })
      .click()
    await expect(dialog).not.toBeVisible()
    await expect(page.locator('.catalog-grid article')).toHaveCount(9)
  })

  test('preserva os dados em falha de atualização em segundo plano e recupera por nova tentativa', async ({
    page,
  }) => {
    await visit(page, '/')
    await expect(page.locator('.catalog-grid article')).toHaveCount(9)
    await page
      .getByRole('button', { name: 'Demonstração', exact: true })
      .click()
    await expect(
      page.getByText('Tempo real conectado', { exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(
      page.getByText('Atualizando NFTs…', { exact: true }),
    ).toHaveCount(0)
    await page.clock.install()
    await page.clock.fastForward(31000)
    await setScenario(page, 'server-error')
    await page
      .locator('.catalog-grid article')
      .first()
      .getByRole('link')
      .first()
      .click()
    await expect(
      page.getByRole('heading', { name: 'Não foi possível carregar os NFTs' }),
    ).toBeVisible()
    await page.goBack()
    await expect(page.locator('.catalog-grid article')).toHaveCount(9)
    await expect(page.locator('main [role=alert]')).toContainText(
      'Os últimos dados recebidos continuam visíveis.',
    )
    await setScenario(page, 'default')
    await page
      .getByRole('button', { name: 'Tentar novamente', exact: true })
      .click()
    await expect(page.locator('main [role=alert]')).toHaveCount(0)
    await expect(page.locator('.catalog-grid article')).toHaveCount(9)
  })

  test('envia os parâmetros da URL ao REST e restaura filtro, página e histórico', async ({
    page,
  }) => {
    const requests: URL[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (url.pathname === '/api/nfts') requests.push(url)
    })
    await visit(page, '/?categories=music&networks=Polygon&sort=lowest')
    await expect(page.locator('.catalog-grid article')).toHaveCount(4)
    await expect(page.locator('.catalog-grid article').first()).toContainText(
      '0.59 ETH',
    )
    const sent = requests.find(
      (url) => url.searchParams.get('categories') === 'music',
    )!
    expect(sent.searchParams.get('networks')).toBe('Polygon')
    expect(sent.searchParams.get('sort')).toBe('lowest')
    await page.reload()
    await expect(page.locator('.catalog-grid article')).toHaveCount(4)
    await visit(page, '/?page=2')
    await expect(
      page.locator('.catalog-pagination [aria-current=page]'),
    ).toHaveText('2')
    await page.getByRole('button', { name: 'Página 3', exact: true }).click()
    await expect(
      page.locator('.catalog-pagination [aria-current=page]'),
    ).toHaveText('3')
    await page.goBack()
    await expect(
      page.locator('.catalog-pagination [aria-current=page]'),
    ).toHaveText('2')
    await page.goForward()
    await expect(
      page.locator('.catalog-pagination [aria-current=page]'),
    ).toHaveText('3')
  })

  test('busca pela API, reinicia a página e preserva a consulta no refresh', async ({
    page,
    isMobile,
  }) => {
    await visit(page, '/?page=3')
    await expect(page.locator('.catalog-grid article')).toHaveCount(9)
    await search(page, 'Sage', isMobile)
    await expect(page.locator('.catalog-grid article')).toHaveCount(4)
    await expect(
      page.locator('.catalog-pagination [aria-current=page]'),
    ).toHaveText('1')
    for (const card of await page
      .locator('.catalog-grid article')
      .allTextContents())
      expect(card).toContain('Sage')
    expect(new URL(page.url()).searchParams.get('q')).toBe('Sage')
    expect(new URL(page.url()).searchParams.has('page')).toBe(false)
    await page.reload()
    await expect(page.locator('.catalog-grid article')).toHaveCount(4)
  })

  test('descarta consulta antiga quando uma busca mais recente termina primeiro', async ({
    page,
    isMobile,
  }) => {
    await visit(page, '/')
    await setScenario(page, 'variable-latency')
    await page.reload()
    await expect(page.locator('.catalog-grid article')).toHaveCount(9)
    await page.clock.install()
    await search(page, 'Emerald', isMobile)
    await search(page, 'Sage', isMobile)
    await expect(page.locator('.catalog-grid article')).toHaveCount(4)
    await page.clock.fastForward(1500)
    for (const card of await page
      .locator('.catalog-grid article')
      .allTextContents())
      expect(card).toContain('Sage')
    expect(new URL(page.url()).searchParams.get('q')).toBe('Sage')
  })

  test('normaliza parâmetros inválidos e preserva os limites de preço da URL', async ({
    page,
  }) => {
    await visit(
      page,
      '/?page=-2&sort=invalid&categories=unknown&min=2&max=1&view=error',
    )
    await expect(page.locator('.catalog-grid article')).toHaveCount(9)
    await expect(
      page.locator('.catalog-pagination [aria-current=page]'),
    ).toHaveText('1')
    await expect(page.locator('main [role=alert]')).toHaveCount(0)
    await visit(page, '/?page=999')
    await expect(
      page.locator('.catalog-pagination [aria-current=page]'),
    ).toHaveText('4')
    expect(new URL(page.url()).searchParams.get('page')).toBe('4')
    await visit(page, '/?min=0.07&max=2')
    const mobileFilters = page.getByRole('button', {
      name: 'Filtros',
      exact: true,
    })
    if (await mobileFilters.isVisible()) await mobileFilters.click()
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    if (
      await page
        .getByRole('dialog', { name: 'Filtros', exact: true })
        .isVisible()
    )
      await page.getByRole('button', { name: /^Ver resultados/ }).click()
    expect(new URL(page.url()).searchParams.get('min')).toBe('0.07')
    await expect(page.locator('.catalog-grid article')).toHaveCount(9)
  })

  test('obtém edições do REST e impede compra e aumento da edição esgotada', async ({
    page,
  }) => {
    await visit(page, '/')
    await setScenario(page, 'sold-out')
    await visit(page, '/nfts/emerald-ape-042')
    await expect(
      page.getByRole('heading', { name: 'Emerald Ape #042', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Edição esgotada', exact: true }),
    ).toBeDisabled()
    await expect(
      page.getByRole('button', { name: 'Aumentar quantidade', exact: true }),
    ).toBeDisabled()
    await page.getByRole('button', { name: '1/1', exact: true }).click()
    await expect(page.getByRole('button', { name: /^COMPRAR/ })).toBeVisible()
    await expect(
      page.getByRole('status', { name: 'Quantidade', exact: true }),
    ).toHaveText('1')
    await expect(
      page.getByRole('button', { name: 'Aumentar quantidade', exact: true }),
    ).toBeDisabled()
  })

  test('mostra erro real do detalhe e permite tentar novamente sem mudar o identificador', async ({
    page,
  }) => {
    await visit(page, '/')
    await setScenario(page, 'malformed-response')
    await visit(page, '/nfts/emerald-ape-042')
    await expect(
      page.getByRole('heading', { name: 'Não foi possível carregar os NFTs' }),
    ).toBeVisible()
    await setScenario(page, 'default')
    await page
      .getByRole('button', { name: 'Tentar novamente', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Emerald Ape #042', exact: true }),
    ).toBeVisible()
    await expect(page).toHaveURL('/nfts/emerald-ape-042')
  })
})

test('preserva as contagens dos filtros durante novas consultas', async ({
  page,
  isMobile,
}) => {
  await visit(page, '/')
  await expect(page.locator('.catalog-grid article')).toHaveCount(9)
  if (isMobile)
    await page.getByRole('button', { name: 'Filtros', exact: true }).click()
  const filters = page
    .locator('.catalog-filters')
    .filter({ visible: true })
    .first()
  const counts = filters.locator('.filter-count')
  const initialCounts = await counts.allTextContents()
  expect(initialCounts.length).toBeGreaterThan(0)
  await filters.evaluate((root) => {
    const expected = [...root.querySelectorAll('.filter-count')].map(
      (node) => node.textContent,
    )
    const changes: string[][] = []
    Object.assign(window, { filterCountChanges: changes })
    new MutationObserver(() => {
      const current = [...root.querySelectorAll('.filter-count')].map(
        (node) => node.textContent ?? '',
      )
      if (JSON.stringify(current) !== JSON.stringify(expected))
        changes.push(current)
    }).observe(root, { childList: true, characterData: true, subtree: true })
  })
  await filters.getByRole('checkbox', { name: 'Arte digital' }).check()
  await expect(page).toHaveURL(
    (url) => url.searchParams.get('categories') === '["digitalArt"]',
  )
  await expect(page.locator('.catalog-grid article')).toHaveCount(8)
  await expect(counts).toHaveText(initialCounts)
  expect(
    await page.evaluate(() => Reflect.get(window, 'filterCountChanges')),
  ).toEqual([])
})

test('mantém os cards visíveis ao trocar filtros e páginas em rede lenta', async ({
  page,
}) => {
  await visit(page, '/')
  await expect(page.locator('.catalog-grid article')).toHaveCount(9)
  await setScenario(page, 'slow')
  const grid = page.locator('.catalog-grid')
  const firstCard = await grid.locator('article').first().textContent()
  await page.getByRole('button', { name: 'Em alta', exact: true }).click()
  await expect(grid).toHaveAttribute('aria-busy', 'true')
  await expect(grid.locator('article')).toHaveCount(9)
  expect(await grid.locator('article').first().textContent()).toBe(firstCard)
  await expect(
    page.getByRole('heading', { name: 'Não foi possível carregar os NFTs' }),
  ).toHaveCount(0)
  await expect(
    page.locator('.catalog-main > [aria-busy=true]:not(.catalog-grid)'),
  ).toHaveCount(0)
  await expect(grid).toHaveAttribute('aria-busy', 'false')
  await page.getByRole('button', { name: 'Todos os NFTs', exact: true }).click()
  await expect(grid).toHaveAttribute('aria-busy', 'false')
  await page.getByRole('button', { name: 'Página 2', exact: true }).click()
  await expect(grid).toHaveAttribute('aria-busy', 'true')
  await expect(grid.locator('article')).toHaveCount(9)
  await expect(grid).toHaveAttribute('aria-busy', 'false')
  await expect(page).toHaveURL((url) => url.searchParams.get('page') === '2')
})

test('altera as imagens entre páginas e mantém a arte da NFT no detalhe', async ({
  page,
}) => {
  await visit(page, '/')
  const grid = page.locator('.catalog-grid')
  await expect(grid.locator('article')).toHaveCount(9)
  const pageImages: string[][] = []
  for (let number = 1; number <= 4; number++) {
    if (number > 1)
      await page
        .getByRole('button', { name: `Página ${number}`, exact: true })
        .click()
    await expect(
      page.getByRole('button', { name: `Página ${number}`, exact: true }),
    ).toHaveAttribute('aria-current', 'page')
    await expect(grid).toHaveAttribute('aria-busy', 'false')
    const images = await grid
      .locator('img')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('src')!))
    expect(images).toHaveLength(9)
    for (const previous of pageImages) {
      images.forEach((image, index) => expect(image).not.toBe(previous[index]))
    }
    pageImages.push(images)
    await expect(grid.locator('img').first()).toBeVisible()
    expect(
      await grid
        .locator('img')
        .first()
        .evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
    ).toBe(true)
  }
  const image = grid.locator('img').first()
  const source = await image.getAttribute('src')
  const alt = await image.getAttribute('alt')
  await grid.locator('article').first().getByRole('link').first().click()
  await expect(page.locator('.nft-gallery__main img')).toHaveAttribute(
    'src',
    source!,
  )
  await expect(page.locator('.nft-gallery__main img')).toHaveAttribute(
    'alt',
    alt!,
  )
})

test('atualiza artes salvas anteriormente sem perder preço e versão', async ({
  page,
}) => {
  await visit(page, '/')
  await expect(page.locator('.catalog-grid article')).toHaveCount(9)
  const nftId = 'emerald-ape-042-600'
  await page.evaluate(async (id) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('kurio-mocks', 1)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const storage = request.result
        const transaction = storage.transaction('state', 'readwrite')
        const store = transaction.objectStore('state')
        const read = store.get('database')
        read.onsuccess = () => {
          const database = read.result
          const nft = database.nfts.find(
            (item: { id: string }) => item.id === id,
          )
          Object.assign(nft, {
            image: '/images/nft-artwork-01.webp',
            imageAltKey: 'emeraldAlt',
            price: '2.34',
            version: 9,
          })
          store.put(database, 'database')
        }
        transaction.oncomplete = () => {
          storage.close()
          resolve()
        }
        transaction.onabort = () => {
          storage.close()
          reject(transaction.error)
        }
      }
    })
  }, nftId)
  await page.reload()
  const nft = await page.evaluate(
    async (id) => (await fetch(`/api/nfts/${id}`)).json(),
    nftId,
  )
  expect(nft).toMatchObject({
    image: '/images/nft-artwork-02.webp',
    imageAltKey: 'sageAlt',
    price: '2.34',
    version: 9,
  })
})
