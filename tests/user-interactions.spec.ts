import { test, expect, type Page } from '@playwright/test'
import { visitWithAccount } from './helpers/auth'
import { visit } from './helpers/navigation'
import { seedWallets, fillWallet, fillProfile } from './helpers/account'
import { cartRequest, seedCart } from './helpers/cart'

async function accountWallets(page: Page) {
  await visitWithAccount(page, '/profile')
  await seedWallets(page)
  await visit(page, '/wallets')
}
const nickname = (page: Page) =>
  page.getByRole('textbox', { name: 'Apelido da carteira', exact: true })

test('mantém o foco e o texto completo ao corrigir campos inválidos de carteira e perfil', async ({
  page,
}) => {
  await visitWithAccount(page, '/wallets')
  await page
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  const name = page.getByRole('textbox', {
    name: 'Nome de exibição',
    exact: true,
  })
  await expect(name).toBeFocused()
  await name.pressSequentially('Alex Silva', { delay: 30 })
  await expect(name).toBeFocused()
  await expect(name).toHaveValue('Alex Silva')
  await visit(page, '/profile')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  const ens = page.getByRole('textbox', { name: 'Nome ENS', exact: true })
  await expect(ens).toBeFocused()
  await ens.pressSequentially('alexsilva.eth', { delay: 30 })
  await expect(ens).toBeFocused()
  await expect(ens).toHaveValue('alexsilva.eth')
})

test('cancelar a edição restaura a carteira selecionada sem trocar para a principal', async ({
  page,
}) => {
  await accountWallets(page)
  const selected = page.getByRole('button', {
    name: 'Editar nova.kurio.eth',
    exact: true,
  })
  await selected.click()
  await nickname(page).fill('Rascunho da reserva')
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(nickname(page)).toHaveValue('nova.kurio.eth')
  await expect(selected).toHaveAttribute('aria-pressed', 'true')
  expect(
    (await cartRequest(page, '/wallets')).body.find(
      (wallet: { primary: boolean }) => !wallet.primary,
    ).label,
  ).toBe('nova.kurio.eth')
})

test('avisa antes de perder o rascunho ao trocar de carteira e permite continuar editando', async ({
  page,
}) => {
  await accountWallets(page)
  const main = page.getByRole('button', {
    name: 'Editar Principal',
    exact: true,
  })
  const reserve = page.getByRole('button', {
    name: 'Editar nova.kurio.eth',
    exact: true,
  })
  await reserve.click()
  await nickname(page).fill('Reserva em edição')
  await main.click()
  const dialog = page.getByRole('dialog', {
    name: 'Alterações não salvas',
    exact: true,
  })
  await expect(dialog).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Continuar editando', exact: true })
    .click()
  await expect(nickname(page)).toHaveValue('Reserva em edição')
  await main.click()
  await dialog
    .getByRole('button', { name: 'Descartar e continuar', exact: true })
    .click()
  await expect(nickname(page)).toHaveValue('Principal')
  await reserve.click()
  await expect(nickname(page)).toHaveValue('nova.kurio.eth')
})

test('avisa antes de trocar de página com alterações e respeita a escolha do usuário', async ({
  page,
}) => {
  await visitWithAccount(page, '/profile')
  const field = page.getByRole('textbox', {
    name: 'Nome de exibição',
    exact: true,
  })
  await field.fill('Perfil não salvo')
  const link = page
    .getByRole('navigation', { name: 'Navegação da conta', exact: true })
    .getByRole('link', { name: 'Carteiras', exact: true })
  await link.click()
  const dialog = page.getByRole('dialog', {
    name: 'Alterações não salvas',
    exact: true,
  })
  await dialog
    .getByRole('button', { name: 'Continuar editando', exact: true })
    .click()
  await expect(page).toHaveURL('/profile')
  await expect(field).toHaveValue('Perfil não salvo')
  await link.click()
  await dialog
    .getByRole('button', { name: 'Descartar e continuar', exact: true })
    .click()
  await expect(page).toHaveURL('/wallets')
  expect((await cartRequest(page, '/profile')).body.displayName).toBe(
    'Colecionador',
  )
  const walletName = page.getByRole('textbox', {
    name: 'Nome de exibição',
    exact: true,
  })
  await walletName.fill('Carteira não salva')
  await page
    .getByRole('navigation', { name: 'Navegação da conta', exact: true })
    .getByRole('link', { name: 'Dados do perfil', exact: true })
    .click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL('/wallets')
  await expect(walletName).toHaveValue('Carteira não salva')
})

