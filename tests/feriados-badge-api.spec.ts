import { test, expect } from '@playwright/test'
import { publicPath } from './public-routing-helpers'

test.describe('Feriados badge cutover', () => {
  test('legacy latest-holiday public REST endpoint is removed', async ({ request }) => {
    const response = await request.get('/api/feriados/latest')
    expect(response.status()).toBe(404)
  })

  test('canonical feriados page renders badge state without public REST', async ({ page }) => {
    const apiRequests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/feriados/latest')) {
        apiRequests.push(request.url())
      }
    })

    await page.goto(publicPath('/feriados'))
    await expect(page.getByRole('heading', { name: 'Feriados' })).toBeVisible({ timeout: 10_000 })
    expect(apiRequests).toEqual([])
  })
})
