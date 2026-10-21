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
  if (isAuth) await page.goto(route)
}
const fillProfile = async (page: Page) => {
  await page
    .getByRole('textbox', { name: 'Nome de exibição', exact: true })
    .fill('Colecionador')
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
  test('valida o login, alterna a senha e fecha os diálogos sem criar sessão', async ({
    page,
  }) => {
    const writes: string[] = []
    page.on('request', (request) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()))
        writes.push(request.url())
    })
    await page.goto('/login')
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
    await expect(
      page.getByRole('dialog', { name: 'Conteúdo indisponível', exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(password).toHaveValue('')
    await expect(
      dialog.getByRole('button', { name: 'Entrar', exact: true }),
    ).toBeFocused()
    expect(writes).toEqual([])
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
    await page.goto('/register')
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
    await expect(
      page.getByRole('dialog', { name: 'Content unavailable', exact: true }),
    ).toBeVisible()
    await expect(page).toHaveURL('/register')
  })

  test('valida a alteração de senha sem salvar perfil nem credenciais', async ({
    page,
  }) => {
    await page.goto('/profile')
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
      page.getByRole('dialog', { name: 'Conteúdo indisponível', exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByLabel('Senha atual', { exact: true })).toHaveValue(
      '',
    )
    await expect(
      page.getByRole('button', { name: 'Salvar', exact: true }),
    ).toBeFocused()
    await page.reload()
    await expect(
      page.getByRole('textbox', { name: 'Nome de exibição', exact: true }),
    ).toHaveValue('')
  })

  test('valida o avatar e permite prévia e remoção local da imagem', async ({
    page,
  }) => {
    await page.goto('/profile')
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

  test('edita o rascunho de carteira e mantém as ações sem persistência fictícia', async ({
    page,
  }) => {
    await page.goto('/wallets?view=ready')
    await page
      .getByRole('button', { name: 'Editar Reserva', exact: true })
      .click()
    await expect(
      page.getByRole('textbox', { name: 'Apelido da carteira', exact: true }),
    ).toHaveValue('Reserva')
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
      page.getByRole('dialog', { name: 'Conteúdo indisponível', exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
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
    await page.reload()
    await expect(
      page.getByRole('textbox', { name: 'Apelido da carteira', exact: true }),
    ).toHaveValue('')
  })

  test('apresenta carregamento, falha, ausência de sessão e sessão expirada', async ({
    page,
  }) => {
    await page.goto('/profile?view=loading')
    await expect(
      page.getByLabel('Carregando dados da conta', { exact: true }),
    ).toHaveAttribute('aria-busy', 'true')
    await expect(
      page.getByRole('button', { name: 'Salvar', exact: true }),
    ).toHaveCount(0)
    await page.goto('/wallets?view=error')
    await page
      .getByRole('button', { name: 'Tentar novamente', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: 'Salvar carteira', exact: true }),
    ).toBeVisible()
    await page.goto('/profile?view=expired')
    await expect(
      page.getByRole('heading', { name: 'Sua sessão expirou', exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('textbox')).toHaveCount(0)
    await page.goto('/wallets?view=signedOut')
    await expect(
      page.getByRole('heading', { name: 'Entre para continuar', exact: true }),
    ).toBeVisible()
    await page.goto('/login?view=loading')
    await expect(
      page.getByRole('button', { name: 'Aguarde…', exact: true }),
    ).toBeDisabled()
  })

  test('mantém as quatro telas sem overflow em português e inglês', async ({
    page,
  }) => {
    for (const width of [320, 390, 414, 768, 1440]) {
      await page.setViewportSize({ width, height: 896 })
      for (const route of ['/login', '/register', '/profile', '/wallets']) {
        await page.goto(route)
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
    await page.goto('/')
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
      await page.goto('/register')
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
