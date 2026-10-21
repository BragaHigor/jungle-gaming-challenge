import { cartRequest } from './helpers/cart'
import { visitWithAccount, signInFixture } from './helpers/auth'
import { visit } from './helpers/navigation'
import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'

const setLanguage = async (page: Page, locale: string) => {
  const route = new URL(page.url()).pathname
  const isAuth = ['/login', '/register'].includes(route)
  if (isAuth) await page.keyboard.press('Escape')
  const selector = page.getByRole('combobox', { name: /^(Idioma|Language)$/ })
  if (!(await selector.count()))
    await page.getByRole('button', { name: /^(Abrir menu|Open menu)$/ }).click()
  await selector.selectOption(locale)
  if (await page.getByRole('dialog', { name: 'Menu', exact: true }).count())
    await page.keyboard.press('Escape')
  if (isAuth) await visitWithAccount(page, route)
}
const fillProfile = async (page: Page) => {
  await page
    .getByRole('textbox', { name: 'Nome de exibição', exact: true })
    .fill('Colecionador Editado')
  await page
    .getByRole('textbox', { name: 'Nome de usuário', exact: true })
    .fill('colecionador')
  await page
    .getByRole('textbox', { name: 'E-mail', exact: true })
    .fill('colecionador@example.com')
  await page
    .getByRole('textbox', { name: 'Nome ENS', exact: true })
    .fill('colecionador.eth')
  await page
    .getByRole('textbox', { name: 'Apelido da carteira', exact: true })
    .fill('Principal')
}

