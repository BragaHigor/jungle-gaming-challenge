import { waitForAppReady } from './navigation'
import { expect, type Page } from '@playwright/test'

export async function setScenario(page: Page, scenario: string) {
  await waitForAppReady(page)
  const status = await page.evaluate(async (scenario) => {
    const response = await fetch('/api/demo/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    })
    return response.status
  }, scenario)
  expect(status).toBe(200)
}
