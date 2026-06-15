# Design: E2E coverage for critical flows (1.0 prep · Recomendación 3)

> Change: `e2e-coverage-critical-flows`
> Proposal: `openspec/changes/e2e-coverage-critical-flows/proposal.md`
> Stack: Next.js 16.1.6 + React 19.2.3 + Playwright 1.58 + TypeScript 5
> Chain strategy: stacked-to-main (4 PRs, each <500 LOC)
> Strict TDD: ACTIVE (RED-GREEN-REFACTOR; helpers + page objects + fixtures first, then failing specs, then app data-testid patches only when needed)

## Technical Approach

The existing 19-spec E2E suite covers gym-config, page-loading, homepage, security, and partial promocion/feriado flows — but the 5 critical admin CRUD flows (rutina, feriado, promo, descuento, trainer) and the auth happy path have **structural gaps** plus **duplicated infrastructure** (9 inline `loginAsAdmin` copies). This change builds a thin test-infrastructure layer (helpers + 6 page objects + 5 new specs), patches the few `data-testid` attributes the specs need, and fixes three pre-existing test-velocity issues (GGA-FOLLOWUP-4 `saveField` flakiness, the 5.2.3 isolation regression, and the 5-8 min shell-execution time) in one pass.

The new layer is **test-only**. The only app-code changes are `data-testid` additions on 5 admin manager components and the login page — minimal, reviewable, and reversible per slice. The structure follows the project's existing flat `.spec.ts` layout (we deviate from the Playwright skill's "co-locate everything" pattern deliberately — see Decision 1) and matches `config.yaml`'s `selectors: data-testid` policy.

## Architecture Decisions

### Decision 1: Page object location — `tests/pages/` (not co-located folders)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Flat `tests/pages/*.ts` + flat `tests/*.spec.ts`** (this proposal) | Matches the project's existing 19 flat specs; grep-friendly; one import path; minimal filesystem churn | ✅ |
| Co-located `tests/{rutinas,feriados,...}/{name}.ts` + `{name}.spec.ts` | Per the Playwright skill — keeps a feature's page object, spec, and doc together | ❌ |
| `tests/page-objects/` (kebab-case folder) | Style mismatch — project uses lowercase kebab for dirs already; double-nesting adds noise | ❌ |

**Rationale**: The project already has 19 flat `.spec.ts` files. Introducing a new layout for 5 specs would fragment the convention. `tests/pages/` is a flat sibling of `tests/{unit,utils,setup.ts}` — discoverable, idiomatic for this codebase. The Playwright skill's co-located layout is correct for a fresh project; here, the cost of restructuring 19 existing files outweighs the benefit.

### Decision 2: Helpers module — `tests/helpers.ts` (not a Playwright `setupFiles`)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **`tests/helpers.ts` + per-spec import** | Matches existing style (no global setup); tree-shakeable; explicit dependencies | ✅ |
| `tests/playwright-setup.ts` + `playwright.config.ts:setupFiles` | Auto-loaded, but hides dependencies and forces every test to pay the import cost | ❌ |
| Add to `tests/setup.ts` (the existing Vitest file) | Would be ignored by Playwright AND would couple to Vitest globals (`vi`, `@testing-library/react`) | ❌ |

**Rationale**: `tests/setup.ts` is **Vitest-only** (imports `vi` and `@testing-library/react`). It is not wired into Playwright. A naïve refactor that adds Playwright helpers to `tests/setup.ts` would either be ignored or break the Vitest run. We use a sibling module.

### Decision 3: Test isolation — `serial` mode + REST-API cleanup in `afterEach` (not Prisma transaction rollback)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **`test.describe.configure({ mode: 'serial' })` + `cleanTestData(page)` in `afterEach` via REST** | Matches existing `cleanupTestPromociones` pattern (`promocion-e2e.spec.ts:41-50`); no Prisma coupling; tests stay independent of DB internals | ✅ |
| Prisma `$transaction` rollback in a custom `beforeEach` | Stronger isolation but couples E2E to Prisma + requires a per-test fixture transaction wrapper | ❌ |
| `prisma db:reset` between suites | Slow (5-8s each); serializes suites | ❌ |

**Rationale**: The existing E2E pattern is REST-API-based cleanup (`createTestPromocion` + `cleanupTestPromociones` are already in `promocion-e2e.spec.ts`). The data-testid for tests is the `TEST_*` prefix on the `nombre`/`titulo`/`dni` field — every created record is filterable by name. The cleanup helper iterates `/api/{promociones,feriados,rutinas,descuentos-duracion,trainers}` and deletes records where the discriminator field starts with `TEST_`. **Test users do NOT need per-test creation** — the seeded admin (`DNI: 11111111`, password: `nando123`) is the only auth principal; the new specs don't create competing non-admin users (the `security-admin.spec.ts` skip-block already established that there's no sign-up flow).

### Decision 4: Selector priority — `getByRole`/`getByLabel` first, `data-testid` only where stable

