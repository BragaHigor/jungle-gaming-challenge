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
    await expect(page.getByRole('link', { name: /^COMPRAR/ })).toBeVisible()
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
