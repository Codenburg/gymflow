import { test, expect } from '@playwright/test'
import { PUBLIC_HOME, publicPath } from './public-routing-helpers'

test.describe('Canonical cache and public navigation behavior', () => {
  test('initial canonical load shows content without an error state', async ({ page }) => {
    await page.goto(PUBLIC_HOME)

    const skeleton = page.locator('[data-testid="routine-list-skeleton"]')
    const content = page.locator('[data-testid="routine-list-content"]')
    await expect(skeleton.or(content).first()).toBeVisible({ timeout: 15_000 })
    await expect(content).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-testid="routine-list-error"]')).toHaveCount(0)
  })

  test('consecutive canonical visits keep data consistent', async ({ page }) => {
    await page.goto(PUBLIC_HOME)
    await expect(page.locator('[data-testid="routine-list-content"]')).toBeVisible({ timeout: 15_000 })
    const initialCards = await page.locator('[data-testid="routine-list-content"] > *').count()

    await page.goto(publicPath('/informacion'))
    await expect(page.getByRole('heading', { name: 'Información' })).toBeVisible({ timeout: 10_000 })

    await page.goto(PUBLIC_HOME)
    await expect(page.locator('[data-testid="routine-list-content"]')).toBeVisible({ timeout: 15_000 })
    const afterNavCards = await page.locator('[data-testid="routine-list-content"] > *').count()
    expect(afterNavCards).toBe(initialCards)
  })

  test('canonical public pages do not call removed public REST routes', async ({ page }) => {
    const removedPublicApiRequests: string[] = []
    page.on('request', (request) => {
      const url = request.url()
      if (
        url.includes('/api/rutinas') ||
        url.includes('/api/feriados') ||
        url.includes('/api/promociones') ||
        url.includes('/api/descuentos-duracion') ||
        url.includes('/api/search/unified') ||
        url.includes('/api/trainers')
      ) {
        removedPublicApiRequests.push(url)
      }
    })

    await page.goto(PUBLIC_HOME)
    await expect(page.locator('[data-testid="routine-list-content"]')).toBeVisible({ timeout: 15_000 })
    await page.goto(publicPath('/feriados'))
    await expect(page.getByRole('heading', { name: 'Feriados' })).toBeVisible({ timeout: 10_000 })

    expect(removedPublicApiRequests).toEqual([])
  })

  test('legacy public paths and REST routes return 404 after hard cutover', async ({ page, request }) => {
    for (const path of ['/', '/informacion', '/feriados', '/rutinas/anything']) {
      const response = await page.goto(path)
      expect(response?.status(), `${path} should be removed`).toBe(404)
    }

    for (const path of ['/api/rutinas', '/api/feriados/latest', '/api/search/unified']) {
      const response = await request.get(path)
      expect(response.status(), `${path} should be removed`).toBe(404)
    }
  })
})
