import { test, expect } from '@playwright/test'
import path from 'node:path'
import { visit } from './helpers/navigation'
import { signInFixture, visitWithAccount } from './helpers/auth'
import { cartRequest, seedCart } from './helpers/cart'
import { fillProfile, fillWallet, walletDraft } from './helpers/account'
import { readMockStorage } from './helpers/storage'

const profileSave = {
  displayName: 'Alex Silva',
  username: 'alexsilva',
  email: 'alex@example.com',
  ens: 'alexsilva.eth',
  walletNickname: 'Minha carteira',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  avatar: null,
}

test('salva dados e avatar, preserva no refresh e persiste a remoção', async ({
  page,
}) => {
  await visitWithAccount(page, '/profile')
  await fillProfile(page)
  await page
    .getByLabel('Escolher imagem do avatar', { exact: true })
    .setInputFiles(
      path.join(process.cwd(), 'public/images/nft-artwork-01.webp'),
    )
  const preview = page.getByRole('img', {
    name: 'Prévia do avatar selecionado',
    exact: true,
  })
  await expect(preview).toBeVisible()
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(
    page.getByText('Alterações salvas.', { exact: true }),
  ).toBeVisible()
  const source = await preview.getAttribute('src')
  expect(source).toMatch(/^data:image\/webp;base64,/)
  await page.reload()
  await expect(
    page.getByRole('textbox', { name: 'Nome de exibição', exact: true }),
  ).toHaveValue('Alex Silva')
  await expect(preview).toHaveAttribute('src', source!)
  expect((await cartRequest(page, '/session')).body.user.email).toBe(
    'alex@example.com',
  )
  await page.getByRole('button', { name: 'Remover', exact: true }).click()
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(
    page.getByText('Alterações salvas.', { exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(preview).toHaveCount(0)
  expect((await cartRequest(page, '/profile')).body.avatar).toBeNull()
})

test('valida a senha atual, impede salvamento parcial e troca as credenciais sem armazená-las em claro', async ({
  page,
}) => {
  await visitWithAccount(page, '/profile')
  await fillProfile(page)
  await page.getByLabel('Senha atual', { exact: true }).fill('Incorreta123')
  await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha2026')
  await page
    .getByLabel('Confirmar nova senha', { exact: true })
    .fill('NovaSenha2026')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(
    page.getByText('A senha atual está incorreta.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('Senha atual', { exact: true })).toBeFocused()
  expect((await cartRequest(page, '/profile')).body.displayName).toBe(
    'Colecionador',
  )
  await page.getByLabel('Senha atual', { exact: true }).fill('Kurio@2026')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(
    page.getByText('Alterações salvas.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('Nova senha', { exact: true })).toHaveValue('')
  expect(
    (
      await cartRequest(page, '/auth/login', 'POST', {
        email: 'alex@example.com',
        password: 'Kurio@2026',
      })
    ).status,
  ).toBe(401)
  expect(
    (
      await cartRequest(page, '/auth/login', 'POST', {
        email: 'alex@example.com',
        password: 'NovaSenha2026',
      })
    ).status,
  ).toBe(200)
  const stored = JSON.stringify(await readMockStorage(page))
  expect(stored).not.toContain('NovaSenha2026')
  expect(stored).not.toContain('Kurio@2026')
})

test('apresenta conflito de e-mail, conserva o rascunho em falha remota e permite salvar novamente', async ({
  page,
}) => {
  await visitWithAccount(page, '/profile')
  await fillProfile(page)
  const email = page.getByRole('textbox', { name: 'E-mail', exact: true })
  await email.fill('visitante@kurio.demo')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(
    page.getByText('Este e-mail já está cadastrado.', { exact: true }),
  ).toBeVisible()
  await email.fill('alex@example.com')
  await cartRequest(page, '/demo/reset', 'POST', {
    scenario: 'account-write-failure',
  })
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível salvar.',
  )
  await expect(email).toHaveValue('alex@example.com')
  expect((await cartRequest(page, '/profile')).body.email).toBe(
    'colecionador@kurio.demo',
  )
  await cartRequest(page, '/demo/reset', 'POST', { scenario: 'account-ready' })
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(
    page.getByText('Alterações salvas.', { exact: true }),
  ).toBeVisible()
})

test('cadastra e edita carteiras principal e secundária e as disponibiliza no pagamento', async ({
  page,
}) => {
  await visitWithAccount(page, '/wallets')
  await fillWallet(page, { walletNickname: 'Principal Alex' })
  await page
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  await expect(
    page.getByText('Alterações salvas.', { exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Adicionar carteira secundária', exact: true })
    .click()
  await fillWallet(page, {
    walletNickname: 'Reserva Alex',
    network: 'Solana',
    address: '11111111111111111111111111111111',
  })
  await page
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Editar Reserva Alex', exact: true }),
  ).toBeVisible()
  await page.reload()
  await page
    .getByRole('button', { name: 'Editar Reserva Alex', exact: true })
    .click()
  await expect(
    page.getByRole('combobox', { name: 'Rede', exact: true }),
  ).toHaveValue('Solana')
  await page
    .getByRole('textbox', { name: 'Apelido da carteira', exact: true })
    .fill('Reserva editada')
  await page
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Editar Reserva editada', exact: true }),
  ).toBeVisible()
  const same = page.getByRole('checkbox', {
    name: 'Igual à carteira principal',
    exact: true,
  })
  await same.check()
  await expect(
    page.getByText('Preferência de uso da carteira salva.', { exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(same).toBeChecked()
  await same.uncheck()
  await expect(
    page.getByText('Preferência de uso da carteira salva.', { exact: true }),
  ).toBeVisible()
  await seedCart(page)
  await visit(page, '/checkout')
  if ((page.viewportSize()?.width ?? 0) < 700) {
    await expect(
      page.getByRole('radio', { name: /Reserva.*Reserva editada/ }),
    ).toBeVisible()
  } else {
    await expect(
      page
        .getByRole('combobox', { name: 'Carteiras disponíveis', exact: true })
        .getByRole('option'),
    ).toContainText([
      'Selecione uma carteira',
      'Principal · Principal Alex',
      'Reserva · Reserva editada',
    ])
  }
})

test('rejeita carteiras inválidas na API, duplicatas, versão antiga e escrita em carteira de outro usuário', async ({
  page,
}) => {
  await visitWithAccount(page, '/wallets')
  const input = { draft: walletDraft, primary: true, sameAsPrimary: false }
  expect(
    (await cartRequest(page, '/wallets', 'POST', { ...input, primary: false }))
      .status,
  ).toBe(422)
  expect(
    (
      await cartRequest(page, '/wallets', 'POST', {
        ...input,
        draft: { ...walletDraft, network: 'Solana' },
      })
    ).status,
  ).toBe(422)
  const saved = await cartRequest(page, '/wallets', 'POST', input)
  expect(saved.status).toBe(200)
  const wallet = saved.body[0]
  expect(
    (await cartRequest(page, '/wallets', 'POST', { ...input, primary: false }))
      .status,
  ).toBe(409)
  expect(
    (
      await cartRequest(page, `/wallets/${wallet.id}`, 'PATCH', {
        ...input,
        version: wallet.version + 1,
      })
    ).status,
  ).toBe(409)
  await signInFixture(page, 'visitante@kurio.demo')
  await visit(page, '/wallets')
  expect((await cartRequest(page, '/wallets')).body).toEqual([])
  expect(
    (
      await cartRequest(page, `/wallets/${wallet.id}`, 'PATCH', {
        ...input,
        version: wallet.version,
      })
    ).status,
  ).toBe(403)
  expect(
    (
      await cartRequest(page, '/wallets/missing', 'PATCH', {
        ...input,
        version: 1,
      })
    ).status,
  ).toBe(404)
})

test('preserva o rascunho da carteira em erro de validação remota e recupera após restaurar o cenário', async ({
  page,
}) => {
  await visitWithAccount(page, '/wallets')
  await fillWallet(page)
  await cartRequest(page, '/demo/reset', 'POST', {
    scenario: 'account-validation',
  })
  await page
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  await expect(
    page.getByRole('textbox', { name: 'E-mail', exact: true }),
  ).toHaveAttribute('aria-invalid', 'true')
  await expect(
    page.getByRole('textbox', { name: 'Apelido da carteira', exact: true }),
  ).toHaveValue('Principal')
  expect((await cartRequest(page, '/wallets')).body).toEqual([])
  await cartRequest(page, '/demo/reset', 'POST', { scenario: 'account-ready' })
  await page
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  await expect(
    page.getByText('Alterações salvas.', { exact: true }),
  ).toBeVisible()
})

test('protege a versão do perfil e rejeita avatar e campos injetados na requisição', async ({
  page,
}) => {
  await visitWithAccount(page, '/profile')
  const profile = (await cartRequest(page, '/profile')).body
  const input = { ...profileSave, version: profile.version }
  expect(
    (
      await cartRequest(page, '/profile', 'PATCH', {
        ...input,
        avatar: 'data:image/svg+xml;base64,PHN2Zz4=',
      })
    ).status,
  ).toBe(422)
  expect(
    (
      await cartRequest(page, '/profile', 'PATCH', {
        ...input,
        userId: 'collector-b',
      })
    ).status,
  ).toBe(422)
  expect((await cartRequest(page, '/profile', 'PATCH', input)).status).toBe(200)
  expect((await cartRequest(page, '/profile', 'PATCH', input)).status).toBe(409)
  await signInFixture(page, 'visitante@kurio.demo')
  await visit(page, '/profile')
  await expect(
    page.getByRole('textbox', { name: 'Nome de exibição', exact: true }),
  ).toHaveValue('Visitante')
  expect((await cartRequest(page, '/profile')).body.avatar).toBeNull()
})

test('mantém a preferência anterior quando falha ao usar a mesma carteira e evita gravações repetidas', async ({
  page,
}) => {
  await visitWithAccount(page, '/wallets')
  await fillWallet(page)
  await cartRequest(page, '/demo/reset', 'POST', { scenario: 'account-slow' })
  const writes: string[] = []
  page.on('request', (request) => {
    if (request.url().endsWith('/api/wallets') && request.method() === 'POST')
      writes.push(request.url())
  })
  await page
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .dblclick()
  await expect(
    page.getByText('Alterações salvas.', { exact: true }),
  ).toBeVisible()
  expect(writes).toHaveLength(1)
  await cartRequest(page, '/demo/reset', 'POST', {
    scenario: 'account-write-failure',
  })
  const same = page.getByRole('checkbox', {
    name: 'Igual à carteira principal',
    exact: true,
  })
  await same.check()
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível salvar.',
  )
  await expect(same).not.toBeChecked()
})

test('a troca de senha revoga outras sessões sem encerrar a sessão que salvou', async ({
  page,
  context,
}) => {
  await visitWithAccount(page, '/profile')
  const other = await context.newPage()
  await visit(other, '/')
  await signInFixture(other)
  const profile = (await cartRequest(page, '/profile')).body
  const changed = await cartRequest(page, '/profile', 'PATCH', {
    ...profileSave,
    version: profile.version,
    currentPassword: 'Kurio@2026',
    newPassword: 'NovaSenha2026',
    confirmPassword: 'NovaSenha2026',
  })
  expect(changed.status).toBe(200)
  expect((await cartRequest(page, '/session')).status).toBe(200)
  expect((await cartRequest(other, '/session')).status).toBe(401)
  await other.close()
})

test('o painel de demonstração reproduz falha remota e restaura sem apagar o rascunho', async ({
  page,
}) => {
  await visitWithAccount(page, '/profile')
  await fillProfile(page)
  const trigger = page
    .getByRole('button', { name: 'Demonstração', exact: true })
    .filter({ visible: true })
    .first()
  await trigger.click()
  const dialog = page.getByRole('dialog', {
    name: 'Controle da demonstração',
    exact: true,
  })
  await dialog
    .getByRole('combobox', { name: 'Cenário', exact: true })
    .selectOption('account-write-failure')
  await dialog
    .getByRole('button', { name: 'Aplicar cenário', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível salvar.',
  )
  await trigger.click()
  await dialog
    .getByRole('combobox', { name: 'Cenário', exact: true })
    .selectOption('account-ready')
  await dialog
    .getByRole('button', { name: 'Aplicar cenário', exact: true })
    .click()
  await expect(
    page.getByRole('textbox', { name: 'Nome de exibição', exact: true }),
  ).toHaveValue('Alex Silva')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(
    page.getByText('Alterações salvas.', { exact: true }),
  ).toBeVisible()
})

test('preserva o rascunho diante de edição concorrente e carrega a versão salva por escolha do usuário', async ({
  page,
}) => {
  await visitWithAccount(page, '/profile')
  await fillProfile(page)
  const profile = (await cartRequest(page, '/profile')).body
  expect(
    (
      await cartRequest(page, '/profile', 'PATCH', {
        ...profileSave,
        displayName: 'Alterado em outra aba',
        version: profile.version,
      })
    ).status,
  ).toBe(200)
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Os dados foram alterados em outra aba.',
  )
  const name = page.getByRole('textbox', {
    name: 'Nome de exibição',
    exact: true,
  })
  await expect(name).toHaveValue('Alex Silva')
  await page
    .getByRole('button', { name: 'Carregar versão salva', exact: true })
    .click()
  await expect(name).toHaveValue('Alterado em outra aba')
  await name.fill('Nova edição revisada')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(
    page.getByText('Alterações salvas.', { exact: true }),
  ).toBeVisible()
})

test('adicionar uma segunda carteira preserva a primeira e permite alternar a edição', async ({
  page,
}) => {
  await visitWithAccount(page, '/wallets')
  await fillWallet(page, { walletNickname: 'Minha principal' })
  await page
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  await expect(
    page.getByText('Alterações salvas.', { exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Adicionar carteira secundária', exact: true })
    .click()
  await fillWallet(page, {
    walletNickname: 'Minha reserva',
    network: 'Polygon',
    address: '0x2222222222222222222222222222222222222222',
  })
  await page
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  const principal = page.getByRole('button', {
    name: 'Editar Minha principal',
    exact: true,
  })
  const reserva = page.getByRole('button', {
    name: 'Editar Minha reserva',
    exact: true,
  })
  await expect(principal).toBeVisible()
  await expect(reserva).toBeVisible()
  await expect(page.getByText('Minha reserva', { exact: true })).toHaveCount(1)
  const usage = page.getByRole('region', {
    name: 'Uso da carteira secundária',
    exact: true,
  })
  await expect(usage).toBeVisible()
  await expect(usage.getByText('Minha reserva', { exact: true })).toHaveCount(0)
  await expect(usage.getByRole('button')).toHaveCount(0)
  expect((await cartRequest(page, '/wallets')).body).toHaveLength(2)
  await principal.click()
  await expect(
    page.getByRole('textbox', { name: 'Apelido da carteira', exact: true }),
  ).toHaveValue('Minha principal')
  await expect(principal).toHaveAttribute('aria-pressed', 'true')
  await reserva.click()
  await expect(
    page.getByRole('textbox', { name: 'Apelido da carteira', exact: true }),
  ).toHaveValue('Minha reserva')
  await expect(reserva).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByRole('textbox', { name: 'Apelido da carteira', exact: true })
    .fill('Reserva editada')
  await page
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  await expect(
    page.getByText('Alterações salvas.', { exact: true }),
  ).toBeVisible()
  await page.reload()
  await page
    .getByRole('button', { name: 'Editar Reserva editada', exact: true })
    .click()
  await expect(
    page.getByRole('textbox', { name: 'Apelido da carteira', exact: true }),
  ).toHaveValue('Reserva editada')
  expect(
    (await cartRequest(page, '/wallets')).body.find(
      (wallet: { primary: boolean }) => wallet.primary,
    ).label,
  ).toBe('Minha principal')
})
