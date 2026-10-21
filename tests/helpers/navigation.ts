import { expect, type Page } from '@playwright/test'

export async function visit(page: Page, path: string) {
  await page.goto(path)
  await expect(page.locator('.site-layout')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}
