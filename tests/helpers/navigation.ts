import { expect, type Page } from '@playwright/test'

export async function waitForAppReady(page: Page) {
  await expect(page.locator('.site-layout')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

export async function visit(page: Page, path: string) {
  await page.goto(path)
  await waitForAppReady(page)
}

export async function delayAppBootstrap(page: Page) {
  let intercepted = 0
  await page.route(/\/assets\/browser-[^/]+\.js$/, async (route) => {
    intercepted++
    await new Promise((resolve) => setTimeout(resolve, 600))
    await route.continue()
  })
  return () => intercepted
}
