import { test, expect } from '@playwright/test'
import ptBR from '../src/i18n/locales/pt-BR.json' with { type: 'json' }
import en from '../src/i18n/locales/en.json' with { type: 'json' }

test.describe('Base executável do marketplace', () => {
  test('apresenta a página inicial em português sem erros de execução', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
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
    await page.goto('/')
    await page
      .getByRole('combobox', { name: 'Idioma', exact: true })
      .selectOption('en')
    await expect(
      page.getByRole('heading', { name: 'NFT marketplace', exact: true }),
    ).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page).toHaveTitle('KURIO | NFT marketplace')
    await page.reload()
    await expect(
      page.getByRole('combobox', { name: 'Language', exact: true }),
    ).toHaveValue('en')
    await page
      .getByRole('combobox', { name: 'Language', exact: true })
      .selectOption('pt-BR')
    await expect(
      page.getByRole('heading', { name: 'Marketplace de NFTs', exact: true }),
    ).toBeVisible()
  })

  test('utiliza português quando a preferência armazenada é inválida', async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem('kurio-language', 'fr'))
    await page.goto('/')
    await expect(
      page.getByRole('combobox', { name: 'Idioma', exact: true }),
    ).toHaveValue('pt-BR')
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  })

  test('valida o email com Zod e traduz o feedback existente', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('textbox', { name: 'E-mail', exact: true })
      .fill('invalido')
    await page
      .getByRole('button', { name: 'Validar e-mail', exact: true })
      .click()
    await expect(
      page.getByRole('textbox', { name: 'E-mail', exact: true }),
    ).toHaveAttribute('aria-invalid', 'true')
    await expect(
      page.getByText('Informe um e-mail válido.', { exact: true }),
    ).toBeVisible()
    await page
      .getByRole('combobox', { name: 'Idioma', exact: true })
      .selectOption('en')
    await expect(
      page.getByText('Enter a valid email address.', { exact: true }),
    ).toBeVisible()
    await page
      .getByRole('textbox', { name: 'Email', exact: true })
      .fill('colecionador@example.com')
    await page
      .getByRole('button', { name: 'Validate email', exact: true })
      .click()
    await expect(
      page.getByText('Valid format. No data was sent.', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('textbox', { name: 'Email', exact: true }),
    ).toHaveAttribute('aria-invalid', 'false')
  })

  test('abre uma rota inexistente e retorna ao início', async ({ page }) => {
    await page.goto('/nao-existe')
    await expect(
      page.getByRole('heading', {
        name: '404 — Página não encontrada',
        exact: true,
      }),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Início', exact: true }).click()
    await expect(page).toHaveURL('/')
    await expect(
      page.getByRole('heading', { name: 'Marketplace de NFTs', exact: true }),
    ).toBeVisible()
  })

  test('permite validar um campo usando somente o teclado', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).focus()
    await page.keyboard.type('invalido')
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('button', { name: 'Validar e-mail', exact: true }),
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
    await page.goto('/')
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await page
      .getByRole('combobox', { name: 'Idioma', exact: true })
      .selectOption('en')
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
  })
})
