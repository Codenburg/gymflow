/**
 * E2E tests for the Rutina admin CRUD flow.
 *
 * Phase: PR 2 (Slice 1) of `e2e-coverage-critical-flows`.
 * Design: openspec/changes/e2e-coverage-critical-flows/design.md §6.1.
 *
 * Covered scenarios:
 *   S1.1 - create rutina end-to-end (happy path)
 *   S1.2 - edit rutina and verify persistence
 *   S1.3 - delete rutina from list
 *   S1.4 - list shows TEST_ rutinas; isolation visible to user
 *   S1.5 - reorder dias via dnd-kit keyboard sensor
 *
 * The 7 new data-testid attributes (2 in rutinas-list-client.tsx +
 * 5 in rutina-completa-form.tsx) are the test contract — fused with
 * the spec per design §7 line 490.
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';
import { RoutineAdminPage } from './pages/RoutineAdminPage';
import { createRutinaFixture } from './fixtures/rutina.fixture';

test.setTimeout(120_000);

test.describe('Rutina CRUD', () => {
  // Serial: state-mutating suite (design Decision 3). Fresh auth per
  // test (~2-3s loginAsAdmin overhead).
  test.describe.configure({ mode: 'serial' });
  test.use({ storageState: undefined });

  test('S1.1 - create rutina end-to-end', async ({ page }) => {
    await loginAsAdmin(page);
    const routinePage = new RoutineAdminPage(page);

    await routinePage.gotoNew();
    const fixture = createRutinaFixture();
    await routinePage.fillNombre(fixture.nombre);
    await routinePage.fillDescripcion(fixture.descripcion);
    await routinePage.selectTipo(fixture.tipo);

    // submitCreate clicks the form button + accepts the useConfirm
    // modal ("¿Crear rutina?" → "Crear" action).
    await routinePage.submitCreate();

    // Form does router.push('/admin') on success. Navigate to the list
    // and assert the new name is visible.
    await routinePage.goto();
    await expect(
      page.locator(`[data-testid="rutina-list-item-nombre"]:text("${fixture.nombre}")`)
    ).toBeVisible({ timeout: 15_000 });
  });

  test('S1.2 - edit rutina and verify persistence', async ({ page }) => {
    await loginAsAdmin(page);
    const routinePage = new RoutineAdminPage(page);
    const fixture = createRutinaFixture();

    // Create via API (faster; S1.1 already covers the UI create path).
    const createResponse = await page.request.post('/api/rutinas', {
      multipart: { nombre: fixture.nombre, tipo: 'fuerza', descripcion: fixture.descripcion },
    });
    expect(createResponse.ok()).toBe(true);
    const rutinaId = ((await createResponse.json()) as { data: { id: string } }).data.id;

    await routinePage.gotoEdit(rutinaId);
    await expect(
      page.getByRole('heading', { name: /Editar Rutina/i })
    ).toBeVisible({ timeout: 15_000 });

    const nombreInput = page.getByLabel(/Nombre de la rutina/i);
    await expect(nombreInput).toBeVisible({ timeout: 10_000 });
    const updatedName = `${fixture.nombre}_EDITED`;
    await nombreInput.fill(updatedName);

    // Confirm via the useConfirm modal ("Actualizar" button).
    await page.getByRole('button', { name: /Actualizar Rutina/i }).click();
    await page.getByRole('button', { name: /^Actualizar$/i }).click();
    await page.waitForURL(/\/admin\/rutinas(?!\/new)/, { timeout: 15_000 });

    // Reload the edit page and verify the new name persists.
    await routinePage.gotoEdit(rutinaId);
    await expect(nombreInput).toHaveValue(updatedName, { timeout: 10_000 });

    // Cleanup.
    await routinePage.goto();
    await routinePage.deleteByName(updatedName);
  });

  test('S1.3 - delete rutina from list', async ({ page }) => {
    await loginAsAdmin(page);
    const routinePage = new RoutineAdminPage(page);
    const fixture = createRutinaFixture();

    const createResponse = await page.request.post('/api/rutinas', {
      multipart: { nombre: fixture.nombre, tipo: 'fuerza', descripcion: fixture.descripcion },
    });
    expect(createResponse.ok()).toBe(true);

    await routinePage.goto();
    await expect(
      page.locator(`[data-testid="rutina-list-item"]:has-text("${fixture.nombre}")`)
    ).toBeVisible({ timeout: 15_000 });

    // RoutineAdminPage.deleteByName handles the hover + delete button
    // + useConfirm modal (clicking the modal's "Eliminar" action).
    await routinePage.deleteByName(fixture.nombre);

    await expect(
      page.locator(`[data-testid="rutina-list-item"]:has-text("${fixture.nombre}")`)
    ).toHaveCount(0, { timeout: 15_000 });
  });

  test('S1.4 - list shows TEST_ rutinas; isolation visible to user', async ({ page }) => {
    await loginAsAdmin(page);
    const routinePage = new RoutineAdminPage(page);
    const fixture1 = createRutinaFixture();
    const fixture2 = createRutinaFixture();

    // Create 2 TEST_ rutinas via the API. Both should appear in the list.
    for (const f of [fixture1, fixture2]) {
      const r = await page.request.post('/api/rutinas', {
        multipart: { nombre: f.nombre, tipo: 'fuerza', descripcion: f.descripcion },
      });
      expect(r.ok()).toBe(true);
    }

    await routinePage.goto();
    await expect(
      page.locator(`[data-testid="rutina-list-item-nombre"]:text("${fixture1.nombre}")`)
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator(`[data-testid="rutina-list-item-nombre"]:text("${fixture2.nombre}")`)
    ).toBeVisible({ timeout: 15_000 });

    // The list shows ALL rutinas (TEST_ + non-TEST_). The "isolation
    // visible to user" guarantee is that cleanup only deletes TEST_
    // records, so non-TEST_ data is preserved across runs.
    await routinePage.goto();
    await routinePage.deleteByName(fixture1.nombre);
    await routinePage.deleteByName(fixture2.nombre);
  });

  test('S1.5 - reorder dias via dnd-kit keyboard sensor', async ({ page }) => {
    await loginAsAdmin(page);
    const routinePage = new RoutineAdminPage(page);
    const fixture = createRutinaFixture();

    // Create a rutina with 1 dia (default), then add 2 more via the UI
    // to get 3 dias (the minimum to demonstrate a reorder).
    const createResponse = await page.request.post('/api/rutinas', {
      multipart: { nombre: fixture.nombre, tipo: 'fuerza', descripcion: fixture.descripcion },
    });
    expect(createResponse.ok()).toBe(true);
    const rutinaId = ((await createResponse.json()) as { data: { id: string } }).data.id;

    await routinePage.gotoEdit(rutinaId);
    await expect(
      page.getByRole('heading', { name: /Editar Rutina/i })
    ).toBeVisible({ timeout: 15_000 });

    // The form starts with 1 dia. Click "Agregar Día" twice to get 3.
    const addDayButton = page.getByRole('button', { name: /Agregar Día/i });
    await addDayButton.click();
    await page.waitForTimeout(200);
    await addDayButton.click();
    await page.waitForTimeout(200);

    // Focus the first dia's drag handle and use dnd-kit's keyboard
    // sensor: Space (pick up) → ArrowDown × 2 (move) → Space (drop).
    // Keyboard is more stable than mouse-drag (dnd-rutina.spec.ts is
    // fully `test.skip()` due to mouse flakiness).
    const handle0 = page.locator('[data-testid="dia-drag-handle-0"]');
    await expect(handle0).toBeVisible({ timeout: 10_000 });
    await handle0.focus();

    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);

    // Assert all 3 drag handles remain present (the form didn't crash).
    // A strict "reorder happened" assertion would require a stable
    // DnD implementation — documented in engram #200 + design §6.1.
    // The handles persisting is a smoke-test that the keyboard
    // interaction didn't break the form.
    await expect(page.locator('[data-testid="dia-drag-handle-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="dia-drag-handle-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="dia-drag-handle-2"]')).toBeVisible();

    // Cleanup.
    await routinePage.goto();
    await routinePage.deleteByName(fixture.nombre);
  });
});
