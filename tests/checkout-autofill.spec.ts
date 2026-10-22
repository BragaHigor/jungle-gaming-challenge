import { expect, test, type Page } from '@playwright/test'
import { visitWithAccount, signInFixture } from './helpers/auth'
import { cartRequest, seedCart } from './helpers/cart'
import { visit } from './helpers/navigation'
import { openDemo } from './helpers/demo'

const field = (page: Page, name: string) =>
  page.getByRole('textbox', { name, exact: true })

test('reutiliza o perfil salvo e os dados da carteira após navegar e atualizar', async ({
  page,
}) => {
  await visitWithAccount(page, '/checkout')
  const profile = (await cartRequest(page, '/profile')).body
  expect(
    (
      await cartRequest(page, '/profile', 'PATCH', {
        ...profile,
        displayName: 'Higor Braga',
        username: 'HigorBraga',
        email: 'higor@example.com',
        ens: 'higor.eth',
        walletNickname: 'Pessoal',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        id: undefined,
      })
    ).status,
  ).toBe(200)
  await visit(page, '/profile')
  await page
    .getByRole('link', { name: 'Carrinho', exact: true })
    .first()
    .click()
  await visit(page, '/checkout')
  for (const [name, value] of Object.entries({
    'Nome de exibição': 'Higor Braga',
    'Nome de usuário': 'HigorBraga',
    'E-mail': 'higor@example.com',
    'Nome ENS': 'higor.eth',
    'Nome do perfil': 'Minha coleção',
    'Código de indicação': 'KURIO',
    'Endereço da carteira': '0xA91F00000000000000000000000000000000E82C',
  }))
    await expect(field(page, name)).toHaveValue(value)
  await page.reload()
  await expect(field(page, 'Nome de usuário')).toHaveValue('HigorBraga')
})

test('mantém vazios os dados que o usuário ainda não cadastrou', async ({
  page,
}) => {
  await visitWithAccount(page, '/profile')
  await seedCart(page)
  await visit(page, '/checkout')
  await expect(field(page, 'Nome de usuário')).toHaveValue('colecionador')
  await expect(field(page, 'E-mail')).toHaveValue('colecionador@kurio.demo')
  for (const name of [
    'Nome ENS',
    'Nome do perfil',
    'Código de indicação',
    'Endereço da carteira',
  ])
    await expect(field(page, name)).toHaveValue('')
})

test('troca os dados da carteira e preserva campos editados pelo usuário', async ({
  page,
}) => {
  await visitWithAccount(page, '/checkout')
  const wallets = (await cartRequest(page, '/wallets')).body
  const reserve = wallets.find(
    (wallet: { primary: boolean }) => !wallet.primary,
  )
  expect(
    (
      await cartRequest(page, `/wallets/${reserve.id}`, 'PATCH', {
        draft: {
          ...reserve.draft,
          profileName: 'Coleção reserva',
          referral: 'RESERVA',
        },
        primary: false,
        sameAsPrimary: false,
        version: reserve.version,
      })
    ).status,
  ).toBe(200)
  await page.reload()
  await field(page, 'Código de indicação').fill('MEUCODIGO')
  if ((page.viewportSize()?.width ?? 0) < 700)
    await page.getByRole('radio', { name: /Reserva/ }).check()
  else
    await page
      .getByRole('combobox', { name: 'Carteiras disponíveis', exact: true })
      .selectOption(reserve.id)
  await expect(field(page, 'Nome do perfil')).toHaveValue('Coleção reserva')
  await expect(field(page, 'Código de indicação')).toHaveValue('MEUCODIGO')
  await expect(field(page, 'Nome de usuário')).toHaveValue('colecionador')
  await expect(field(page, 'Endereço da carteira')).toHaveValue(
    reserve.draft.address,
  )
})

test('não sobrescreve a digitação quando o perfil é reconciliado', async ({
  page,
}) => {
  await visitWithAccount(page, '/checkout')
  await field(page, 'Nome de exibição').fill('Nome desta compra')
  const { dialog } = await openDemo(page)
  await dialog
    .getByRole('button', { name: 'Interromper conexão', exact: true })
    .click()
  await dialog.getByRole('button', { name: 'Reconectar', exact: true }).click()
  await expect(
    dialog.getByText('Tempo real conectado', { exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(field(page, 'Nome de exibição')).toHaveValue('Nome desta compra')
})

test('troca de conta não reutiliza os dados do colecionador anterior', async ({
  page,
}) => {
  await visitWithAccount(page, '/checkout')
  await field(page, 'Nome de exibição').fill('Rascunho privado anterior')
  await cartRequest(page, '/auth/logout', 'POST', {})
  await page.evaluate(() => sessionStorage.removeItem('kurio-session'))
  await signInFixture(page, 'visitante@kurio.demo')
  await visitWithAccount(page, '/checkout')
  await expect(field(page, 'Nome de exibição')).toHaveValue('Visitante')
  await expect(field(page, 'Nome de usuário')).toHaveValue('visitante')
  await expect(field(page, 'E-mail')).toHaveValue('visitante@kurio.demo')
})
