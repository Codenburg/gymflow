# Delta for E2E Tests — fix-e2e-promociones-descuentos

## ADDED Requirements

### Requirement: S2.P.2 — Edit promocion contract

`PromocionForm` MUST expose `data-testid="promocion-submit-edit-button"` on the edit-mode submit button (distinct from `promocion-submit-button`). `PromocionAdminPage` MUST expose `submitEdit()` that clicks it, and the test MUST assert `toHaveText("Guardar cambios")` before clicking. Test-only fix.

#### Scenario: Edit persists new titulo

- GIVEN a promocion created via UI is visible
- WHEN the test clicks edit, fills a new titulo, asserts button text is "Guardar cambios", then calls `submitEdit()`
- THEN the old titulo MUST disappear within 15s
- AND the new titulo MUST be visible in the list

### Requirement: S2.P.3 + S2.D.3 — Delete via AlertDialog helper

`PromocionAdminPage.deleteByTitulo()` and `DescuentoAdminPage.deleteByPorcentaje()` MUST dismiss the React `AlertDialog` by invoking the existing `clickConfirmDelete(page)` helper at `tests/promociones-descuentos.spec.ts:50-55` (clicks `page.getByRole('button', { name: /^Eliminar$/ })`). Neither method MUST use `page.once('dialog', ...)` — it does not fire for React modals. No duplicate helper SHALL be added.

#### Scenario: Promocion delete removes list item

- GIVEN a promocion is visible
- WHEN `deleteByTitulo()` clicks delete then the `Eliminar` button in the AlertDialog
- THEN the list item MUST be removed within 10s

#### Scenario: Descuento delete removes 20% list item

- GIVEN a descuento with `porcentaje = 20` is visible
- WHEN `deleteByPorcentaje(20)` clicks delete then the `Eliminar` button in the AlertDialog
- THEN the `"20%"` list item MUST be removed within 15s

### Requirement: S2.D.1 + S2.D.4 — Descuentos isolation via reset

`tests/utils/descuentos-reset.ts` (mirroring `gym-reset.ts`) MUST expose `resetDescuentos()` that deletes all `DescuentoDuracion` rows and re-inserts the 4 seed values via direct Prisma. The spec's `beforeEach` MUST call `resetDescuentos()`. The fixture MUST use a `meses` value distinct from {3, 6, 9, 12} to avoid the `@@unique([gymId, meses])` collision.

#### Scenario: Create inserts new descuento after reset

- GIVEN `beforeEach` reset descuentos to 4 seed rows
- AND the fixture uses `meses` not in {3, 6, 9, 12}
- WHEN the test fills porcentaje and submits
- THEN the new descuento MUST appear in the list within 10s

### Requirement: S2.D.4 — Precio final (best-effort, R1 invariant)

S2.D.4 MUST pass when the gym-price cache is warm from a prior test. It MAY fail on cold cache because `getGymPrice` cache invalidation is incomplete (Engram obs #215, OUT OF SCOPE). The test is **best-effort** — retried warm before hard-failing. The test MUST assert `data-testid="descuento-precio-final"` is visible inside the list item, contains `"42.500"` and `"$"`, AND the parent list item contains `"15%"`.

**R1 invariant**: selectors at `tests/promociones-descuentos.spec.ts:67, 267` and `tests/pages/DescuentoAdminPage.ts:113-117` filtering `:has-text("15%")` MUST match exactly one element. The `%` literal MUST stay textually adjacent to the percentage number. The `descuento-precio-final` element MUST be a separate sibling node and MUST NOT contain the `%` literal.

#### Scenario: Precio final renders for 15% descuento with warm cache

- GIVEN `setGymPrice(50000)` ran BEFORE `loginAsAdmin()` so the admin page picks it up on initial RSC render
- AND the cache is warm
- WHEN the test creates a 15% descuento for a non-seed `meses` value
- THEN the list item MUST contain `data-testid="descuento-precio-final"` with text including "42.500" and "$"
- AND the parent list item MUST contain "15%"
- AND `:has-text("15%")` MUST match exactly one element
- AND the matched `descuento-precio-final` child MUST NOT contain the literal `%`

### Requirement: Non-regression of currently-passing tests

S2.P.1, S2.D.2, and S2.D.4-when-warm MUST continue to pass. S2.P.1 MUST stay on `promocion-submit-button`. S2.D.2 (`porcentaje > 100`) MUST stay untouched. The `data-testid` strategy (per `openspec/config.yaml:286`) MUST be preserved.

#### Scenario: S2.P.1 unaffected by edit-mode testid

- GIVEN `data-testid="promocion-submit-edit-button"` exists
- WHEN S2.P.1 runs the create flow
- THEN `submitCreate()` MUST keep using `promocion-submit-button`
- AND S2.P.1 MUST pass unchanged

#### Scenario: S2.D.2 validation error unaffected by reset

- GIVEN `resetDescuentos()` runs in `beforeEach`
- WHEN S2.D.2 fills `porcentaje = 150` and submits
- THEN the inline error `"El porcentaje debe estar entre 0 y 100"` MUST still render
- AND no new descuento MUST be inserted
