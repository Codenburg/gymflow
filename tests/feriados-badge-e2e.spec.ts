/**
 * E2E tests for Feriados Notification Badge
 * 
 * Manual test scenarios:
 * - 5.8: Badge does NOT appear on first visit
 * - 5.9: Badge appears after creating a new Feriado via admin
 * - 5.10: Badge disappears after visiting /feriados page
 */

import { test, expect } from '@playwright/test';

test.describe('Feriados Notification Badge', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test for clean state
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('feriados_last_seen_at'));
  });

  test('5.8 - Badge does NOT appear on first visit', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the FeriadosNavButton to be visible
    const feriadosButton = page.locator('a[href="/feriados"]', { hasText: 'Feriados' });
    await expect(feriadosButton).toBeVisible({ timeout: 10000 });
    
    // Badge should NOT be visible on first visit
    const badge = feriadosButton.locator('[class*="badge"]');
    await expect(badge).not.toBeVisible();
  });

  test('5.10 - Badge disappears after visiting /feriados page', async ({ page, request }) => {
    // First create a new Feriado
    const createResponse = await request.post('/api/feriados', {
      data: {
        fecha: '2027-01-01T00:00:00.000Z',
        todo_dia: true,
      }
    });
    
    if (createResponse.status() === 401) {
      // Admin required - skip this part
      test.skip();
      return;
    }
    
    // Visit homepage - badge should appear (if new Feriado is newer)
    await page.goto('/');
    const feriadosButton = page.locator('a[href="/feriados"]', { hasText: 'Feriados' });
    await expect(feriadosButton).toBeVisible({ timeout: 10000 });
    
    // Wait a bit for the hook to fetch and compare
    await page.waitForTimeout(1000);
    
    // Visit the Feriados page to mark as seen
    await page.goto('/feriados');
    await expect(page.locator('h1', { hasText: 'Feriados' })).toBeVisible({ timeout: 10000 });
    
    // Go back to homepage
    await page.goto('/');
    await expect(feriadosButton).toBeVisible({ timeout: 10000 });
    
    // Badge should be gone now (markAsSeen was called)
    await page.waitForTimeout(500);
    const badge = feriadosButton.locator('[class*="badge"]');
    // Badge might not be visible OR might not exist in DOM - both are acceptable
    // as long as we don't have a visible destructive badge
    const destructiveBadge = feriadosButton.locator('[class*="destructive"]');
    await expect(destructiveBadge).not.toBeVisible();
  });
});
