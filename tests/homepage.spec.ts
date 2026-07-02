import { test, expect } from '@playwright/test'
import { PUBLIC_HOME, publicPath, firstRoutineHref } from './public-routing-helpers'

test.describe('Canonical homepage', () => {
  test('displays routine cards with complete information', async ({ page }) => {
    await page.goto(PUBLIC_HOME)

    await expect(page.getByText('Full Body').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('text=Fuerza').first()).toBeVisible()
    await expect(page.locator('text=días').first()).toBeVisible()
    await expect(page.getByText('null', { exact: false })).not.toBeVisible()
  })

  test('renders the responsive routine grid', async ({ page }) => {
    await page.goto(PUBLIC_HOME)
    await expect(page.locator('[data-testid="routine-list-content"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-testid="routine-list-content"] > *').first()).toBeVisible()
  })

  test('updates and clears search while preserving the tenant slug', async ({ page }) => {
    await page.goto(PUBLIC_HOME)
    await expect(page.getByText('Full Body').first()).toBeVisible({ timeout: 15_000 })

    const searchInput = page.getByPlaceholder('Buscar rutinas...').last()
    await searchInput.fill('Full')
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(new RegExp(`${PUBLIC_HOME.replace('/', '\\/')}.*search=Full`))

    await searchInput.fill('')
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(new RegExp(`${PUBLIC_HOME.replace('/', '\\/')}(\\?.*)?$`))
  })

  test('routine cards link to canonical routine detail URLs', async ({ page }) => {
    await page.goto(PUBLIC_HOME)
    await expect(page.locator('[data-testid="routine-list-content"]')).toBeVisible({ timeout: 15_000 })

    const href = await firstRoutineHref(page)
    expect(href).toMatch(new RegExp(`^${PUBLIC_HOME}/rutinas/.+`))
  })

  test('legacy routines API is removed and homepage still renders', async ({ page }) => {
    const response = await page.request.get('/api/rutinas')
    expect(response.status()).toBe(404)

    await page.goto(PUBLIC_HOME)
    await expect(page.locator('[data-testid="routine-list-content"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Application error:')).toHaveCount(0)
  })
})
