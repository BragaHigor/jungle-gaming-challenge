import { seedCart, cartRequest } from './helpers/cart'
import { visitWithAccount } from './helpers/auth'
import { visit } from './helpers/navigation'
import { test, expect, type Page } from '@playwright/test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { OrderResult } from '../src/components/purchase/OrderResult'
import ptBR from '../src/i18n/locales/pt-BR.json' with { type: 'json' }
import en from '../src/i18n/locales/en.json' with { type: 'json' }
import type { OrderSnapshot } from '../src/types/purchase'

async function language(page: Page, value: string) {
  const select = page.getByRole('combobox', { name: /^(Idioma|Language)$/ })
  if (!(await select.count()))
    await page.getByRole('button', { name: /^(Abrir menu|Open menu)$/ }).click()
  await select.selectOption(value)
  if (await page.getByRole('dialog', { name: 'Menu', exact: true }).count())
    await page.keyboard.press('Escape')
}

test.describe('Visual do fluxo de compra', () => {
  test('recalcula quantidades e remoções com precisão e permite esvaziar o carrinho', async ({
    page,
  }) => {
    await visit(page, '/')
    await seedCart(page)
    await visit(page, '/cart')
    const items = page.getByRole('region', { name: 'Seus NFTs', exact: true })
    const summary = page.getByRole('region', {
      name: 'Resumo da carteira',
      exact: true,
    })
    await expect(summary.getByText('26.846 ETH', { exact: true })).toBeVisible()
    await items
      .getByRole('button', { name: 'Aumentar quantidade', exact: true })
      .first()
      .click()
    await expect(summary.getByText('28.036 ETH', { exact: true })).toBeVisible()
    await items.getByRole('button', { name: /Remover Emerald/ }).click()
    await expect(summary.getByText('24.466 ETH', { exact: true })).toBeVisible()
    await items.getByRole('button', { name: /Remover Violet/ }).click()
    await items.getByRole('button', { name: /Remover Ivory/ }).click()
    await expect(
      page.getByRole('heading', { name: 'Seu carrinho está vazio' }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Conectar e finalizar' }),
    ).toHaveCount(0)
  })

  test('valida o cupom vazio e apresenta o desconto confirmado pela API', async ({
    page,
  }) => {
    await visit(page, '/')
    await seedCart(page)
    await visit(page, '/cart')
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await expect(
      page.getByRole('textbox', { name: 'Código promocional', exact: true }),
    ).toHaveAttribute('aria-invalid', 'true')
    await page
      .getByRole('textbox', { name: 'Código promocional', exact: true })
      .fill('KURIO10')
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await expect(
      page.getByText('Cupom KURIO10 aplicado', { exact: true }),
    ).toBeVisible()
    await expect(
      page
        .getByRole('region', { name: 'Resumo da carteira' })
        .getByText('24.163 ETH', { exact: true }),
    ).toBeVisible()
  })

  test('trata carregamento, erro recuperável e vazio sem liberar a finalização', async ({
    page,
  }) => {
    await visit(page, '/')
    await seedCart(page)
    await cartRequest(page, '/demo/reset', 'POST', { scenario: 'cart-slow' })
    await visit(page, '/cart')
    await expect(
      page.getByRole('region', { name: 'Resumo da carteira' }),
    ).toHaveAttribute('aria-busy', 'true')
    await expect(
      page.getByRole('button', { name: 'Conectar e finalizar', exact: true }),
    ).toBeDisabled()
    await expect(
      page.getByRole('link', { name: 'Conectar e finalizar', exact: true }),
    ).toBeVisible()
    await cartRequest(page, '/demo/reset', 'POST', { scenario: 'offline' })
    await visit(page, '/cart')
    await expect(
      page.getByRole('heading', {
        name: 'Não foi possível carregar o carrinho.',
        exact: true,
      }),
    ).toBeVisible()
    await cartRequest(page, '/demo/reset', 'POST', { scenario: 'default' })
    await page
      .getByRole('button', { name: 'Tentar novamente', exact: true })
      .click()
    await expect(
      page.getByRole('heading', {
        name: 'Seu carrinho está vazio',
        exact: true,
      }),
    ).toBeVisible()
  })

  test('valida os dados, revisa a seleção e mantém a compra sem recibo inventado', async ({
    page,
  }) => {
    await visitWithAccount(page, '/checkout')
    const writes: string[] = []
    page.on('request', (request) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()))
        writes.push(request.url())
    })
    await page
      .getByRole('button', { name: 'Revisar compra', exact: true })
      .click()
    await expect(
      page.getByRole('textbox', { name: 'Nome de exibição', exact: true }),
    ).toBeFocused()
    await page
      .getByRole('textbox', { name: 'Nome de exibição', exact: true })
      .fill('Colecionador')
    await page
      .getByRole('textbox', { name: 'Nome de usuário', exact: true })
      .fill('colecionador')
    await page
      .getByRole('textbox', { name: 'Nome do perfil', exact: true })
      .fill('Minha coleção')
    await page
      .getByRole('textbox', { name: 'E-mail', exact: true })
      .fill('colecionador@example.com')
    if ((page.viewportSize()?.width ?? 0) < 700)
      await page.getByRole('radio', { name: /Principal/ }).check()
    else
      await page
        .getByRole('combobox', { name: 'Carteiras disponíveis', exact: true })
        .selectOption('primary')
    await page
      .getByRole('textbox', { name: 'Código de indicação', exact: true })
      .fill('KURIO')
    await page
      .getByRole('textbox', { name: 'Nome ENS', exact: true })
      .fill('colecionador.eth')
    await page.getByRole('radio', { name: 'MetaMask', exact: true }).check()
    await expect(
      page.getByRole('combobox', { name: 'Rede', exact: true }),
    ).toHaveValue('Ethereum')
    await page
      .getByRole('button', { name: 'Revisar compra', exact: true })
      .click()
    const review = page.getByRole('dialog', {
      name: 'Revisão da compra',
      exact: true,
    })
    await expect(review).toBeVisible()
    await expect(
      review.getByText('MetaMask · Ethereum', { exact: true }),
    ).toBeVisible()
    await expect(review.getByText('26.846 ETH', { exact: true })).toBeVisible()
    await review
      .getByRole('button', { name: 'Confirmar compra', exact: true })
      .click()
    await expect(
      page.getByRole('dialog', { name: 'Conteúdo indisponível', exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('button', { name: 'Revisar compra', exact: true }),
    ).toBeFocused()
    expect(writes.filter((url) => !url.endsWith('/api/cart/quote'))).toEqual([])
    await visitWithAccount(page, '/confirmation?status=confirmed')
    await expect(
      page.getByRole('heading', { name: 'Nenhum pedido para exibir' }),
    ).toBeVisible()
    await expect(
      page.getByText('Seus NFTs agora estão na sua carteira'),
    ).toHaveCount(0)
  })

  test('traduz os erros e valida o endereço conforme a rede escolhida', async ({
    page,
  }) => {
    await visitWithAccount(page, '/checkout')
    await page
      .getByRole('combobox', { name: 'Rede', exact: true })
      .selectOption('Solana')
    await page
      .getByRole('button', { name: 'Revisar compra', exact: true })
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
      .getByRole('textbox', {
        name: 'ENS ou carteira secundária (opcional)',
        exact: true,
      })
      .fill('invalida')
    await page
      .getByRole('button', { name: 'Revisar compra', exact: true })
      .click()
    await expect(
      page.getByRole('textbox', { name: 'Endereço da carteira', exact: true }),
    ).toHaveAttribute('aria-invalid', 'false')
    await expect(
      page.getByText('Informe um endereço de carteira ou nome ENS válido.', {
        exact: true,
      }),
    ).toBeVisible()
    await language(page, 'en')
    await expect(
      page.getByText('Enter a valid wallet address or ENS name.', {
        exact: true,
      }),
    ).toBeVisible()
    await expect(
      page.getByRole('textbox', { name: 'Wallet address', exact: true }),
    ).toHaveValue('11111111111111111111111111111111')
  })

  test('mantém as telas sem overflow nas larguras de aceite e nos dois idiomas', async ({
    page,
  }) => {
    for (const width of [320, 390, 414, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const path of ['/cart', '/checkout', '/confirmation']) {
        await visitWithAccount(page, path)
        for (const locale of ['pt-BR', 'en']) {
          await language(page, locale)
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${path} ${width} ${locale}`,
          ).toBe(true)
        }
      }
    }
  })

  test('renderiza os estados do resultado isoladamente por snapshot de props', async ({
    page,
    request,
  }, testInfo) => {
    const instance = createInstance()
    await instance.init({
      resources: { 'pt-BR': ptBR, en },
      lng: 'pt-BR',
      defaultNS: 'common',
      initAsync: false,
    })
    const html = await (await request.get('/')).text()
    const css = html.match(/href="([^"]+\.css)"/)?.[1]
    expect(css).toBeTruthy()
    await visitWithAccount(page, '/confirmation')
    const order: OrderSnapshot = {
      id: 'DEMO-042',
      status: 'confirmed',
      date: '2026-07-29T12:00:00Z',
      wallet: 'MetaMask',
      reference: 'simulated-042',
      totals: {
        subtotal: '26.83',
        discount: '0',
        fee: '0.016',
        total: '26.846',
      },
      items: [
        {
          quantity: 2,
          available: 20,
          nft: {
            id: 'emerald-ape-042',
            title: 'Emerald Ape #042',
            image: '/images/nft-artwork-01.webp',
            imageAltKey: 'emeraldAlt',
            price: '1.19',
            category: 'digitalArt',
            network: 'Ethereum',
            isNew: true,
            hot: true,
            token: '0042',
          },
        },
        {
          quantity: 6,
          available: 20,
          nft: {
            id: 'violet-nomad-314',
            title: 'Violet Nomad #314',
            image: '/images/nft-artwork-02.webp',
            imageAltKey: 'sageAlt',
            price: '1.39',
            category: 'collectibles',
            network: 'Polygon',
            isNew: false,
            hot: true,
            token: '0314',
          },
        },
        {
          quantity: 9,
          available: 20,
          nft: {
            id: 'ivory-baron-088',
            title: 'Ivory Baron #088',
            image: '/images/nft-artwork-03.webp',
            imageAltKey: 'neonAlt',
            price: '1.79',
            category: 'digitalArt',
            network: 'Ethereum',
            isNew: false,
            hot: false,
            token: '0088',
          },
        },
      ],
    }
    for (const locale of ['pt-BR', 'en']) {
      await instance.changeLanguage(locale)
      for (const status of ['pending', 'confirmed', 'declined'] as const) {
        for (const width of [390, 414, 768, 1440]) {
          await page.setViewportSize({ width, height: 900 })
          const markup = renderToStaticMarkup(
            createElement(I18nextProvider, {
              i18n: instance,
              children: createElement(OrderResult, {
                order: { ...order, status },
              }),
            }),
          )
          await page.setContent(
            `<html lang="${locale}"><head><base href="http://127.0.0.1:4180/"><link rel="stylesheet" href="${css}"></head><body><main style="padding:24px">${markup}</main></body></html>`,
          )
          await page.evaluate(() => document.fonts.ready)
          expect(
            await page.evaluate(() =>
              document.fonts.check('14px "Roboto Mono"'),
            ),
          ).toBe(true)
          await expect(
            page.getByRole('heading', {
              name: instance.t(status, { ns: 'purchase' }),
            }),
          ).toBeVisible()
          await expect(
            page.getByText('26.846 ETH', { exact: true }).first(),
          ).toBeVisible()
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true)
          if (locale === 'pt-BR' && [390, 1440].includes(width))
            await page.screenshot({
              path: testInfo.outputPath(`resultado-${status}-${width}.png`),
              fullPage: true,
            })
          await expect(
            page.getByText('simulated-042', { exact: false }),
          ).toHaveCount(status === 'confirmed' ? 1 : 0)
        }
      }
    }
  })
})
