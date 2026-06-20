# Design: fix-e2e-promociones-descuentos

## Technical Approach

Test infrastructure fix for 5 pre-existing E2E bugs. Four patterns:
**(1) AlertDialog page-object** (S2.P.3, S2.D.3) — swap `page.once('dialog')` (which never fires for React modals) for the existing `clickConfirmDelete(page)` helper, promoted to `tests/helpers.ts` so page objects can import it without circular dependency.
**(2) Prisma-direct reset** (S2.D.1, S2.D.4) — mirror `tests/utils/gym-reset.ts` with `tests/utils/descuentos-reset.ts`; `beforeEach` resets `DescuentoDuracion` to seed values.
**(3) Edit-mode testid + page-object method** (S2.P.2) — 1 new `data-testid` on the edit-mode submit button, new `submitEdit()` method, explicit `toHaveText("Guardar cambios")` assertion. The production form/manager race is NOT fixed (out of scope per R5).
**(4) MESES_OPTIONS expansion** (S2.D.1, S2.D.4) — expand `MESES_OPTIONS` from `[3, 6, 9, 12]` to `[1, 2, ..., 12]` so the test can use any unique `meses` from the 12 values. This is a real product feature (not a test workaround) — see `ROADMAP.md` §"Expandir MESES_OPTIONS a todos los meses". Tracked in roadmap for visibility.

Maps directly to `specs/e2e-tests/spec.md` ADDED Requirements.

## Architecture Overview

Test infrastructure layering (from `openspec/config.yaml` `architecture.layering`):

- **UI layer** — `tests/specs/*.spec.ts` (E2E test scripts).
- **Application layer** — `tests/pages/*.ts` (page objects), `tests/fixtures/*.ts` (test data factories).
- **Infrastructure layer** — `tests/utils/*.ts` (Prisma direct access for test isolation).

**Module interaction**:
- `clickConfirmDelete(page)` — defined in `tests/helpers.ts` (relocated from spec), imported by spec + both page objects.
- `resetDescuentos()` — new utility in `tests/utils/descuentos-reset.ts`, singleton Prisma client pattern (mirrors `gym-reset.ts`).
- `createDescuentoFixture({ randomMeses: true })` — generates a `meses` value from a non-seed pool (see Open Question Q1).

## Architecture Decisions

### D1: S2.P.2 is test-only (not production)

**Choice**: Add `data-testid="promocion-submit-edit-button"` to the edit-mode `<Button>` in `src/components/admin/promocion-form.tsx:189`; add `submitEdit()` to `PromocionAdminPage`; add `toHaveText("Guardar cambios")` assertion. **No production logic change.**
**Alternatives**: A2 (form `useEffect` ref guard), A3 (`router.refresh()`), A4 (`startTransition`).
**Rationale**: R5 (no real-user bug reported). The 1 testid is a test affordance, not a logic change. Production race is a separate follow-up.

### D2: Reuse `clickConfirmDelete` helper, relocated to `tests/helpers.ts`

**Choice**: Move the helper from `tests/promociones-descuentos.spec.ts:50-55` to `tests/helpers.ts`. Both page objects import it.
**Alternatives**: Duplicate the helper in each page object; pass helper as a parameter to `deleteByTitulo()`/`deleteByPorcentaje()`.
**Rationale**: Importing from the spec file creates a circular dependency (spec imports page objects). Duplication is a maintenance burden. Relocation is not "creating a new helper" — same code, new location. The spec file imports from the new location.

### D3: New `descuentos-reset.ts` mirrors `gym-reset.ts`

**Choice**: New file `tests/utils/descuentos-reset.ts` with `resetDescuentos()` that calls `prisma.descuentoDuracion.deleteMany()` then re-inserts the 4 seed values `{3:10, 6:15, 9:17, 12:20}`. Singleton Prisma client (same pattern as `gym-reset.ts:32-39`).
**Alternatives**: C1 (change fixture `meses`), C3 (test edit instead of create), C4 (no re-seed, restore in `afterAll`).
**Rationale**: Per orchestrator constraint, "do NOT propose alternative approaches". Mirrors established `gym-reset.ts` convention. Tests own their data.

### D4: Unique `meses` per test via `randomMeses` flag + expanded MESES_OPTIONS

**Choice**: Two changes work together:
1. Expand `MESES_OPTIONS` from `[3, 6, 9, 12]` to `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]` in `src/components/admin/descuento-duracion-manager.tsx:35-40` (real product feature, tracked in ROADMAP).
2. Add `randomMeses` flag to `createDescuentoFixture` that returns a `meses` value from a non-seed pool (e.g., 1, 2, 4, 5, 7, 8, 10, 11) — still useful for test determinism even with the expanded form.

**Alternatives**: Re-seed with non-standard values; delete specific `(gymId, meses)` pair before each test.
**Rationale**: The expanded form is a real product improvement (gym admins get more flexibility). The `randomMeses` flag provides extra defense for test isolation. Both changes are small (1 line + 1 helper).