The project config (`config.yaml:286`) requires `data-testid`. The Playwright skill prefers role/label and uses `data-testid` as a last resort. We **blend both**: try role/label first in each page-object method, fall back to `data-testid` only for elements with no stable accessible name (e.g., dynamic list rows, the calendar date input which has no visible label).

```typescript
// RoutineAdminPage.ts — typical method
async fillNombre(value: string): Promise<void> {
  // Strategy 1 (preferred): form input has a visible <label>nombre</label>
  const byLabel = this.page.getByLabel('Nombre');
  if (await byLabel.count() > 0) {
    await byLabel.fill(value);
    return;
  }
  // Strategy 2 (fallback): data-testid added by this change
  await this.page.getByTestId('rutina-nombre-input').fill(value);
}
```

**Rationale**: Role/label is more resilient to refactors (the test still passes if the testid gets renamed). `data-testid` is a contract for elements where the accessible name is dynamic (e.g., a row for "Feriado 2026-12-25" has no unique role-name — `data-testid="feriado-list-item"` is the only stable handle). This minimizes the number of `data-testid` attributes we need to add to app code.

### Decision 5: `test:fast` script — add `concurrently` + `wait-on` (new devDeps)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Add `concurrently` + `wait-on` devDeps; one script pre-starts `pnpm dev` then runs `pnpm test --grep-invert @slow`** | Single command, no manual coordination, ~40 KB dev-only | ✅ |
| Document manual 2-terminal workflow in `tests/README.md` | Zero new deps, but every dev has to remember the pattern | ❌ |
| Use bash `&` + `kill` inline in a `node` script | Reinvents `concurrently` for no benefit | ❌ |

**Rationale**: The proposal explicitly calls for the `test:fast` script. Manual 2-terminal docs are easy to forget and break the "run tests fast" goal. `concurrently` (≥1M weekly downloads) and `wait-on` (≥5M weekly downloads) are tiny, well-trusted, dev-only dependencies. Both are pure Node — no native compilation, no CI friction.

The script:

```json
"test:fast": "concurrently -k -n dev,test -c blue,green \"pnpm dev\" \"wait-on http://localhost:3000 && pnpm test --grep-invert @slow\""
```