test('logout encerra a sessão mesmo com rascunho não salvo', async ({
  page,
}) => {
  await visitWithAccount(page, '/profile')
  await page
    .getByRole('textbox', { name: 'Nome de exibição', exact: true })
    .fill('Não salvar')
  await page
    .getByRole('button', { name: 'Sair', exact: true })
    .filter({ visible: true })
    .first()
    .click()
  await expect(page).toHaveURL('/')
  await expect(
    page.getByRole('dialog', { name: 'Alterações não salvas', exact: true }),
  ).toHaveCount(0)
  expect(
    await page.evaluate(() => sessionStorage.getItem('kurio-session')),
  ).toBeNull()
})

test('salvar preferência não anuncia que os campos editados da carteira foram salvos', async ({
  page,
}) => {
  await accountWallets(page)
  const name = page.getByRole('textbox', {
    name: 'Nome de exibição',
    exact: true,
  })
  await name.fill('Nome ainda em rascunho')
  await page
    .getByRole('checkbox', { name: 'Igual à carteira principal', exact: true })
    .check()
  await expect(
    page.getByText(
      'Preferência de uso salva. As alterações no formulário ainda não foram salvas.',
      { exact: true },
    ),
  ).toBeVisible()
  expect(
    (await cartRequest(page, '/wallets')).body.find(
      (wallet: { primary: boolean }) => wallet.primary,
    ).draft.displayName,
  ).toBe('Colecionador')
  await expect(name).toHaveValue('Nome ainda em rascunho')
  await page
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  await expect(
    page.getByText('Alterações salvas.', { exact: true }),
  ).toBeVisible()
  expect(
    (await cartRequest(page, '/wallets')).body.find(
      (wallet: { primary: boolean }) => wallet.primary,
    ).draft.displayName,
  ).toBe('Nome ainda em rascunho')
})

