import { visit } from './helpers/navigation'
import { test, expect, type Page } from '@playwright/test'
import ptBR from '../src/i18n/locales/pt-BR.json' with { type: 'json' }
import en from '../src/i18n/locales/en.json' with { type: 'json' }

async function languageSelect(page: Page) {
  const selector = page.getByRole('combobox', { name: /^(Idioma|Language)$/ })
  if (!(await selector.count())) {
    await page.getByRole('button', { name: /^(Abrir menu|Open menu)$/ }).click()
  }
  return page.getByRole('combobox', { name: /^(Idioma|Language)$/ })
}

async function selectLanguage(page: Page, language: string) {
  await (await languageSelect(page)).selectOption(language)
  if (await page.getByRole('dialog', { name: 'Menu', exact: true }).count())
    await page.keyboard.press('Escape')
}

test.describe('Base executável do marketplace', () => {
  test('apresenta a página inicial em português sem erros de execução', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await visit(page, '/')
    await expect(
      page.getByRole('heading', { name: 'Marketplace de NFTs', exact: true }),
    ).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
    await expect(page).toHaveTitle('KURIO | Marketplace de NFTs')
    expect(errors).toEqual([])
  })

  test('preserva o idioma após atualizar e retorna ao português', async ({
    page,
  }) => {
    await visit(page, '/')
    await selectLanguage(page, 'en')
    await expect(
      page.getByRole('heading', { name: 'NFT marketplace', exact: true }),
    ).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page).toHaveTitle('KURIO | NFT marketplace')
    await page.reload()
    await expect(await languageSelect(page)).toHaveValue('en')
    await selectLanguage(page, 'pt-BR')
    await expect(
      page.getByRole('heading', { name: 'Marketplace de NFTs', exact: true }),
    ).toBeVisible()
  })

  test('utiliza português quando a preferência armazenada é inválida', async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem('kurio-language', 'fr'))
    await visit(page, '/')
    await expect(await languageSelect(page)).toHaveValue('pt-BR')
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  })

  test('valida o email com Zod e traduz o feedback existente', async ({
    page,
  }) => {
    await visit(page, '/')
    await page
      .getByRole('textbox', { name: 'E-mail para novidades', exact: true })
      .fill('invalido')
    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    await expect(
      page.getByRole('textbox', { name: 'E-mail para novidades', exact: true }),
    ).toHaveAttribute('aria-invalid', 'true')
    await expect(
      page.getByText('Informe um e-mail válido.', { exact: true }),
    ).toBeVisible()
    await selectLanguage(page, 'en')
    await expect(
      page.getByText('Enter a valid email address.', { exact: true }),
    ).toBeVisible()
    await page
      .getByRole('textbox', { name: 'Email for updates', exact: true })
      .fill('colecionador@example.com')
    await page.getByRole('button', { name: 'Send', exact: true }).click()
    await expect(
      page.getByText('Updates subscription is unavailable.', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('textbox', { name: 'Email for updates', exact: true }),
    ).toHaveAttribute('aria-invalid', 'false')
  })

  test('abre uma rota inexistente e retorna ao início', async ({ page }) => {
    await visit(page, '/nao-existe')
    await expect(
      page.getByRole('heading', {
        name: '404 — Página não encontrada',
        exact: true,
      }),
    ).toBeVisible()
    await page
      .getByRole('main')
      .getByRole('link', { name: 'Início', exact: true })
      .click()
    await expect(page).toHaveURL('/')
    await expect(
      page.getByRole('heading', { name: 'Marketplace de NFTs', exact: true }),
    ).toBeVisible()
  })

  test('permite validar um campo usando somente o teclado', async ({
    page,
  }) => {
    await visit(page, '/')
    await page
      .getByRole('textbox', { name: 'E-mail para novidades', exact: true })
      .focus()
    await page.keyboard.type('invalido')
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('button', { name: 'Enviar', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(
      page.getByText('Informe um e-mail válido.', { exact: true }),
    ).toBeVisible()
  })

  test('mantém paridade de traduções e conteúdo dentro da largura disponível', async ({
    page,
  }) => {
    for (const namespace of Object.keys(ptBR) as (keyof typeof ptBR)[]) {
      expect(Object.keys(en[namespace]).sort()).toEqual(
        Object.keys(ptBR[namespace]).sort(),
      )
      expect(
        Object.values(en[namespace]).every((text) => text.trim().length > 0),
      ).toBe(true)
    }
    await visit(page, '/')
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await selectLanguage(page, 'en')
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
  })
})
