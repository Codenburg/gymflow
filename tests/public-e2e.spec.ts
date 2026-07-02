import { test, expect } from '@playwright/test'
import { PUBLIC_HOME, publicPath, firstRoutineHref } from './public-routing-helpers'

test.describe('Canonical public route surface', () => {
  test('homepage loads only on the canonical tenant URL', async ({ page }) => {
    await page.goto(PUBLIC_HOME)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 })

    const legacyResponse = await page.goto('/')
    expect(legacyResponse?.status()).toBe(404)
  })

  test('legacy public pages and public REST routes return 404', async ({ page }) => {
    for (const path of ['/', '/feriados', '/informacion', '/rutinas/not-a-real-id']) {
      const response = await page.goto(path)
      expect(response?.status(), `${path} should be removed`).toBe(404)
    }

    for (const path of ['/api/rutinas', '/api/rutinas/not-a-real-id', '/api/feriados/latest']) {
      const response = await page.request.get(path)
      expect(response.status(), `${path} should be removed`).toBe(404)
    }
  })

  test('legacy gym config API is not public', async ({ page }) => {
    const response = await page.request.get('/api/gym')
    expect([401, 403]).toContain(response.status())
  })

  test('homepage shows routine cards and canonical routine links', async ({ page }) => {
    await page.goto(PUBLIC_HOME)
    await expect(page.locator('[data-testid="routine-list-content"]')).toBeVisible({ timeout: 15_000 })

    const href = await firstRoutineHref(page)
    expect(href).toMatch(new RegExp(`^${PUBLIC_HOME}/rutinas/.+`))
  })

  test('search preserves the current tenant slug', async ({ page }) => {
    await page.goto(PUBLIC_HOME)
    const searchInput = page.getByPlaceholder('Buscar rutinas...').last()
    await searchInput.fill('Full')
    await page.waitForTimeout(500)

    await expect(page).toHaveURL(new RegExp(`${PUBLIC_HOME.replace('/', '\\/')}.*search=Full`))
  })

  test('routine detail page and back link stay canonical', async ({ page }) => {
    await page.goto(PUBLIC_HOME)
    const href = await firstRoutineHref(page)
    test.skip(!href, 'No routine cards are available in the seeded tenant')

    await page.goto(href!)
    await expect(page).toHaveURL(new RegExp(`^.*${PUBLIC_HOME}/rutinas/.+`))
    await expect(page.getByText(/Días de entrenamiento/i)).toBeVisible({ timeout: 10_000 })

    const backLink = page.getByRole('link', { name: /Volver/i }).first()
    await expect(backLink).toHaveAttribute('href', PUBLIC_HOME)
  })

  test('information and holidays links preserve the tenant', async ({ page }) => {
    await page.goto(PUBLIC_HOME)

    await expect(page.getByRole('link', { name: 'Información' }).first()).toHaveAttribute(
      'href',
      publicPath('/informacion')
    )
    await expect(page.getByRole('link', { name: 'Feriados' }).first()).toHaveAttribute(
      'href',
      publicPath('/feriados')
    )
  })

  test('mobile and tablet views load on canonical URL', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(PUBLIC_HOME)
    await expect(page.locator('[data-testid="routine-list-content"]')).toBeVisible({ timeout: 15_000 })

    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(PUBLIC_HOME)
    await expect(page.locator('[data-testid="routine-list-content"]')).toBeVisible({ timeout: 15_000 })
  })
})