test('checkout sem carteira orienta cadastrar sem exibir erro de carrinho', async ({
  page,
}) => {
  await visitWithAccount(page, '/profile')
  await seedCart(page)
  await visit(page, '/checkout')
  await expect(
    page.getByText('Cadastre uma carteira para continuar.', { exact: false }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Gerenciar carteiras', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Revisar compra', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByText(
      'Confira ou recalcule os valores no carrinho antes de revisar a compra.',
      { exact: true },
    ),
  ).toHaveCount(0)
})

test('trocar de carteira sincroniza provedor e taxa e restaura a última selecionada', async ({
  page,
  isMobile,
}) => {
  await visitWithAccount(page, '/profile')
  await seedWallets(page)
  const wallets = (await cartRequest(page, '/wallets')).body
  const reserve = wallets.find(
    (wallet: { primary: boolean }) => !wallet.primary,
  )
  expect(
    (
      await cartRequest(page, `/wallets/${reserve.id}`, 'PATCH', {
        primary: false,
        sameAsPrimary: false,
        version: reserve.version,
        draft: { ...reserve.draft, walletType: 'WalletConnect' },
      })
    ).status,
  ).toBe(200)
  await seedCart(page)
  await visit(page, '/checkout')
  if (isMobile) await page.getByRole('radio', { name: /Reserva/ }).check()
  else
    await page
      .getByRole('combobox', { name: 'Carteiras disponíveis', exact: true })
      .selectOption(reserve.id)
  await expect(
    page.getByRole('radio', { name: 'WalletConnect', exact: true }),
  ).toBeChecked()
  await expect(
    page.getByRole('combobox', { name: 'Rede', exact: true }),
  ).toHaveValue('Polygon')
  await expect(
    page
      .getByText('26.832 ETH', { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible()
  const other = page.getByRole('checkbox', {
    name: 'Usar outra carteira?',
    exact: true,
  })
  await other.check()
  await expect(
    page.getByRole('textbox', { name: 'Endereço da carteira', exact: true }),
  ).toHaveValue('')
  await other.uncheck()
  await expect(
    page.getByRole('textbox', { name: 'Endereço da carteira', exact: true }),
  ).toHaveValue(reserve.draft.address)
  await expect(
    page.getByRole('combobox', { name: 'Rede', exact: true }),
  ).toHaveValue('Polygon')
  if (isMobile)
    await expect(page.getByRole('radio', { name: /Reserva/ })).toBeChecked()
  else
    await expect(
      page.getByRole('combobox', {
        name: 'Carteiras disponíveis',
        exact: true,
      }),
    ).toHaveValue(reserve.id)
})

test('atualizar dados de carteira durante o checkout oferece uma ação de recuperação', async ({
  page,
}) => {
  await page.clock.install()
  await visitWithAccount(page, '/checkout')
  const main = (await cartRequest(page, '/wallets')).body.find(
    (wallet: { primary: boolean }) => wallet.primary,
  )
  await page
    .getByRole('textbox', { name: 'Endereço da carteira', exact: true })
    .waitFor()
  expect(
    (
      await cartRequest(page, `/wallets/${main.id}`, 'PATCH', {
        primary: true,
        sameAsPrimary: false,
        version: main.version,
        draft: {
          ...main.draft,
          address: '0x3333333333333333333333333333333333333333',
        },
      })
    ).status,
  ).toBe(200)
  await page.clock.fastForward(31000)
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')))
  await expect(
    page.getByRole('button', {
      name: 'Carregar carteira atualizada',
      exact: true,
    }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Carregar carteira atualizada', exact: true })
    .click()
  await expect(
    page.getByRole('textbox', { name: 'Endereço da carteira', exact: true }),
  ).toHaveValue('0x3333333333333333333333333333333333333333')
  await expect(
    page.getByRole('button', {
      name: 'Carregar carteira atualizada',
      exact: true,
    }),
  ).toHaveCount(0)
})

test('cancelar o cadastro secundário não cria nem altera carteira existente', async ({
  page,
}) => {
  await visitWithAccount(page, '/wallets')
  await fillWallet(page)
  await page
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  await expect(
    page.getByText('Alterações salvas.', { exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Adicionar carteira secundária', exact: true })
    .click()
  await nickname(page).fill('Não criar')
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(nickname(page)).toHaveValue('Principal')
  expect((await cartRequest(page, '/wallets')).body).toHaveLength(1)
})

test('expiração de sessão não fica presa no aviso de rascunho não salvo', async ({
  page,
}) => {
  await visitWithAccount(page, '/profile')
  await fillProfile(page)
  expect(
    (
      await cartRequest(page, '/demo/reset', 'POST', {
        scenario: 'session-expired',
      })
    ).status,
  ).toBe(200)
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === '/login' &&
      url.searchParams.get('redirect') === '/profile' &&
      url.searchParams.get('reason') === 'expired',
  )
  await expect(
    page.getByRole('dialog', { name: 'Alterações não salvas', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible()
})

test('um avatar inválido não mantém mensagem de salvamento nem substitui a imagem persistida', async ({
  page,
}) => {
  await visitWithAccount(page, '/profile')
  await fillProfile(page)
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(
    page.getByText('Alterações salvas.', { exact: true }),
  ).toBeVisible()
  await page
    .getByLabel('Escolher imagem do avatar', { exact: true })
    .setInputFiles({
      name: 'arquivo.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('inválido'),
    })
  await expect(
    page.getByText('Escolha uma imagem JPG, PNG ou WebP.', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Alterações salvas.', { exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Salvar', exact: true }),
  ).toBeDisabled()
  expect((await cartRequest(page, '/profile')).body.avatar).toBeNull()
  await page.getByRole('button', { name: 'Remover', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Salvar', exact: true }),
  ).toBeEnabled()
})

test('identifica a carteira pelo endereço quando o apelido repete o título', async ({
  page,
  isMobile,
}) => {
  await visitWithAccount(page, '/checkout')
  if (isMobile) {
    const primary = page.getByRole('radio', { name: /^Principal/ })
    await expect(primary).toHaveAccessibleName(/Principal 0xA91F…E82C/)
    await expect(primary).not.toHaveAccessibleName(/Principal Principal/)
    return
  }
  const wallets = page.getByRole('combobox', {
    name: 'Carteiras disponíveis',
    exact: true,
  })
  await expect(
    wallets.locator('option').filter({ hasText: /^Principal/ }),
  ).toHaveText('Principal · 0xA91F…E82C')
})