### D5: S2.D.4 is best-effort (R3)

**Choice**: S2.D.4 marked "best-effort" in spec. Verify phase must run S2.D.4 with warm cache (as part of serial suite) to confirm pass. Cold-cache failure is known and accepted.
**Rationale**: Cache invalidation fix (Engram obs #215) is out of scope. R3 in proposal.

## Data Flow

### S2.P.2 — Edit promocion

```
Test (S2.P.2) → PromocionAdminPage.submitEdit()
  → click [data-testid="promocion-submit-edit-button"]
  → form onSubmit (isEditing branch)
  → onSubmitContent({id, titulo, descripcion})
  → updatePromocionContent server action
  → revalidatePath + revalidateTag
  → setPromociones (optimistic)
  → onCancel() (sets editingPromocionId=null)
```

### S2.P.3 / S2.D.3 — Delete via AlertDialog

```
Test → PromocionAdminPage.deleteByTitulo() / DescuentoAdminPage.deleteByPorcentaje()
  → click [data-testid="*-delete-button"]
  → handleDelete → confirm() (useConfirm hook)
  → ConfirmDialog renders <AlertDialog> with "Eliminar" button
  → page.getByRole('button', { name: /^Eliminar$/ }).click() (via clickConfirmDelete helper)
  → onConfirm → deletePromocion / deleteDescuentoDuracion server action
```

### S2.D.1 / S2.D.4 — Descuentos isolation

```
beforeEach → resetDescuentos() (Prisma: deleteMany + re-insert 4 seed)
Test → createDescuentoFixture({ randomMeses: true })
  → fillPorcentaje + submitCreate
  → createDescuentoDuracion server action
  → @@unique([gymId, meses]) satisfied (meses not in seed)
  → list item appears
```

## File Changes

| File | Action | Description | Spec Req |
|------|--------|-------------|----------|
| `tests/helpers.ts` | Modify | Move `clickConfirmDelete` from spec to here; export it. | S2.P.3, S2.D.3 |
| `tests/promociones-descuentos.spec.ts` | Modify | Import `clickConfirmDelete` from `helpers`; add `beforeEach → resetDescuentos()`; add `toHaveText("Guardar cambios")` assertion; change `submitCreate()` → `submitEdit()` in S2.P.2. | S2.P.2, S2.D.1, S2.D.3, S2.D.4 |
| `tests/pages/PromocionAdminPage.ts` | Modify | Add `submitEdit()` method; replace `page.once('dialog')` in `deleteByTitulo()` with `clickConfirmDelete(page)` import. | S2.P.2, S2.P.3 |
| `tests/pages/DescuentoAdminPage.ts` | Modify | Replace `page.once('dialog')` in `deleteByPorcentaje()` with `clickConfirmDelete(page)` import. | S2.D.3 |
| `tests/fixtures/descuento.fixture.ts` | Modify | Add `randomMeses` flag that returns a `meses` value from a non-seed pool. | S2.D.1, S2.D.4 |
| `tests/utils/descuentos-reset.ts` | Create | New Prisma-direct reset utility mirroring `gym-reset.ts`. | S2.D.1, S2.D.4 |
| `src/components/admin/promocion-form.tsx` | Modify | Add `data-testid="promocion-submit-edit-button"` to edit-mode submit button (line 189). | S2.P.2 |
| `src/components/admin/descuento-duracion-manager.tsx` | Modify | Expand `MESES_OPTIONS` from `[3, 6, 9, 12]` to `[1, 2, ..., 12]` (real product feature, tracked in ROADMAP). | S2.D.1, S2.D.4 |

## Interfaces / Contracts

### `tests/utils/descuentos-reset.ts` (new)

```ts
import { PrismaClient } from '../../generated/client';

let prismaSingleton: PrismaClient | null = null;
function getPrisma(): PrismaClient { /* singleton */ }

const SEED_DESCUENTOS = [
  { meses: 3, porcentaje: 10 },
  { meses: 6, porcentaje: 15 },
  { meses: 9, porcentaje: 17 },
  { meses: 12, porcentaje: 20 },
];

export async function resetDescuentos(): Promise<void> {
  // deleteMany + create 4 seed rows; best-effort, never throws
}

export async function closeDescuentosReset(): Promise<void> {
  // $disconnect singleton
}
```

### `PromocionAdminPage.submitEdit()`

```ts
async submitEdit(): Promise<void> {
  await this.page.getByTestId('promocion-submit-edit-button').click();
}
```

### `createDescuentoFixture` with `randomMeses`

```ts
const NON_SEED_MESES = [1, 2, 4, 5, 7, 8, 10, 11];
export function createDescuentoFixture(overrides: Partial<DescuentoFixture> = {}): DescuentoFixture {
  return {
    meses: overrides.meses ?? (overrides.randomMeses ? pickRandom(NON_SEED_MESES) : 3),
    porcentaje: 10 + Math.floor(Math.random() * 20),
    label: ...,
    ...overrides,
  };
}
```

## TDD Order

| Fix | RED | GREEN | REFACTOR |
|-----|-----|-------|----------|
| S2.P.2 | `pnpm exec playwright test -g "S2.P.2"` fails (form in CREATE mode) | Add testid → add `submitEdit()` → add `toHaveText` → test passes | N/A |
| S2.P.3 | `pnpm exec playwright test -g "S2.P.3"` fails (list item still present) | Update `deleteByTitulo()` to use `clickConfirmDelete` → test passes | N/A |
| S2.D.3 | `pnpm exec playwright test -g "S2.D.3"` fails (list item still present) | Update `deleteByPorcentaje()` to use `clickConfirmDelete` → test passes | N/A |
| S2.D.1 | `pnpm exec playwright test -g "S2.D.1"` fails (element not found) | Create `descuentos-reset.ts` → add `beforeEach` → fixture with `randomMeses` → test passes | N/A |
| S2.D.4 | `pnpm exec playwright test -g "S2.D.4"` fails (unique constraint) | Same fixture fix as S2.D.1 → test passes (warm cache) | N/A |

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| E2E (RED) | Confirm 5 tests fail in isolation | `pnpm exec playwright test -g "S2.P.2"` etc. |
| E2E (GREEN) | Confirm 5 tests pass in isolation | Same commands after fix |
| Regression | 3 currently-passing tests still pass | `pnpm exec playwright test tests/promociones-descuentos.spec.ts` (serial mode) |
| Full suite | Deferred to verify phase | `pnpm exec playwright test` (245 tests) |
| TypeScript | `pnpm tsc --noEmit` clean | Verify phase |
| Lint | `pnpm lint` 0 new errors | Verify phase |

## Commit Strategy

Per `work-unit-commits`: 5 atomic commits, each a reviewable work unit.

1. `test(e2e): fix S2.P.2 edit promocion — add edit-mode testid + submitEdit()`
   — `src/components/admin/promocion-form.tsx`, `tests/pages/PromocionAdminPage.ts`, `tests/promociones-descuentos.spec.ts`
2. `test(e2e): fix S2.P.3 delete promocion — use clickConfirmDelete helper`
   — `tests/helpers.ts`, `tests/promociones-descuentos.spec.ts`, `tests/pages/PromocionAdminPage.ts`
3. `test(e2e): fix S2.D.3 delete descuento — use clickConfirmDelete helper`
   — `tests/pages/DescuentoAdminPage.ts`
4. `feat(admin): expand MESES_OPTIONS to all 12 months — give gyms more pricing flexibility`
   — `src/components/admin/descuento-duracion-manager.tsx` (real product feature, tracked in ROADMAP)
5. `test(e2e): fix S2.D.1 + S2.D.4 create descuento — add reset utility + beforeEach + randomMeses fixture`
   — `tests/utils/descuentos-reset.ts`, `tests/fixtures/descuento.fixture.ts`, `tests/promociones-descuentos.spec.ts`

Note: commit #4 is the product feature that enables commits #5's test fix. Commits #4 and #5 are paired.

## Risk Register

| Risk | Lik | Mitigation |
|------|-----|------------|
| **R1** — `:has-text("15%")` coupling at `spec.ts:67,267` + `DescuentoAdminPage.ts:113-117` MUST match | Low | New testid is separate `<span>` (line 373 of `descuento-duracion-manager.tsx`). Re-run S2.D.4 to confirm. |
| **R2** — `deleteByTitulo`/`deleteByPorcentaje` change might affect other callers | Low | Only callers are the 2 affected tests + `afterEach` (already uses `clickConfirmDelete` correctly). Run full suite. |
| **R3** — S2.D.4 cache caveat: passes warm, may fail cold (Engram #215) | Med | Best-effort. Verify phase runs S2.D.4 in serial suite (warm cache). |
| **R5** — S2.P.2 test-only fix does NOT fix underlying form/manager race | Med | Accepted. Production fix separate. |

## Open Questions

- [x] **Q1 — Form `MESES_OPTIONS` expansion**: **RESOLVED** (option a). Expand `MESES_OPTIONS` from `[3, 6, 9, 12]` to `[1, 2, ..., 12]`. This is a real product feature (tracked in ROADMAP §"Expandir MESES_OPTIONS a todos los meses") that gives gym admins more pricing flexibility. The test fix piggybacks on it. D4 updated.
- [x] **Q2 — `clickConfirmDelete` relocation**: **RESOLVED** (yes, acceptable). Relocating an existing helper to `tests/helpers.ts` is not "creating a new helper" — same code, better location. Avoids circular dependency. D2 stands.

## Migration / Rollout

No migration required. Single PR, `git revert` cleanly removes. No schema change, no new server action, no new reader, no new env var, no new package. 1 new testid, 1 new test utility, **1 new product feature (expanded MESES_OPTIONS)** tracked in ROADMAP.