Tag the slow security-admin suite (the proposal's "5-8 minute" offender) with `@slow` so the `--grep-invert` filter excludes it. **Caveat to document in `tests/README.md`**: the first run is still slow (Next.js dev cold start on the homepage route takes 10-30s per `gym-config.spec.ts:5-7`). The "fast" is in subsequent runs within the same dev-server lifetime.

### Decision 6: Page object shape — thin wrappers, NO business logic

| Method | Return | Notes |
|--------|--------|-------|
| `goto()` | `Promise<void>` | Navigate to the page; wait for `loading.tsx` skeleton to disappear |
| `fillNombre(value: string)` | `Promise<void>` | Single-field action; role/label-first selector strategy |
| `submit()` | `Promise<void>` | Click the create/save submit; wait for the success toast |
| `expectVisible()` | `Promise<void>` | Assert the page is fully loaded (post-hydration) |
| `getById(id: string)` | `Locator` | Escape hatch for one-off assertions |

**Forbidden inside page objects** (per the Playwright skill's "thin wrapper" guideline):
- Cross-page navigation
- Auth flows (login is in `helpers.ts`, not in `AuthPage.goto()` — `AuthPage.goto()` navigates and asserts the form, but does NOT submit credentials)
- Data cleanup
- Direct API calls

**Rationale**: Page objects that know too much become god-objects. Each method should be the smallest user-meaningful action (fill one field, click one button). Tests compose these into scenarios.

### Decision 7: Strict TDD order for this change

Per `openspec/config.yaml` (no explicit `strict_tdd: true`, but the orchestrator protocol declared it ACTIVE for this change) and the project's `no_false_green: true` policy, the order of writing/committing is:

1. **RED** — write `tests/helpers.ts` + the 6 page objects (they have no behavior yet, so this is a skeleton commit, not a failing test).
2. **RED** — write a `tests/rutinas.spec.ts` with one failing happy-path test (it fails because the page object is a skeleton and the data-testid doesn't exist).
3. **GREEN** — add the `data-testid` attributes to `RutinaCompletaForm` + the `rutinas-list-client` item wrapper; flesh out the page object methods.
4. **REFACTOR** — repeat for the remaining 4 specs.

The "skeleton page object" is allowed because the helper layer has no behavior to test — it's pure plumbing. The first failing spec is the first slice's happy-path test.

### Decision 8: Data-testid additions — additive only, never removing existing testids

The design patches `data-testid` into 6 components. **No existing testid is renamed or removed.** The new testids follow the existing kebab-case pattern:

| Component | New testids |
|-----------|-------------|
| `FeriadoManager` | `feriado-add-button`, `feriado-date-input`, `feriado-todo-dia-checkbox`, `feriado-hora-inicio-input`, `feriado-hora-fin-input`, `feriado-submit-button`, `feriado-list-item`, `feriado-edit-button`, `feriado-delete-button`, `feriado-error` |
| `PromocionManager` + `PromocionForm` | `promocion-add-button`, `promocion-titulo-input`, `promocion-descripcion-input`, `promocion-precio-input`, `promocion-submit-button`, `promocion-list-item`, `promocion-edit-button`, `promocion-delete-button` |
| `DescuentoDuracionManager` | `descuento-add-button`, `descuento-porcentaje-input`, `descuento-min-meses-input`, `descuento-max-meses-input`, `descuento-submit-button`, `descuento-list-item`, `descuento-delete-button` |
| `TrainerManager` | `trainer-add-button`, `trainer-name-input`, `trainer-dni-input`, `trainer-password-input`, `trainer-submit-button`, `trainer-list-item`, `trainer-delete-button` |
| `RutinasListClient` (admin list) | `rutina-list-item`, `rutina-list-item-nombre` |
| `RutinaCompletaForm` | `rutina-nombre-input`, `rutina-tipo-select`, `rutina-descripcion-input`, `rutina-create-button`, `rutina-save-button` |
| `AdminLoginPage` | `login-error-message` (the toast root) |

**Rationale**: additive-only changes minimize the risk of breaking the 6 existing specs that currently use accessible-name selectors. We can rename later if we want — but we don't have to.

## File Changes

### New files

| File | Purpose | Approx LOC |
|------|---------|-----------|
| `tests/helpers.ts` | `loginAsAdmin`, `cleanTestData`, `waitForToast`, `waitForServerAction`, `seedTestData` | ~120 |
| `tests/pages/base-page.ts` | `BasePage` with `waitForToast`, `waitForNetworkIdle`, `getByTestId` wrapper | ~40 |
| `tests/pages/AuthPage.ts` | Login form interactions | ~50 |
| `tests/pages/RoutineAdminPage.ts` | `/admin/rutinas`, `/admin/rutinas/new`, `/admin/rutinas/[id]` | ~120 |
| `tests/pages/FeriadoAdminPage.ts` | `/admin/feriados` | ~100 |
| `tests/pages/PromocionAdminPage.ts` | `/admin/promociones` | ~100 |
| `tests/pages/DescuentoAdminPage.ts` | `/admin/descuentos-duracion` | ~80 |
| `tests/pages/TrainerAdminPage.ts` | `/admin/trainers` | ~100 |
| `tests/fixtures/rutina.fixture.ts` | Default test rutina payload | ~30 |
| `tests/fixtures/feriado.fixture.ts` | Default test feriado payload | ~30 |
| `tests/fixtures/promocion.fixture.ts` | Default test promocion payload | ~30 |
| `tests/fixtures/descuento.fixture.ts` | Default test descuento payload | ~25 |
| `tests/fixtures/trainer.fixture.ts` | Default test trainer payload | ~25 |
| `tests/rutinas.spec.ts` | 5+ tests for rutina CRUD | ~180 |
| `tests/feriados-crud.spec.ts` | 5+ tests for feriado CRUD | ~180 |
| `tests/promociones-descuentos.spec.ts` | 6+ tests for promo + descuento CRUD | ~220 |
| `tests/trainers.spec.ts` | 4+ tests for trainer CRUD | ~150 |
| `tests/auth.spec.ts` | 5+ tests for auth happy + error paths | ~180 |
| `tests/README.md` | How to run (manual + `test:fast`), selector conventions, isolation rules | ~80 |

**Subtotal new: ~1,840 LOC** (specs + page objects + helpers + fixtures + README).

### Modified files

| File | Change | Approx LOC |
|------|--------|-----------|
| `playwright.config.ts` | `retries: process.env.CI ? 2 : 1` (was `0`); add `timeout: 30_000`; add `expect.toHaveScreenshot` config (no — out of scope, skip) | ±5 |
| `package.json` | Add `concurrently` + `wait-on` devDeps; add `test:fast` script; tag `security-admin.spec.ts` with `@slow` (file header comment, not JSON) | ±10 |
| `tests/utils/security-helpers.ts` | **Delete the broken `loginAsAdmin` helper** (uses wrong credentials `12345678/admin123`); keep the OTHER exports (`createTestUser`, `setExpiredCookie`, `clearSession`, `getRoutineIds`, `apiRequest`) | −20 |
| `tests/gym-config.spec.ts` | Replace inline `loginAsAdmin` (line 97) with `import { loginAsAdmin } from './helpers'` | ±3 |
| `tests/admin-e2e.spec.ts` | Same — replace inline `loginAsAdmin` (line 8) | ±3 |
| `tests/promocion-e2e.spec.ts` | Same — replace inline (line 17) | ±3 |
| `tests/security-admin.spec.ts` | Same — replace inline (line 65); add `@slow` tag to the suite | ±5 |
| `tests/dnd-rutina.spec.ts` | Same — replace inline (line 6) | ±3 |
| `tests/cache-invalidation.spec.ts` | Same — replace inline (line 240) | ±3 |
| `src/components/admin/feriado-manager.tsx` | Add 10 `data-testid` attributes | +10 |
| `src/components/admin/promocion-form.tsx` + `promocion-manager.tsx` | Add 8 `data-testid` attributes | +8 |
| `src/components/admin/descuento-duracion-manager.tsx` | Add 7 `data-testid` attributes | +7 |
| `src/components/admin/trainer-manager.tsx` | Add 7 `data-testid` attributes | +7 |
| `src/components/admin/rutinas-list-client.tsx` | Add 2 `data-testid` attributes (list item + name) | +2 |
| `src/components/admin/rutina-completa-form.tsx` | Add 5 `data-testid` attributes | +5 |
| `src/app/(auth)/admin/login/page.tsx` | Add 1 `data-testid="login-error-message"` to the toast container | +1 |

**Subtotal modified: ~+37 app LOC, +37 test-LOC, +0 lines net for the broken helper deletion.**

### Untouched

- All 19 existing `.spec.ts` files (the inline-helper replacements are in-place edits, not behavioral changes).
- `tests/setup.ts` (Vitest-only — see Decision 2).
- `prisma/seed.ts` (the seeded admin `11111111/nando123` is the contract).
- All API routes (no new endpoints, no schema changes).

## Test Infrastructure Design

### 5.1 `tests/helpers.ts` API

```typescript
import type { Page, APIRequestContext } from '@playwright/test';

/**
 * Logs in as the seeded admin (DNI: 11111111, password: nando123).
 * Replaces the 9 inline copies. Waits for the dashboard h1 to confirm
 * full hydration (avoids the GGA-FOLLOWUP-4 "saveField" race where
 * subsequent navigations hit the admin layout before it renders).
 */
export async function loginAsAdmin(page: Page): Promise<void>;

/**
 * Deletes every record across /api/{promociones,feriados,rutinas,descuentos-duracion,trainers}
 * whose discriminator field (titulo/nombre/dni) starts with `TEST_`. Use
 * this in `afterEach` of every spec that creates test data.
 */
export async function cleanTestData(page: Page): Promise<void>;

/**
 * Waits for a sonner toast to appear with the given message (substring match).
 * Returns the toast locator so callers can assert visibility or wait for dismissal.
 */
export function waitForToast(page: Page, message: string | RegExp): Promise<Locator>;

/**
 * Waits for a server action POST response to complete. Matches the
 * `useActionState` pattern: `response.url().includes('/admin/...') && status === 200`.
 */
export function waitForServerAction(page: Page, actionPath: string): Promise<Response>;

/**
 * Creates a fresh admin user via the `/api/auth/sign-up` endpoint.
 * NOT USED in the new specs (the seeded admin is the single auth principal),
 * but exported for future use cases. Mirrors the existing
 * `security-helpers.ts:createTestUser` — we re-export it from here to
 * consolidate.
 */
export async function seedTestAdminUser(): Promise<{ dni: string; password: string }>;
```

### 5.2 `tests/pages/base-page.ts`

```typescript
import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Navigate to the page and wait for the loading skeleton to disappear. */
  abstract goto(): Promise<void>;

  /** Assert the page is fully loaded (post-hydration). */
  abstract expectVisible(): Promise<void>;

  /** Common: wait for the admin layout sidebar to render (sentinel for hydration). */
  protected async waitForAdminLayout(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /Panel de Administr/i }))
      .toBeVisible({ timeout: 15_000 });
  }

  /** Common: wait for a sonner toast. */
  protected waitForToast(message: string | RegExp): Promise<Locator> {
    return waitForToast(this.page, message);
  }
}
```

### 5.3 Page objects — constructor signature + key methods

#### `AuthPage extends BasePage`

```typescript
constructor(page: Page);

goto(): Promise<void>;           // → /admin/login; wait for DNI input
loginAsAdmin(): Promise<void>;   // fills seeded credentials + submits
fillDni(value: string): Promise<void>;
fillPassword(value: string): Promise<void>;
submit(): Promise<void>;         // clicks submit; waits for /admin redirect
expectError(expected: string | RegExp): Promise<void>;  // asserts login-error-message toast
```

**Locators** (role/label first, data-testid fallback):
- `dniInput` → `getByLabel('DNI')` (the login form has `<label>DNI</label>` per `src/app/(auth)/admin/login/page.tsx:80+`)
- `passwordInput` → `getByLabel('Contraseña')`
- `submitButton` → `getByRole('button', { name: /Iniciar sesi/i })`
- `errorToast` → `getByTestId('login-error-message')` (the new testid)

#### `RoutineAdminPage extends BasePage`

```typescript
constructor(page: Page);

goto(): Promise<void>;                // → /admin/rutinas
gotoNew(): Promise<void>;             // → /admin/rutinas/new (waits for dynamic-import hydration)
fillNombre(value: string): Promise<void>;
fillDescripcion(value: string): Promise<void>;
selectTipo(value: 'Fuerza' | 'Hipertrofia' | 'Resistencia' | 'Movilidad'): Promise<void>;
submitCreate(): Promise<void>;
expectCreated(nombre: string): Promise<void>;  // waits for the toast + list visibility
deleteByName(nombre: string): Promise<void>;   // confirms via the delete dialog
expectInList(nombre: string): Promise<void>;
```

**Locators**:
- `nombreInput` → `getByLabel('Nombre')` OR `getByTestId('rutina-nombre-input')`
- `submitCreateButton` → `getByTestId('rutina-create-button')` (the form has a `Crear rutina` button)
- `listItem(nombre)` → `page.locator(`[data-testid="rutina-list-item"]:has-text("${nombre}")`)`

#### `FeriadoAdminPage extends BasePage`

```typescript
constructor(page: Page);

goto(): Promise<void>;
fillFecha(value: string): Promise<void>;          // YYYY-MM-DD
toggleTodoDia(checked: boolean): Promise<void>;
fillHoraInicio(value: string): Promise<void>;     // HH:mm
fillHoraFin(value: string): Promise<void>;
submitCreate(): Promise<void>;
expectCreated(fecha: string): Promise<void>;
expectDuplicateError(): Promise<void>;            // 409 path
deleteByFecha(fecha: string): Promise<void>;
expectNotInList(fecha: string): Promise<void>;
```

**Locators**:
- `fechaInput` → `getByTestId('feriado-date-input')` (no stable accessible name on a date input)
- `todoDiaCheckbox` → `getByTestId('feriado-todo-dia-checkbox')`
- `listItem(fecha)` → `[data-testid="feriado-list-item"]:has-text("${fecha}")`

#### `PromocionAdminPage extends BasePage`

```typescript
constructor(page: Page);

goto(): Promise<void>;
fillTitulo(value: string): Promise<void>;
fillDescripcion(value: string): Promise<void>;
fillPrecio(value: number): Promise<void>;
submitCreate(): Promise<void>;
editByTitulo(titulo: string): Promise<void>;
expectInList(titulo: string): Promise<void>;
deleteByTitulo(titulo: string): Promise<void>;
expectNotInList(titulo: string): Promise<void>;
```

#### `DescuentoAdminPage extends BasePage`

```typescript
constructor(page: Page);

goto(): Promise<void>;
fillPorcentaje(value: number): Promise<void>;     // 0-100
fillMinMeses(value: number): Promise<void>;
fillMaxMeses(value: number): Promise<void>;
submitCreate(): Promise<void>;
expectInList(porcentaje: number): Promise<void>;
deleteByPorcentaje(porcentaje: number): Promise<void>;
expectValidationError(field: 'porcentaje' | 'minMeses' | 'maxMeses'): Promise<void>;
```

#### `TrainerAdminPage extends BasePage`

```typescript
constructor(page: Page);

goto(): Promise<void>;
fillName(value: string): Promise<void>;
fillDni(value: string): Promise<void>;
fillPassword(value: string): Promise<void>;
submitCreate(): Promise<void>;
expectCreated(dni: string): Promise<void>;
softDeleteByDni(dni: string): Promise<void>;
expectNotActive(dni: string): Promise<void>;
```

### 5.4 Test isolation — `serial` mode + cleanup contract

Each spec opens with:

```typescript
test.describe('Rutina CRUD', () => {
  test.describe.configure({ mode: 'serial' });  // tests run in order; one worker
  test.use({ storageState: undefined });          // fresh cookies per test

  test.afterEach(async ({ page }) => {
    await cleanTestData(page);  // deletes all TEST_* records
  });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await routinePage.goto();
  });

  test('S1.1 - create rutina end-to-end', async ({ page }) => { /* ... */ });
  test('S1.2 - edit rutina and verify persistence', async ({ page }) => { /* ... */ });
  // ...
});
```

**Why `serial` for state-mutating suites**: the existing `cleanupTestPromociones` (and now `cleanTestData`) is a "delete everything matching TEST_*" sweep. It is correct, but if two workers run the same cleanup concurrently, they may race on the same row → false 404 in one worker's logs, harmless but noisy. Serial mode eliminates the race and matches the proposal's R2 mitigation.

**Why not `serial` for read-only suites**: `homepage.spec.ts` and `cache-invalidation.spec.ts` are read-only and run fine in parallel (the proposal leaves them untouched).

**Auth state**: `test.use({ storageState: undefined })` forces a fresh login per test. We don't share a logged-in session across tests because the prior test's mutation could leak into the next test's login. The cost is ~2-3s per test (login is fast), the benefit is hermetic tests.

### 5.5 Selector priority recap

Order of attempts inside each page-object method (matches Playwright skill + project policy):

1. `getByRole('button' | 'link' | 'heading', { name: ... })` — for interactive elements with visible text.
2. `getByLabel('Visible Label')` — for form inputs with associated `<label>`.
3. `getByText('Unique static text')` — for static content (rare).
4. `getByTestId('feature-element')` — for elements without stable accessible names (date inputs, dynamic list rows, toast containers).

The 33 new `data-testid` attributes are listed in Decision 8. We patch them additively.

## 6. Spec File Design

### 6.1 `tests/rutinas.spec.ts` — 5+ tests (Slice 1)

| ID | Scenario | Assertions |
|----|----------|-----------|
| `S1.1` | Create rutina end-to-end (happy path) | After submit: toast "Rutina creada", `/admin/rutinas` shows the new name, API GET returns it |
| `S1.2` | Edit rutina and verify persistence | Open edit page, change name, save, reload, new name persists in API |
| `S1.3` | Delete rutina from list | Click delete on a TEST_ rutina, confirm dialog, list no longer shows it, API GET 404 |
| `S1.4` | List shows TEST_ rutinas and hides non-TEST_ | Create 2 TEST_ rutinas, list shows both; create 1 non-TEST_ via API, list does NOT show it (proves the test-data isolation is visible to the user) |
| `S1.5` | Reorder dias via dnd-kit (DND SPEC, separate from skipped `dnd-rutina.spec.ts`) | Use `data-testid="dia-drag-handle-${idx}"` + `keyboard.press` for accessibility-friendly DnD (avoid the mouse-drag flakiness) |

**Why a separate DnD test**: `dnd-rutina.spec.ts` is fully skipped due to mouse-drag flakiness. Using `keyboard` interaction with `dnd-kit` (the project uses `@dnd-kit/core`) is a known stable pattern — the library exposes `aria-roledescription="sortable"` on the items and supports keyboard sensor natively.

### 6.2 `tests/feriados-crud.spec.ts` — 5+ tests (Slice 2)

| ID | Scenario | Assertions |
|----|----------|-----------|
| `S2.1.1` | Create feriado (full day) | Pick future date, toggle full-day on, submit, list shows it, API returns it |
| `S2.2.1` | Create feriado (partial hours) | Pick future date, toggle full-day off, fill `09:00`/`18:00`, submit, list shows it with hours |
| `S2.3.1` | Reject past date | Pick yesterday, submit, expect inline error "No se pueden seleccionar fechas pasadas" |
| `S2.4.1` | Reject inverted hours | Full-day off, `hora_inicio=18:00`, `hora_fin=09:00`, expect error "La hora de inicio debe ser menor que la hora de fin" |
| `S2.5.1` | Delete feriado | Create one, delete, list no longer shows it |
| `S2.6.1` | Duplicate date (409) | Create one, attempt to create a second on the same date, expect server-action error |

### 6.3 `tests/promociones-descuentos.spec.ts` — 6+ tests (Slice 2)

Promociones (3):
- `S2.P.1` Create promocion via form (the existing `promocion-e2e.spec.ts` skips this — see Engram #200)
- `S2.P.2` Edit promocion, save, persistence
- `S2.P.3` Delete promocion via UI

Descuentos (3):
- `S2.D.1` Create descuento (happy path)
- `S2.D.2` Create descuento with `porcentaje > 100` → validation error
- `S2.D.3` Delete descuento

### 6.4 `tests/trainers.spec.ts` — 4+ tests (Slice 3)

| ID | Scenario | Assertions |
|----|----------|-----------|
| `S3.T.1` | Create trainer end-to-end | Fill name/DNI/password, submit, list shows it, login as the new trainer works |
| `S3.T.2` | Edit trainer name | Click edit, change name, save, list shows new name |
| `S3.T.3` | Soft-delete trainer (role → USER) | Click delete, confirm, trainer no longer appears in the list, login as trainer now redirects to `/` |
| `S3.T.4` | Reject duplicate DNI | Create one, attempt to create a second with the same DNI, expect error |

### 6.5 `tests/auth.spec.ts` — 5+ tests (Slice 3)

| ID | Scenario | Assertions |
|----|----------|-----------|
| `S3.A.1` | Login with valid credentials (the proposal's "8.1.2 gap") | Fill DNI + password, submit, redirected to `/admin`, session cookie set |
| `S3.A.2` | Login with invalid DNI | Submit, stay on `/admin/login`, toast "DNI o contraseña incorrectos" |
| `S3.A.3` | Login with invalid password | Same as 3.A.2 |
| `S3.A.4` | Logout from profile dropdown | Login, open profile, click "Cerrar sesión", redirected to `/admin/login`, session cookie cleared |
| `S3.A.5` | Session expiry | Use `setExpiredCookie` helper (existing, in `security-helpers.ts:110`), navigate to `/admin`, redirected to `/admin/login` |

The `setExpiredCookie` helper is preserved (not deleted) and re-exported from `tests/helpers.ts` so the new auth spec can use it.

## 7. Implementation Order (work units)

Per `work-unit-commits` skill: each commit is a reviewable work unit, tests/docs go with the behavior they verify. The 4 PRs (stacked-to-main) correspond to the 4 slices in the proposal.

### Slice 0 — Test infrastructure refactor (PR 0, 3 commits)

| # | Commit | Files | Story |
|---|--------|-------|-------|
| T0.1 | `refactor(tests): extract tests/helpers.ts` | `tests/helpers.ts` (new), `tests/{gym-config,admin-e2e,promocion-e2e,security-admin,dnd-rutina,cache-invalidation}.spec.ts` (in-place `loginAsAdmin` → import), `tests/utils/security-helpers.ts` (delete broken helper) | "All 9 inline `loginAsAdmin` copies consolidated into one helper" |
| T0.2 | `feat(tests): add base-page + 6 page object skeletons` | `tests/pages/{base-page,AuthPage,RoutineAdminPage,FeriadoAdminPage,PromocionAdminPage,DescuentoAdminPage,TrainerAdminPage}.ts` (all new) | "Test infrastructure for the 5 critical admin flows + auth" |
| T0.3 | `chore(playwright): retries: 1 + test:fast script` | `playwright.config.ts`, `package.json` (add devDeps + script), `tests/security-admin.spec.ts` (add `@slow` tag) | "Mitigate GGA-FOLLOWUP-4 (retries) and GGA-FOLLOWUP-5 (test:fast)" |

**Why T0.2 is ONE commit with 7 files** (6 page objects + base): they're a single conceptual deliverable ("the page-object layer for the 5 critical admin flows + auth"). Splitting into 7 micro-commits would be overhead — no test exercises them yet, so a code review can scan all 7 files as a unit. Each file is small (40-120 LOC).

**T0.3 ordering rationale**: `test:fast` needs `concurrently` + `wait-on` to be installed (which requires a `pnpm install`); the retries change is independent. Both go in the same commit to keep the slice 0 PR reviewable in one pass.

### Slice 1 — Rutinas E2E (PR 1, 2 commits)

| # | Commit | Files | Story |
|---|--------|-------|-------|
| T1.1 | `test(e2e+app): add rutinas RED-GREEN slice` | `src/components/admin/rutinas-list-client.tsx` (2 testids), `src/components/admin/rutina-completa-form.tsx` (5 testids), `tests/rutinas.spec.ts` (new, 5 tests) | "Rutina CRUD: 5 E2E tests + 7 data-testid additions" |

**Why T1.1 is ONE commit with app + test**: per `work-unit-commits` "keep tests with code" — the new spec REQUIRES the testids; without them, the spec is a failing test that nobody can merge. They're one work unit ("add E2E coverage for rutina CRUD").

### Slice 2 — Feriados + Promos + Descuentos E2E (PR 2, 3 commits)

| # | Commit | Files | Story |
|---|--------|-------|-------|
| T2.1 | `test(app): add data-testid for feriado/promo/descuento` | `src/components/admin/{feriado-manager,promocion-form,promocion-manager,descuento-duracion-manager}.tsx` (25 testids) | "Stable selectors for 3 admin flows" |
| T2.2 | `test(e2e): add feriados-crud.spec.ts` | `tests/feriados-crud.spec.ts` (new, 6 tests) | "Feriado CRUD: 6 E2E tests covering happy + edge cases" |
| T2.3 | `test(e2e): add promociones-descuentos.spec.ts` | `tests/promociones-descuentos.spec.ts` (new, 6 tests) | "Promocion + descuento CRUD: 6 E2E tests" |

**Why T2.1 is separate from T2.2/T2.3**: the data-testid patch is reviewable on its own (25 lines across 4 components, no behavior change). Splitting it from the specs lets a reviewer focus on "is the testid naming consistent?" before "is the test logic correct?". The specs depend on the testids but the testids are independently mergeable.

### Slice 3 — Trainers + Auth + Isolation (PR 3, 4 commits)

| # | Commit | Files | Story |
|---|--------|-------|-------|
| T3.1 | `test(app): add data-testid for trainer/auth` | `src/components/admin/trainer-manager.tsx` (7 testids), `src/app/(auth)/admin/login/page.tsx` (1 testid) | "Stable selectors for trainer CRUD + auth error toast" |
| T3.2 | `test(e2e): add trainers.spec.ts` | `tests/trainers.spec.ts` (new, 4 tests) | "Trainer CRUD: 4 E2E tests including soft-delete" |
| T3.3 | `test(e2e): add auth.spec.ts` | `tests/auth.spec.ts` (new, 5 tests) | "Auth flow: 5 E2E tests closing the 8.1.2 gap" |
| T3.4 | `fix(tests): 5.2.3 isolation — serial + afterEach cleanup` | `tests/{rutinas,feriados-crud,promociones-descuentos,trainers,auth}.spec.ts` (add `test.describe.configure({ mode: 'serial' })` + `test.afterEach(cleanTestData)`) | "Hermetic isolation for the new specs (fixes 5.2.3 root cause for this slice)" |

**Why T3.4 is separate from T3.2/T3.3**: the spec files are already in the "happy" pattern from the previous slices. T3.4 is the "production hardening" pass — adding the isolation hooks AFTER the specs are written and approved makes the diff for T3.4 small and reviewable ("is the isolation correct?") independent of "is the test logic correct?".

**Total work units: 12 commits across 4 PRs.** Per the chained-pr skill's "≤60 min review" budget, each PR is 3-4 commits totaling ~500-600 LOC. None exceed the 400-line hard limit (the largest is T1.1 at ~180 test LOC + 7 testid additions = ~190 LOC, well under 400).

## 8. Risks (technical-level)

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|-----------|
| **R1** | Page objects drift from app changes | Med | Med | Thin wrapper policy (Decision 6); one-method-per-user-action; no business logic in page objects |
| **R2** | New specs inherit `saveField` flakiness (GGA-FOLLOWUP-4) | Med | Med | `retries: 1` in `playwright.config.ts` (T0.3); `waitForServerAction` helper waits for the POST response, not a fixed timeout |
| **R3** | data-testid additions are a cross-cutting app-code change | Low | Med | Additive only (Decision 8); no rename of existing testids; 33 total additions across 7 files; reviewable per-component |
| **R4** | 5-8 min shell execution time is a UX issue | Low | Low | `test:fast` script (Decision 5) with `concurrently` + `wait-on`; `@slow` tag on `security-admin.spec.ts`; `reuseExistingServer: !process.env.CI` already keeps dev server warm |
| **R5** | Test isolation depends on REST-API cleanup, not transactional rollback | Med | High | Picked REST cleanup (Decision 3) — matches existing `cleanupTestPromociones` pattern; `TEST_*` prefix is the discriminator; `serial` mode eliminates worker race; `cleanTestData` is in `afterEach` of every new spec |
| **R6** | `RutinaCompletaForm` is dynamically imported with `ssr: false` (hydration race) | Med | Med | `RoutineAdminPage.gotoNew()` waits for `form:visible` after navigation; the new spec does not interact with the form until the hydration gate passes |
| **R7** | The new `cleanTestData` deletes records the seeded admin might be using | Low | High | Discriminator is `TEST_` prefix on `nombre`/`titulo`/`dni`; seeded records never start with `TEST_`; defense-in-depth via `serial` mode means no concurrent deletes |
| **R8** | The `@slow` tag on `security-admin.spec.ts` is a file-header comment, not a test tag → `grep-invert` won't match | Med | Low | Use `test.describe()` with `tag: '@slow'` on the describe block (Playwright supports per-test/per-describe tags) |

## 9. Success Criteria

Per the proposal (with verification paths):

- [ ] **S1 (Rutinas)**: 5+ E2E tests in `tests/rutinas.spec.ts`, all green in <60s.
- [ ] **S2 (Feriados + Promos + Descuentos)**: 12+ E2E tests across 2 spec files, all green in <90s.
- [ ] **S3 (Trainers + Auth)**: 9+ E2E tests across 2 spec files, all green in <60s.
- [ ] **No inline `loginAsAdmin`**: `grep -r "function loginAsAdmin" tests/` returns 0 matches.
- [ ] **`retries: 1` applied**: `playwright.config.ts:8` reads `process.env.CI ? 2 : 1`.
- [ ] **`test:fast` works**: `pnpm test:fast` runs in <2 min (vs 5-8 min for `pnpm test`).
- [ ] **5.2.3 stays green**: the existing isolation-issue spec passes.
- [ ] **0 `data-testid` renames**: `git diff openspec/changes/.../data-testid` shows only additions.
- [ ] **Vitest 100% green**: `pnpm test:unit` is unaffected by the test changes.
- [ ] **Build succeeds**: `pnpm build` is green.
- [ ] **TypeScript clean**: `pnpm tsc --noEmit` shows 0 new errors (3 pre-existing in `tests/gga-diff-filter.test.ts` remain documented).

## 10. References

- `openspec/changes/e2e-coverage-critical-flows/proposal.md` — intent, scope, 4 slices
- Engram #100 — sdd-init project context
- Engram #198 — previous cycle (gga-hook-diff-only) archive report
- Engram #200 — inventory discovery (the gap this change fills)
- Engram #203 — 9 (not 8) loginAsAdmin copies + broken helper
- `tests/setup.ts` — Vitest-only (do NOT add Playwright helpers here)
- `playwright.config.ts` — current `retries: 0`; `workers: 1` in CI; `reuseExistingServer: !process.env.CI`
- `src/components/admin/{feriado-manager,promocion-manager,descuento-duracion-manager,trainer-manager,rutinas-list-client,rutina-completa-form}.tsx` — components receiving data-testid patches
- `openspec/config.yaml:285-287` — `selectors: data-testid` policy
- `openspec/config.yaml:262-303` — testing policy (no false green, baseline required, regression policy)
- Skill `playwright` — page object model, selector priority, file structure
- Skill `work-unit-commits` — commit-by-work-unit rule
- Skill `chained-pr` — 400-line budget; stacked-to-main for independent slices
