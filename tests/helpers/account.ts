import { expect, type Page } from '@playwright/test'
import { cartRequest } from './cart'

export const walletDraft = {
  displayName: 'Colecionador',
  walletNickname: 'Principal',
  network: 'Ethereum',
  profileName: 'Minha coleção',
  address: '0xA91F00000000000000000000000000000000E82C',
  secondary: '',
  walletType: 'MetaMask',
  referral: 'KURIO',
  email: 'colecionador@kurio.demo',
  ens: 'colecionador.eth',
}
export async function seedWallets(page: Page) {
  const current = await cartRequest(page, '/wallets')
  expect(current.status).toBe(200)
  if (current.body.length) return
  for (const primary of [true, false]) {
    const draft = { ...walletDraft }
    if (!primary)
      Object.assign(draft, {
        walletNickname: 'nova.kurio.eth',
        network: 'Polygon',
        address: '0x1111111111111111111111111111111111111111',
      })
    const result = await cartRequest(page, '/wallets', 'POST', {
      draft,
      primary,
      sameAsPrimary: false,
    })
    expect(result.status).toBe(200)
  }
}
export async function fillProfile(page: Page) {
  await page
    .getByRole('textbox', { name: 'Nome de exibição', exact: true })
    .fill('Alex Silva')
  await page
    .getByRole('textbox', { name: 'Nome de usuário', exact: true })
    .fill('alexsilva')
  await page
    .getByRole('textbox', { name: 'E-mail', exact: true })
    .fill('alex@example.com')
  await page
    .getByRole('textbox', { name: 'Nome ENS', exact: true })
    .fill('alexsilva.eth')
  await page
    .getByRole('textbox', { name: 'Apelido da carteira', exact: true })
    .fill('Minha carteira')
}
export async function fillWallet(
  page: Page,
  overrides: Partial<typeof walletDraft> = {},
) {
  const values = { ...walletDraft, ...overrides }
  const labels = {
    displayName: 'Nome de exibição',
    walletNickname: 'Apelido da carteira',
    profileName: 'Nome do perfil',
    address: 'Endereço da carteira',
    secondary: 'ENS ou carteira secundária (opcional)',
    referral: 'Código de indicação',
    email: 'E-mail',
    ens: 'Nome ENS',
  }
  for (const [key, label] of Object.entries(labels))
    await page
      .getByRole('textbox', { name: label, exact: true })
      .fill(values[key as keyof typeof values])
  await page
    .getByRole('combobox', { name: 'Rede', exact: true })
    .selectOption(values.network)
  await page
    .getByRole('combobox', { name: 'Tipo de carteira', exact: true })
    .selectOption(values.walletType)
}