test.describe('Visual de autenticação e conta', () => {
  test('valida o login, alterna a senha e mostra falha sem criar sessão', async ({
    page,
  }) => {
    const writes: string[] = []
    page.on('request', (request) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()))
        writes.push(request.url())
    })
    await visit(page, '/login')
    const dialog = page.getByRole('dialog', { name: 'Entrar', exact: true })
    await expect(dialog).toBeFocused()
    await expect(dialog.getByRole('combobox')).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(
      dialog.getByRole('textbox', { name: 'E-mail', exact: true }),
    ).toBeFocused()
    await dialog
      .getByRole('textbox', { name: 'E-mail', exact: true })
      .fill('colecionador@example.com')
    const password = dialog.getByLabel(/^Senha\s*\*?$/)
    await password.fill('SenhaFicticia123')
    await dialog
      .getByRole('button', { name: 'Mostrar senha', exact: true })
      .click()
    await expect(password).toHaveAttribute('type', 'text')
    await dialog
      .getByRole('button', { name: 'Ocultar senha', exact: true })
      .click()
    await expect(password).toHaveAttribute('type', 'password')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText(
      'E-mail ou senha incorretos.',
    )
    await expect(password).toHaveValue('')
    await expect(
      dialog.getByRole('button', { name: 'Entrar', exact: true }),
    ).toBeFocused()
    expect(
      writes.filter((url) => url.endsWith('/api/auth/login')),
    ).toHaveLength(1)
    expect(
      await page.evaluate(() => JSON.stringify({ ...localStorage })),
    ).not.toContain('SenhaFicticia123')
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('main')).toBeFocused()
  })

  test('valida confirmação do cadastro e mantém os erros traduzidos', async ({
    page,
  }) => {
    await visit(page, '/register')
    await page
      .getByRole('textbox', { name: 'Nome de usuário', exact: true })
      .fill('Higor')
    await page
      .getByRole('textbox', { name: 'E-mail', exact: true })
      .fill('colecionador@example.com')
    await page.getByLabel(/^Senha\s*\*?$/).fill('SenhaFicticia123')
    await page.getByLabel(/^Confirmar senha\s*\*?$/).fill('OutraSenha123')
    await page.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(
      page.getByText('As senhas não coincidem.', { exact: true }),
    ).toBeVisible()
    await expect(page.getByLabel(/^Confirmar senha\s*\*?$/)).toBeFocused()
    await setLanguage(page, 'en')
    await expect(page.getByRole('dialog').getByRole('combobox')).toHaveCount(0)
    await page
      .getByRole('textbox', { name: 'Username', exact: true })
      .fill('Higor')
    await page
      .getByRole('textbox', { name: 'Email', exact: true })
      .fill('colecionador@example.com')
    await page.getByLabel(/^Password\s*\*?$/).fill('SenhaFicticia123')
    await page.getByLabel(/^Confirm password\s*\*?$/).fill('OutraSenha123')
    await page
      .getByRole('button', { name: /^Create (account|profile)$/ })
      .click()
    await expect(
      page.getByText('The passwords do not match.', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('textbox', { name: 'Username', exact: true }),
    ).toHaveValue('Higor')
    await page.getByLabel(/^Confirm password\s*\*?$/).fill('SenhaFicticia123')
    await page
      .getByRole('button', { name: /^Create (account|profile)$/ })
      .click()
    await expect(page).toHaveURL('/')
  })

  test('valida a senha atual e persiste perfil e credenciais pela API', async ({
    page,
  }) => {
    await visitWithAccount(page, '/profile')
    await fillProfile(page)
    await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha123')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByLabel('Senha atual', { exact: true })).toBeFocused()
    await page
      .getByLabel('Senha atual', { exact: true })
      .fill('SenhaAnterior123')
    await page
      .getByLabel('Confirmar nova senha', { exact: true })
      .fill('Diferente123')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(
      page.getByText('As senhas não coincidem.', { exact: true }),
    ).toBeVisible()
    await page
      .getByLabel('Confirmar nova senha', { exact: true })
      .fill('NovaSenha123')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(
      page.getByText('A senha atual está incorreta.', { exact: true }),
    ).toBeVisible()
    await page.getByLabel('Senha atual', { exact: true }).fill('Kurio@2026')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(
      page.getByText('Alterações salvas.', { exact: true }),
    ).toBeVisible()
    await expect(page.getByLabel('Senha atual', { exact: true })).toHaveValue(
      '',
    )
    await page.reload()
    await expect(
      page.getByRole('textbox', { name: 'Nome de exibição', exact: true }),
    ).toHaveValue('Colecionador Editado')
  })

  test('valida o avatar e permite prévia e remoção local da imagem', async ({
    page,
  }) => {
    await visitWithAccount(page, '/profile')
    const upload = page.getByLabel('Escolher imagem do avatar', { exact: true })
    await upload.setInputFiles({
      name: 'arquivo.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('imagem inválida'),
    })
    await expect(
      page.getByText('Escolha uma imagem JPG, PNG ou WebP.', { exact: true }),
    ).toBeVisible()
    await upload.setInputFiles({
      name: 'grande.webp',
      mimeType: 'image/webp',
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
    })
    await expect(
      page.getByText('A imagem deve ter até 2 MB e não pode estar vazia.', {
        exact: true,
      }),
    ).toBeVisible()
    await upload.setInputFiles(
      path.join(process.cwd(), 'public/images/nft-artwork-01.webp'),
    )
    const preview = page.getByRole('img', {
      name: 'Prévia do avatar selecionado',
      exact: true,
    })
    await expect(preview).toBeVisible()
    await expect
      .poll(() =>
        preview.evaluate((img) => (img as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Remover', exact: true }).click()
    await expect(preview).toHaveCount(0)
  })

  test('edita a carteira e persiste a preferência da carteira secundária', async ({
    page,
  }) => {
    await visit(page, '/')
    await page.evaluate(async () => {
      await fetch('/api/demo/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: 'pending-order' }),
      })
    })
    await signInFixture(page)
    await visitWithAccount(page, '/wallets?view=ready')
    await page
      .getByRole('button', { name: 'Editar Principal', exact: true })
      .click()
    await expect(
      page.getByRole('textbox', { name: 'Apelido da carteira', exact: true }),
    ).toHaveValue('Principal')
    await page
      .getByRole('combobox', { name: 'Rede', exact: true })
      .selectOption('Solana')
    await page
      .getByRole('button', { name: 'Salvar carteira', exact: true })
      .click()
    await expect(
      page.getByText('Informe um endereço válido para a rede selecionada.', {
        exact: true,
      }),
    ).toBeVisible()
    await page
      .getByRole('textbox', { name: 'Endereço da carteira', exact: true })
      .fill('11111111111111111111111111111111')
    await page
      .getByRole('button', { name: 'Salvar carteira', exact: true })
      .click()
    await expect(
      page.getByText('Alterações salvas.', { exact: true }),
    ).toBeVisible()
    await page
      .getByRole('button', {
        name: 'Adicionar carteira secundária',
        exact: true,
      })
      .click()
    await expect(
      page.getByRole('button', { name: 'Cancelar', exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await page
      .getByRole('checkbox', {
        name: 'Igual à carteira principal',
        exact: true,
      })
      .check()
    await expect(
      page.getByRole('button', {
        name: 'Adicionar carteira secundária',
        exact: true,
      }),
    ).toBeDisabled()
    await expect(
      page.getByText('Preferência de uso da carteira salva.', { exact: true }),
    ).toBeVisible()
    await page.reload()
    await expect(
      page.getByRole('checkbox', {
        name: 'Igual à carteira principal',
        exact: true,
      }),
    ).toBeChecked()
    await expect(
      page.getByRole('textbox', { name: 'Apelido da carteira', exact: true }),
    ).toHaveValue('Principal')
  })

  test('apresenta carregamento e falha reais e recupera a consulta da conta', async ({
    page,
  }) => {
    await visitWithAccount(page, '/profile')
    await expect(
      page.getByRole('button', { name: 'Salvar', exact: true }),
    ).toBeVisible()
    await cartRequest(page, '/demo/reset', 'POST', { scenario: 'account-slow' })
    await page.reload()
    await expect(
      page.getByLabel('Carregando dados da conta', { exact: true }),
    ).toHaveAttribute('aria-busy', 'true')
    await expect(
      page.getByRole('button', { name: 'Salvar', exact: true }),
    ).toBeVisible()
    await cartRequest(page, '/demo/reset', 'POST', {
      scenario: 'account-read-failure',
    })
    await visit(page, '/wallets')
    await expect(
      page.getByText('Não foi possível carregar seus dados.', { exact: true }),
    ).toBeVisible()
    await cartRequest(page, '/demo/reset', 'POST', {
      scenario: 'account-ready',
    })
    await page
      .getByRole('button', { name: 'Tentar novamente', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: 'Salvar carteira', exact: true }),
    ).toBeVisible()
  })

  test('mantém as quatro telas sem overflow em português e inglês', async ({
    page,
  }) => {
    test.setTimeout(120000)
    for (const width of [320, 390, 414, 768, 1440]) {
      await page.setViewportSize({ width, height: 896 })
      for (const route of ['/login', '/register', '/profile', '/wallets']) {
        await visitWithAccount(page, route)
        for (const locale of ['pt-BR', 'en']) {
          await setLanguage(page, locale)
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${route} ${width} ${locale}`,
          ).toBe(true)
        }
      }
    }
  })

  test('restaura o scroll ao fechar login e cadastro', async ({ page }) => {
    await visit(page, '/')
    await page.evaluate(() => window.scrollTo(0, 500))
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(100)
    const initialScroll = await page.evaluate(() => window.scrollY)
    for (const register of [false, true]) {
      const login = page.getByRole('link', { name: 'Entrar', exact: true })
      if (await login.isVisible()) {
        await login.evaluate((element) =>
          element.focus({ preventScroll: true }),
        )
        await page.keyboard.press('Enter')
      } else {
        await page
          .getByRole('button', { name: /^(Abrir menu|Open menu)$/ })
          .click()
        await page
          .getByRole('dialog', { name: 'Menu', exact: true })
          .getByRole('link', { name: 'Entrar', exact: true })
          .click()
      }
      await expect(page).toHaveURL('/login')
      if (register) {
        await page
          .getByRole('link', { name: /^(Criar conta|Novo na Kurio.*)$/ })
          .click()
        await expect(page).toHaveURL('/register')
      }
      await page.keyboard.press('Escape')
      await expect(page).toHaveURL('/')
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBe(initialScroll)
    }
  })

  test('mantém foco e rolagem do diálogo em telas baixas', async ({ page }) => {
    for (const width of [390, 844, 1440]) {
      await page.setViewportSize({ width, height: 390 })
      await visit(page, '/register')
      const dialog = page.getByRole('dialog', {
        name: 'Criar perfil de colecionador',
        exact: true,
      })
      await expect(dialog).toBeFocused()
      const box = await dialog.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.y).toBeGreaterThanOrEqual(0)
      expect(box!.height).toBeLessThanOrEqual(390)
      await page
        .getByRole('button', { name: 'Continuar com Facebook', exact: true })
        .focus()
      await page.keyboard.press('Tab')
      const focusInside = await dialog.evaluate((el) =>
        el.contains(document.activeElement),
      )
      expect(focusInside).toBe(true)
      await page.keyboard.press('Escape')
      await expect(page).toHaveURL('/')
    }
  })
})
