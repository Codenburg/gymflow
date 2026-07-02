import { test, expect, type Page } from '@playwright/test'
import { PUBLIC_HOME, firstRoutineHref } from './public-routing-helpers'

async function goToFirstRoutine(page: Page): Promise<string> {
  await page.goto(PUBLIC_HOME)
  await expect(page.locator('[data-testid="routine-list-content"]')).toBeVisible({ timeout: 15_000 })
  const href = await firstRoutineHref(page)
  test.skip(!href, 'No routine cards are available in the seeded tenant')
  await page.goto(href!)
  return href!
}

test.describe('Canonical routine detail page', () => {
  test('legacy routine REST endpoint is removed', async ({ request }) => {
    expect((await request.get('/api/rutinas')).status()).toBe(404)
    expect((await request.get('/api/rutinas/invalid-id-format')).status()).toBe(404)
  })

  test('renders routine detail structure on the canonical tenant URL', async ({ page }) => {
    const href = await goToFirstRoutine(page)

    await expect(page).toHaveURL(new RegExp(`^.*${PUBLIC_HOME}/rutinas/.+`))
    expect(href).toContain(`${PUBLIC_HOME}/rutinas/`)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Días de entrenamiento/i)).toBeVisible()
    await expect(page.getByText(/Creado por/i).first()).toBeVisible()
  })

  test('renders ordered day and exercise metadata', async ({ page }) => {
    await goToFirstRoutine(page)

    await expect(page.getByText(/Día\s+1/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/\d+×\d+/).first()).toBeVisible({ timeout: 10_000 })
  })

  test('back link preserves the tenant slug', async ({ page }) => {
    await goToFirstRoutine(page)

    const backLink = page.getByRole('link', { name: /Volver/i }).first()
    await expect(backLink).toHaveAttribute('href', PUBLIC_HOME)
    await backLink.click()
    await expect(page).toHaveURL(new RegExp(`${PUBLIC_HOME.replace('/', '\\/')}$`))
  })

  test('unknown routine under the tenant returns 404', async ({ page }) => {
    await page.goto(`${PUBLIC_HOME}/rutinas/00000000-0000-0000-0000-000000000000`)
    await expect(page.locator('body')).toContainText(/404|This page could not be found|No se encontró/i)
  })
})
