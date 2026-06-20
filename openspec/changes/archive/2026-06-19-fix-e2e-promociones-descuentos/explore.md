# Exploration: fix-e2e-promociones-descuentos

**Change**: `fix-e2e-promociones-descuentos`
**Artifact store**: hybrid (OpenSpec + Engram)
**Strict TDD**: true (relevant for apply phase; explore is read-only)
**Review budget**: 400 lines

---

## Context

This change fixes 4 pre-existing E2E test bugs in `tests/promociones-descuentos.spec.ts` that were uncovered by the `AdminLayout` strict-mode fix (commit `a1b1990`) and surfaced during the verify phase of the `descuento-precio-final` SDD cycle. All 4 tests fail in isolation (not just in suite). They are pre-existing — not introduced by any recent change. The `descuento-precio-final` verify report already recommends MERGE YES, but the user wants the test infrastructure clean before archiving that change.

### What was confirmed by running each test in isolation (with the seeded DB + docker postgres)

| Test | Line | Failure (verbatim from `pnpm exec playwright test -g "..."`) | Page state at failure |
| --- | --- | --- | --- |
| **S2.P.2** edit promocion | 177 | `expect(locator('[data-testid="promocion-list-item"]').filter({ hasText: '<old titulo>' })).toHaveCount(0)` — **Received: 1, Expected: 0** (15s timeout) | Form is in **CREATE mode** ("Agregar Promoción" heading, "Crear Promoción" button); precio input still shows stale `7156` from the edit; list still has the old titulo |
| **S2.P.3** delete promocion | 202 | `expect(this.listItem(titulo)).toHaveCount(0)` — **Received: 1, Expected: 0** (10s timeout) | Same — list item still present after delete click |
| **S2.D.1** create descuento | 224 | `expect(this.listItem(String(15))).toBeVisible()` — **element(s) not found** (10s timeout) | Form still in CREATE mode with "15" in porcentaje input; list shows seeded descuentos (3, 9, 12 meses) — no new item |
| **S2.D.3** delete descuento | 274 | `expect(locator('[data-testid="descuento-list-item"]').filter({ hasText: '20%' })).toHaveCount(0)` — **Received: 1, Expected: 0** (15s timeout) | List still has the created `20%` item after delete click |

**Additional discovery (not in the original 4 but related)**: S2.D.4 (`descuento list item shows computed Precio final`) ALSO fails in this environment with the same `element(s) not found` error as S2.D.1. The user listed it as passing, but the same unique-constraint root cause applies. Worth flagging to the proposal phase — the scope may need to grow to 5 tests, or the user should re-verify S2.D.4 against a freshly-seeded DB.

**Server-side evidence (dev log during runs)**:
- S2.P.2: 4 POSTs to `/admin/promociones` total across the 4 tests (1 create per test). **The edit POST IS in the log** (the update server action DID run). The list still shows the old titulo.
- S2.D.1: `Error creating descuento: Error [PrismaClientKnownRequestError]: Invalid prisma.descuentoDuracion.create() invocation` — caught by the server action and returned as `{ success: false, errors: { meses: ["Ya existe un descuento para esta duración"] } }`. The manager shows a toast error that the test does not assert on.

**DB state at exploration time** (query: `SELECT id, meses, porcentaje FROM "DescuentoDuracion"`):
```
 id | meses | porcentaje
----+-------+------------
  1 |     3 |         10   <- seeded
  3 |     9 |         17   <- seeded
  4 |    12 |         20   <- seeded
```
**Note**: `meses=6` is missing — it was deleted by a previous test run (the `meses=6, porcentaje=15` seed was cleaned up by an earlier S2.D.1 attempt that successfully created and then deleted via the UI). This is why S2.D.3's create of `meses=6, porcentaje=20` SUCCEEDS (no unique conflict), and only the delete fails.

**Promociones DB state** also has 6 stale `TEST_*` records from previous test runs that were never cleaned up (the `afterEach` cleanup for promociones depends on the same broken `page.once('dialog')` path that the delete tests are trying to fix).

---

## Per-test analysis

### S2.P.2 — edit promocion and verify persistence

**Test code** (`tests/promociones-descuentos.spec.ts:147-184`):
- Lines 153-159: create a promocion via the UI (fixture.titulo), assert it appears in the list.
- Line 163: `promoPage.editByTitulo(fixture.titulo)` — click the edit button on that list item.
- Line 167: `expect(tituloInput).toHaveValue(fixture.titulo, { timeout: 10_000 })` — form is pre-filled with the old titulo.
- Line 171: `await tituloInput.fill(newTitulo)` — type the new titulo (keeping descripcion/precio from the edit).
- Line 172: `await promoPage.submitCreate()` — click the submit button.
- Line 175-177: `expect(...filter({ hasText: fixture.titulo })).toHaveCount(0)` — old titulo gone. **FAILS**.

**Page-object code** (`tests/pages/PromocionAdminPage.ts:75-77`):
```ts
async submitCreate(): Promise<void> {
  await this.submitButton.click();
}
```
Just clicks the button with `data-testid="promocion-submit-button"`. No branching on mode.

**Form code** (`src/components/admin/promocion-form.tsx:77-122`) — the relevant `onSubmit`:
```ts
const onSubmit = async (data) => {
  if (isEditing && editingPromocion) {
    const contentResult = await onSubmitContent({
      id: editingPromocion.id,
      titulo: data.titulo,
      descripcion: data.descripcion,
    })
    if (!contentResult.success) { toast.error(...); return }
    if (data.precio !== undefined && data.precio !== editingPromocion.precio) {
      const precioResult = await onSubmitPrecio({...})
      // ...
    }
    toast.success("Promoción actualizada exitosamente")
    onCancel()  // <-- sets editingPromocionId to null in the manager
  } else {
    // Create new promocion
    // ...
  }
}
```

**Manager code** (`src/components/admin/promocion-manager.tsx:40-54`):
```ts
const handleSubmitContent = async (data) => {
  const result = await updatePromocionContent(data)
  if (result.error) return { success: false, error: result.error.message }
  if (result.data) {
    setPromociones((prev) =>
      prev.map((p) => (p.id === result.data!.id ? { ...p, ...result.data! } : p))
    )
  }
  return { success: true }
}
```

**Form `useEffect`** (`src/components/admin/promocion-form.tsx:56-71`):
```ts
useEffect(() => {
  if (!editingPromocion) {
    reset({ titulo: "", descripcion: "", precio: undefined })
    return
  }
  reset({ titulo: editingPromocion.titulo, descripcion: editingPromocion.descripcion || "", precio: editingPromocion.precio })
}, [editingPromocion?.id, reset])
```

**Code evidence for root cause hypothesis (NOT a final answer)**:

1. The page snapshot at failure shows the form in **CREATE mode** with the precio input still holding `7156` (the fixture's original precio). The submit click DID happen, the form DID transition out of edit mode (which only happens via `onCancel()` after a successful update OR via a direct state reset). The update POST IS in the dev server log.

2. The list still shows the OLD titulo (`Received: 1` on the filter). This is inconsistent with a successful `updatePromocionContent` + `setPromociones` flow — the state update should have replaced the old entry with the new one.

3. **Hypothesis A — race between `setPromociones` and `revalidatePath` re-render**: The update server action calls `revalidatePath("/admin/promociones")` and `revalidateTag("promociones", "max")` (lines 151-153 of `src/app/actions/promociones.ts`). The `revalidatePath` causes the server component to re-render and stream new HTML. If Next.js 16's Cache Components reconciliation replaces the `PromocionManager` client component (rather than updating it in place), the local `useState(initialPromociones)` would re-initialize to the fresh data — which still has the OLD titulo because the client `setPromociones` update happened on a now-unmounted instance. **Evidence for**: dev log shows the POST succeeded, page snapshot shows the form in CREATE mode (form WAS re-rendered). **Evidence against**: `useState` initial-value semantics should preserve the update across re-renders unless the component fully remounts.

4. **Hypothesis B — `editingPromocion` is `null` at submit time**: If the `useEffect` reset fires between `fill(newTitulo)` and the submit click, `editingPromocion` becomes `null` (because `editingPromocionId` is set to null by some path), the form transitions to CREATE mode, and the submit fires the CREATE branch with `newTitulo` — creating a new promocion with the new titulo while the old one stays. **Evidence for**: page snapshot shows CREATE mode and precio=7156 (consistent with the effect running and the precio input retaining the last user-visible value because `reset({precio: undefined})` doesn't always clear `<input type="number">` in RHF when the previous value was set via `valueAsNumber`). **Evidence against**: the test passed `expect(tituloInput).toHaveValue(fixture.titulo)` at line 167, proving the form was pre-filled at that point. No explicit cancel between 167 and 172.

5. **Hypothesis C — the `setPromociones` call doesn't find a match**: The manager uses `prev.map((p) => (p.id === result.data!.id ? {...p, ...result.data!} : p))`. If `result.data!.id` is a different id than the one in the array (e.g., string vs number mismatch, or a stale closure), the map does nothing. **Evidence for**: would explain "old titulo still in list" cleanly. **Evidence against**: the id is the Prisma-generated UUID (string) on both sides; the create flow uses the same pattern successfully (S2.P.1 passes).

**User's hypothesis** (test uses `submitCreate()` for edit): **Partially correct** — the form's `onSubmit` does branch on `isEditing`, but the page object's `submitCreate()` just clicks the submit button. The branching happens inside the form, not the page object. The page object doesn't need a separate `submitEdit()` method. **The real issue is downstream of the click** — in the form's state management or the manager's re-render handling. The proposal phase should pick a fix and validate it with a unit test (RHF form state under edit/create) before touching the spec.

**Possible fix approaches** (the proposal phase decides):

| Approach | Description | Pros | Cons | Effort |
| --- | --- | --- | --- | --- |
| A1: Add `data-testid` to edit-mode submit button, add `submitEdit()` to page object | Differentiate the edit button from the create button via a new testid, add a `submitEdit()` helper that clicks it. Then add an explicit `expect(button).toHaveText("Guardar cambios")` before clicking. | Catches the "form is in wrong mode at click time" failure mode explicitly. Pure test-side fix. | Doesn't fix the underlying form/manager issue. The production code still has the race. | Low |
| A2: Fix the form's `useEffect` to not race with the submit | Add a guard so the effect doesn't reset the form after a successful submit (e.g., use a ref to track "just submitted, don't reset"). | Fixes the root cause for any real user, not just tests. | Touches the production form. Higher blast radius. | Medium |
| A3: Move the state update out of the server action and use `router.refresh()` after a server action | Instead of the optimistic `setPromociones` in the manager, rely on the `revalidatePath` to refresh the page data. | Aligns with Next.js 16 Cache Components patterns. Fixes the race definitively. | Larger refactor of the manager. Changes the "optimistic UI" contract. | Medium-High |
| A4: Use `useTransition` + `startTransition` for the state update | Wrap the `setPromociones` in `startTransition` so React preserves it across the `revalidatePath` re-render. | Idiomatic React 19 fix for this exact pattern. Low blast radius. | Requires React 19 + transitions understanding. | Low-Medium |

---

### S2.P.3 — delete promocion via UI

**Test code** (`tests/promociones-descuentos.spec.ts:186-205`):
- Lines 192-198: create a promocion via the UI.
- Line 201: `await promoPage.deleteByTitulo(fixture.titulo)` — click the delete button on the list item.
- Line 202: `await promoPage.expectNotInList(fixture.titulo)` — assert it's gone. **FAILS**.

**Page-object code** (`tests/pages/PromocionAdminPage.ts:91-97`):
```ts
async deleteByTitulo(titulo: string): Promise<void> {
  const item = this.listItem(titulo);
  this.page.once('dialog', (d) => d.accept());   // <-- WRONG: native browser dialog handler
  const deleteButton = item.getByTestId('promocion-delete-button');
  await deleteButton.click();
}
```

**Manager code** (`src/components/admin/promocion-manager.tsx:90-115`):
```ts
const handleDelete = async (id: string) => {
  // eslint-disable-next-line @admin/no-window-alert
  const confirmed = await confirm({                // <-- uses useConfirm hook (React AlertDialog)
    title: "¿Eliminar promoción?",
    description: "Esta acción no se puede deshacer.",
    variant: "destructive",
    confirmText: "Eliminar",
  })
  if (!confirmed) return
  // ... prisma delete
}
```

**Evidence**:
- `useConfirm` hook (`src/hooks/use-confirm.tsx:18-24`) returns a `confirm()` function that returns a `Promise<boolean>`.
- `confirm()` calls `setState` + `setIsOpen(true)` which renders `<ConfirmDialog>`.
- `ConfirmDialog` (`src/components/confirm-dialog.tsx:33-53`) wraps a shadcn `AlertDialog` with `<AlertDialogAction>` for the confirm button (text: "Eliminar").
- The `AlertDialog` is **not** a native browser `window.confirm()` — it's a React component rendered into the DOM.
- Playwright's `page.once('dialog', ...)` fires ONLY for native browser dialogs (`alert`, `confirm`, `prompt`, `beforeunload`). It does NOT fire for React-rendered modals/AlertDialogs.
- **Therefore**: the `page.once('dialog')` handler is never called. The delete button is clicked, the AlertDialog appears, but no one clicks "Eliminar" on it. The test waits for the list item to disappear, times out.

**Code evidence**: The spec file already has the correct helper at the top of the file (lines 50-55):
```ts
/** Clicks the "Eliminar" button in the React AlertDialog. */
async function clickConfirmDelete(page: Page): Promise<void> {
  const confirmButton = page.getByRole('button', { name: /^Eliminar$/ });
  await expect(confirmButton).toBeVisible({ timeout: 10_000 });
  await confirmButton.click();
}
```
And `afterEach` already uses it correctly (lines 64-65 in the `deletePromocionByTitulo` helper at the top of the spec file). The page object's `deleteByTitulo()` was written before this pattern was established and never got updated.

**Root cause hypothesis (HIGH confidence)**: The page object uses the wrong dialog API. Fix is to replace `page.once('dialog', (d) => d.accept())` with a call to the `clickConfirmDelete(page)` helper (either import the existing one from the spec or duplicate the pattern in the page object).

**Possible fix approaches**:

| Approach | Description | Pros | Cons | Effort |
| --- | --- | --- | --- | --- |
| B1: Update `deleteByTitulo()` to use the same pattern as the spec's `deletePromocionByTitulo` helper | Move the `clickConfirmDelete` logic inline into the page object, or import the spec helper. | Minimal change. Matches the existing pattern in the spec file. The fix is test-only. | Slight duplication between spec and page object. | Low |
| B2: Extract `clickConfirmDelete` to `tests/helpers.ts` and use it in both places | Promote the helper to a shared utility. | Single source of truth. Reusable for any future AlertDialog confirm. | Slightly larger change. | Low |

---

### S2.D.1 — create descuento (happy path)

**Test code** (`tests/promociones-descuentos.spec.ts:211-227`):
- Line 214: `createDescuentoFixture({ meses: 3, porcentaje: 15 })` — hardcoded fixture.
- Line 219: `await descuentoPage.fillPorcentaje(15)` — fill "15" in the porcentaje input.
- Line 220: `await descuentoPage.submitCreate()` — click "Agregar".
- Line 224: `await descuentoPage.expectInList(15)` — assert the list shows "15". **FAILS** with `element(s) not found`.

**Server-side evidence (dev log)**: `Error creating descuento: Error [PrismaClientKnownRequestError]: Invalid prisma.descuentoDuracion.create() invocation` — the Prisma client throws because of the unique constraint on `(gymId, meses)`.

**Code evidence**:
- `prisma/schema.prisma:238` — `@@unique([gymId, meses])` on `DescuentoDuracion`.
- `prisma/seed.ts` — seeds descuentos for ALL four `meses` values: `{3, 10}, {6, 15}, {9, 17}, {12, 20}`.
- `src/app/actions/descuentos-duracion.ts:106-110` — the server action catches the P2002 error and returns `{ success: false, errors: { meses: ["Ya existe un descuento para esta duración"] } }`.
- `src/components/admin/descuento-duracion-manager.tsx:96-98` — the manager checks `result.errors?.meses` and shows a toast error: `toast.error(result.errors.meses[0])`.
- The test does not assert on the toast. The test just asserts the list item appears, which it doesn't, because the create never succeeded.

**Root cause hypothesis (HIGH confidence)**: The test's hardcoded `meses: 3` collides with the seed's `meses: 3`. The create fails silently (toast error, no list item). The user's hypothesis of "timing or form state issue" is **incorrect** — the form state is fine, the data layer is rejecting the create.

**The user said S2.D.4 passes** — but S2.D.4 also uses `createDescuentoFixture({ meses: 3, porcentaje: 15 })` and would hit the same constraint. I confirmed S2.D.4 also fails in this environment (same `element(s) not found`). The user may have been running against a DB where S2.D.1 had already run and cleaned up `meses=3` via its `afterEach` (which uses the same broken `deleteByPorcentaje`). After fixing S2.D.1, the cleanup would work, and subsequent S2.D.4 runs would find `meses=3` free. So the "S2.D.4 passes" observation may have been from a sequence where S2.D.1 ran first and its (broken) cleanup happened to remove the right record by accident.

**Possible fix approaches**:

| Approach | Description | Pros | Cons | Effort |
| --- | --- | --- | --- | --- |
| C1: Change the fixture to use a `meses` value that the seed doesn't use | The seed uses 3, 6, 9, 12 — ALL of which are taken. Use a `meses` value the schema doesn't allow (e.g., 4) — would fail schema validation. Or relax the seed to leave one `meses` free for tests. | Pure test-side fix. Aligns with "test owns its data" principle. | Either requires a schema change (out of scope) or requires touching the seed (shared across all tests). | Medium |
| C2: Add a `beforeEach` that deletes the conflicting seed records | Use direct Prisma access (like `tests/utils/gym-reset.ts` does for gym config) to `deleteMany` the descuentos for the `meses` values the tests will use, then re-seed in `afterAll` or `afterEach`. | Tests own their data. No seed changes. | Adds a Prisma-direct test utility (new pattern in the project, though `gym-reset.ts` already establishes it). | Low-Medium |
| C3: Change the test to UPDATE the existing seeded `meses=3` descuento instead of creating a new one | The test would call the edit flow (which is also broken in S2.P.2) and assert the `porcentaje` changes. | Reuses existing data. Tests the edit path. | Doesn't actually test the create path. Changes the test's intent. | Low |
| C4: Pre-clean the descuentos in `beforeEach` (no re-seed) | Add a `beforeEach` that calls `prisma.descuentoDuracion.deleteMany({ where: { porcentaje: { gte: 10, lte: 100 } } })` to wipe all non-seed descuentos, then re-seed in `afterAll`. | Tests own their data. Clean. | Requires re-seeding the descuentos in afterAll to not affect other tests. New test utility. | Medium |

**Recommendation** (for proposal phase to consider): **C2** is the cleanest — add a `resetDescuentos()` helper to `tests/utils/descuentos-reset.ts` (analogous to `gym-reset.ts`) that uses Prisma direct access to delete non-seed descuentos and re-insert the seed values. The tests' `beforeEach` calls `resetDescuentos()`. The seed valores are hardcoded in the helper (4 records). This pattern is already established by `gym-reset.ts`, so it follows existing convention.

---

### S2.D.3 — delete descuento

**Test code** (`tests/promociones-descuentos.spec.ts:258-275`):
- Line 261: `createDescuentoFixture({ meses: 6, porcentaje: 20 })`.
- Lines 264-268: create the descuento via the UI.
- Line 271: `await descuentoPage.deleteByPorcentaje(20)` — click delete.
- Line 272-274: assert the `20%` item is gone. **FAILS** with `Received: 1, Expected: 0`.

**Page-object code** (`tests/pages/DescuentoAdminPage.ts:82-87`):
```ts
async deleteByPorcentaje(porcentaje: number): Promise<void> {
  const item = this.listItem(String(porcentaje));
  this.page.once('dialog', (d) => d.accept());   // <-- SAME WRONG PATTERN as S2.P.3
  const deleteButton = item.getByTestId('descuento-delete-button');
  await deleteButton.click();
}
```

**Code evidence**: The `DescuentoDuracionManager.handleDelete` (`src/components/admin/descuento-duracion-manager.tsx:156-178`) uses the same `useConfirm` hook → `ConfirmDialog` → shadcn `AlertDialog` pattern as `PromocionManager.handleDelete`. The `confirmText` is also `"Eliminar"`.

**Root cause hypothesis (HIGH confidence)**: **Identical to S2.P.3.** The page object uses `page.once('dialog', ...)` which doesn't capture React AlertDialogs. The fix is the same pattern: use `clickConfirmDelete()` (or a duplicate of the same helper in the page object).

**Possible fix approaches**: **Same as S2.P.3 (B1 or B2).** The proposal phase should treat S2.P.3 and S2.D.3 as a single fix to the AlertDialog page-object pattern, and apply it to both `PromocionAdminPage.deleteByTitulo()` and `DescuentoAdminPage.deleteByPorcentaje()` at the same time.

---

## Common patterns

1. **S2.P.3 and S2.D.3 share the exact same root cause** — the `page.once('dialog')` handler doesn't capture React `AlertDialog`. One fix (a shared `clickConfirmDelete` helper used in both page objects) covers both tests. The spec file already has the right pattern at lines 50-55; the page objects just need to be brought in line.

2. **S2.D.1 and (unexpectedly) S2.D.4 share the same root cause** — the test's hardcoded `meses: 3` collides with the seed's `meses: 3` under the `@@unique([gymId, meses])` constraint. One fix (a `beforeEach` that resets descuentos to seed state) covers both tests. The proposal phase should decide whether to expand scope to include S2.D.4 (it was listed as passing by the user but fails in this environment — the user may have run the suite in a specific order that masked the issue).

3. **S2.P.2 is the only test with a non-trivial root cause** — the form's `useEffect` reset + the manager's `setPromociones` + the `revalidatePath` re-render interact in a way that can lose the optimistic state update. The fix requires understanding React 19's transition semantics and Next.js 16's Cache Components reconciliation. This is the highest-risk fix in the bunch.

---

## Impacted files

| File | What needs to change | Why |
| --- | --- | --- |
| `tests/pages/PromocionAdminPage.ts` | Replace `page.once('dialog', ...)` in `deleteByTitulo()` (line 94) with a call to the `clickConfirmDelete` helper. Optionally add a `submitEdit()` method + new `data-testid` on the edit-mode submit button (Hypothesis A1 in S2.P.2). | Fixes S2.P.3 directly. May also be part of the S2.P.2 fix. |
| `tests/pages/DescuentoAdminPage.ts` | Replace `page.once('dialog', ...)` in `deleteByPorcentaje()` (line 84) with a call to the `clickConfirmDelete` helper. | Fixes S2.D.3 directly. |
| `tests/helpers.ts` (optional) | Extract the existing `clickConfirmDelete` from the spec file (lines 50-55) into a shared helper. Update the spec file and both page objects to import it. | DRY for the AlertDialog pattern. |
| `tests/utils/descuentos-reset.ts` (new, optional) | New Prisma-direct test utility: `resetDescuentos()` that deletes all `DescuentoDuracion` rows and re-inserts the 4 seed records. Pattern mirrors `tests/utils/gym-reset.ts`. | Fixes S2.D.1 (and S2.D.4 if scope expands). |
| `tests/promociones-descuentos.spec.ts` | Add `beforeEach(async () => { await resetDescuentos(); })` to the `describe` block. Update the inline `clickConfirmDelete` to import from helpers (if extracted). | Hooks the reset into the suite. |
| `src/components/admin/promocion-form.tsx` (optional, S2.P.2 fix) | If the proposal picks a production fix (Hypothesis A2/A3/A4), this file changes. Possible changes: add a ref to skip the reset effect after a successful submit, or move the state update into a `startTransition`. | Fixes S2.P.2 production-side. |
| `src/components/admin/promocion-manager.tsx` (optional, S2.P.2 fix) | If the proposal picks A3 or A4, the `setPromociones` call may be replaced with `router.refresh()` or wrapped in `startTransition`. | Fixes S2.P.2 production-side. |

---

## Dependencies

- **Prisma migration**: NO.
- **New server action**: NO.
- **New reader**: NO.
- **New env var**: NO.
- **New package**: NO.
- **New data-testid**: Possibly one new one (`promocion-submit-edit-button`) if the proposal picks A1 for S2.P.2. Otherwise no.
- **New test utility**: Possibly `tests/utils/descuentos-reset.ts` for S2.D.1 (mirrors the existing `tests/utils/gym-reset.ts` pattern — already established convention).
- **New production code change**: Only if the S2.P.2 fix picks A2/A3/A4. All other fixes are test-only or test-utility only.

---

## Design constraints

1. **Must respect `data-testid` strategy** (`openspec/config.yaml:287` — `selectors: strategy: data-testid`). The fix must use `data-testid` for the new `clickConfirmDelete` helper, not CSS selectors. The existing `clickConfirmDelete` at the spec file lines 50-55 already uses `getByRole('button', { name: /^Eliminar$/ })` which is the Playwright-recommended priority (role > label > testid). Keep it that way.

2. **Must not break the 3 currently-passing tests** (S2.P.1, S2.D.2, S2.D.4 — assuming S2.D.4 passes against a fresh seed). The fix for S2.P.3/S2.D.3 changes the delete path; verify S2.P.1's create path is unaffected. The fix for S2.D.1 changes the `beforeEach`; verify S2.D.2's validation-error path still works (the `errorMessage` selector at line 248 is independent of the create success path).

3. **Must respect strict TDD** (the prefilled `strict_tdd: true` flag). For each test fix, the cycle is: confirm the test fails (RED) → fix → confirm the test passes (GREEN) → refactor. The exploration phase confirmed RED for all 4 tests. The apply phase must verify GREEN after each fix.

4. **Must not introduce AI attribution to commits** (`openspec/AGENTS.md` rule + `openspec/config.yaml` `ai_constraints`). Commit messages follow conventional commits (no `Co-Authored-By: AI`).

5. **Must not add new lint warnings** (there are 160 remaining in the project — `openspec/ROADMAP.md` line 109-112). The fix should not introduce new `as any`, `console.error`, or unused-vars warnings.

6. **Must not add new `data-testid` attributes that conflict with existing ones**. The form already has `promocion-submit-button` shared between create and edit modes. Adding a new one (`promocion-submit-edit-button`) is fine; removing or renaming existing ones is not.

7. **Must preserve the existing `afterEach` cleanup pattern** in the spec file (lines 93-122). The cleanup uses `deletePromocionByTitulo` and `deleteDescuentoByPorcentaje` helpers at the top of the file (lines 57-79) which already use the correct `clickConfirmDelete` pattern. The fix to the page objects' `deleteByTitulo`/`deleteByPorcentaje` should be consistent with these helpers.

8. **Must work in serial mode** (`test.describe.configure({ mode: 'serial' })` at line 83). The `beforeEach` reset must work even when the suite runs serially and tests share state.

9. **Must work in fully-parallel mode** (the Playwright config has `fullyParallel: true` at the project level). The `beforeEach` reset must not race with parallel test workers. Using Prisma direct access (not HTTP) makes the reset atomic; the unique constraint enforcement is at the DB level so parallel tests can't create conflicting rows.

10. **The `useConfirm` hook is a singleton pattern** (`src/hooks/use-confirm.tsx:18-24`). The `clickConfirmDelete` helper uses `page.getByRole('button', { name: /^Eliminar$/ })` which matches any button with that accessible name on the page. If multiple AlertDialogs were open simultaneously, this would be ambiguous. The current code only opens one at a time, so this is safe — but worth noting in the proposal.

---

## Estimated complexity

**Small to Medium** (target ~100-200 changed lines, well within the 400-line review budget).

Reasoning:
- **S2.P.3 + S2.D.3 fix** (AlertDialog page-object): ~10 lines changed across 2 page objects + optionally extract `clickConfirmDelete` to `tests/helpers.ts` (~5 lines moved, no new logic).
- **S2.D.1 fix** (descuentos reset utility): ~30 lines for a new `tests/utils/descuentos-reset.ts` mirroring `tests/utils/gym-reset.ts`, plus ~3 lines in the spec file for `beforeEach`.
- **S2.P.2 fix** (form state race): depends on the approach chosen.
  - A1 (test-only): ~15 lines for a new testid + `submitEdit()` method.
  - A2 (form fix): ~20-30 lines for a ref guard in the `useEffect` + a Vitest unit test.
  - A3 (router.refresh): ~30-40 lines to refactor the manager's `handleSubmitContent` to use `router.refresh()` and drop the optimistic update.
  - A4 (startTransition): ~15 lines to wrap `setPromociones` in `startTransition`.

No DB migration. No new server action. No new reader. No new package. No architectural change.

**Forecast for tasks phase**:
- **Decision needed before apply**: Yes — the S2.P.2 fix approach (A1 vs A2 vs A3 vs A4) needs to be picked in the proposal phase. The other 3 fixes are straightforward.
- **Chained PRs recommended**: No — the 4 fixes are small and can ship in one PR.
- **400-line budget risk**: Low.

---

## Open questions with codebase evidence

### Q1 — S2.P.2 root cause: is it a form state race or a test issue?

**Evidence (form `useEffect`, `src/components/admin/promocion-form.tsx:56-71`):**
```ts
useEffect(() => {
  if (!editingPromocion) {
    reset({ titulo: "", descripcion: "", precio: undefined })
    return
  }
  reset({ titulo: editingPromocion.titulo, descripcion: editingPromocion.descripcion || "", precio: editingPromocion.precio })
}, [editingPromocion?.id, reset])
```

**Evidence (manager `handleSubmitContent`, `src/components/admin/promocion-manager.tsx:40-54`):**
```ts
const handleSubmitContent = async (data) => {
  const result = await updatePromocionContent(data)
  // ...
  if (result.data) {
    setPromociones((prev) =>
      prev.map((p) => (p.id === result.data!.id ? { ...p, ...result.data! } : p))
    )
  }
  return { success: true }
}
```

**Evidence (update server action, `src/app/actions/promociones.ts:142-155`):**
```ts
const promocion = await prisma.promocion.update({ where: { id: parsed.data.id }, data: { titulo: parsed.data.titulo, descripcion: parsed.data.descripcion } })
revalidateTag("promociones", "max")
revalidatePath("/admin/promociones")
revalidatePath("/precios")
return { data: promocion, error: null }
```

**Three plausible root causes** (all evidence-backed, none definitively confirmed):
1. The `revalidatePath` in the server action causes a re-render that remounts the `PromocionManager` client component, losing the optimistic `setPromociones` update.
2. The `useEffect` reset fires between `fill(newTitulo)` and the submit click, transitioning the form to CREATE mode (visible in the page snapshot — form heading is "Agregar Promoción" at failure).
3. The `result.data!.id` in the `setPromociones` call doesn't match any id in the array (e.g., string vs number mismatch — unlikely given Prisma uses UUID strings).

**Why this is hard to answer from code alone**: The dev log shows the update POST succeeded. The page snapshot shows the form in CREATE mode. The list shows the old titulo. The exact sequence of events between the POST return and the list render is not visible from the test artifacts. The proposal phase should pick a fix and validate it with a Vitest unit test of the form state transitions before touching the spec.

### Q2 — S2.D.1 / S2.D.4 fix: should we add a descuentos reset utility, or change the fixture?

**Evidence (schema, `prisma/schema.prisma:238`):** `@@unique([gymId, meses])` on `DescuentoDuracion`.
**Evidence (seed, `prisma/seed.ts`):** all 4 `meses` values (3, 6, 9, 12) are seeded.
**Evidence (existing test utility, `tests/utils/gym-reset.ts:32-39`):** the project already uses Prisma-direct test utilities for gym config. The pattern is established.

The proposal has 2 viable paths:
- **Path 1 — add `tests/utils/descuentos-reset.ts`**: mirrors `gym-reset.ts`, follows established convention, tests own their data. Risk: must also handle re-seeding the 4 seed records after the test (the seed is currently `deleteMany` + `create`, not upsert — see `prisma/seed.ts:43-47`).
- **Path 2 — change the test fixture to UPDATE instead of CREATE**: tests the edit path (which is also broken in S2.P.2 — circular dependency). Doesn't actually test the create path. Changes the test's intent.

The proposal should pick Path 1 (the established convention).

### Q3 — S2.P.2 fix scope: test-only or production fix?

**Evidence (page object, `tests/pages/PromocionAdminPage.ts:74-77`):**
```ts
async submitCreate(): Promise<void> {
  await this.submitButton.click();
}
```

**Evidence (form submit button, `src/components/admin/promocion-form.tsx:189, 199`):** the same `data-testid="promocion-submit-button"` is used for BOTH the create and edit mode submit buttons. The page object doesn't differentiate.

The proposal has 2 viable scopes:
- **Test-only fix (A1)**: add a new `data-testid="promocion-submit-edit-button"` to the edit-mode button, add a `submitEdit()` method to the page object, add an explicit `expect(button).toHaveText("Guardar cambios")` assertion before the click. Catches the "form is in wrong mode at click time" failure mode explicitly. **Does NOT fix the underlying form/manager issue for real users** — but no real user has reported this bug, so it may not be a real-user issue.
- **Production fix (A2/A3/A4)**: touches `promocion-form.tsx` and/or `promocion-manager.tsx`. Fixes the root cause for any real user who hits it. **Higher blast radius** — changes a component that's been in production since v0.10.0.

The proposal should pick A1 (test-only) as the conservative default, with A4 (startTransition) as a stretch goal if the team wants to fix the production code. A2 and A3 are higher-risk and not recommended for a "test-quality" change.

### Q4 — S2.D.4: include in scope or not?

**Evidence**: S2.D.4 uses the same hardcoded `meses: 3` fixture as S2.D.1. In this environment, S2.D.4 fails with the same `element(s) not found` error. The user listed S2.D.4 as passing.

The user may have observed S2.D.4 passing in a sequence where S2.D.1 ran first and its (broken) cleanup happened to remove the `meses=3` record. After fixing S2.D.1, the cleanup will work reliably, and S2.D.4 will pass consistently. So the fix for S2.D.1 likely also fixes S2.D.4 as a side effect — no extra work needed, but the proposal should mention S2.D.4 in the affected tests list.

---

## Recommendation (for proposal phase to consider)

- **S2.P.3 + S2.D.3**: Fix in the page objects. Replace `page.once('dialog', ...)` with a `clickConfirmDelete(page)` call. Optionally extract `clickConfirmDelete` to `tests/helpers.ts` (the spec file already has it inline at lines 50-55 — promoting it removes the duplication between spec and page objects).
- **S2.D.1**: Add `tests/utils/descuentos-reset.ts` mirroring `tests/utils/gym-reset.ts`. Add a `beforeEach` in the spec that calls `resetDescuentos()`. The helper deletes all descuentos and re-inserts the 4 seed records (hardcoded in the helper). This also fixes S2.D.4 as a side effect.
- **S2.P.2**: Conservative test-only fix (A1) — add `data-testid="promocion-submit-edit-button"` to the edit-mode submit button, add `submitEdit()` method to the page object, add an explicit `expect(button).toHaveText("Guardar cambios")` assertion. The form's `useEffect` race may still exist for real users, but no real user has reported it and the change is minimal.
- **Stretch goal (optional, not required for test pass)**: A4 (startTransition) for S2.P.2 — wrap the manager's `setPromociones` in `startTransition` to preserve the optimistic update across the `revalidatePath` re-render. Idiomatic React 19 pattern. Validated by a Vitest unit test of the form state transitions.

---

## Ready for Proposal

**Yes** — all 4 tests have been run in isolation with exact failure messages captured. 3 of the 4 root causes are well-understood (S2.P.3/S2.D.3: AlertDialog page-object; S2.D.1: unique constraint collision with seed). The 4th (S2.P.2) has 3 plausible root causes documented with code evidence; the proposal phase should pick the conservative test-only fix and validate.

Key signals:
- All 4 skills loaded (`sdd-explore`, `playwright`, `react-hook-form`, `react-19`).
- All 4 tests run in isolation with verbatim error messages captured.
- DB state inspected (`psql` query against `gym-routines-db` container).
- Dev server log inspected (POSTs to `/admin/promociones`, Prisma error for descuento create).
- Page snapshots at failure captured for S2.P.2, S2.P.3, S2.D.1, S2.D.3, S2.D.4.
- S2.D.4 discovered to also fail in this environment (user listed it as passing — flag for the proposal phase).
- 4 open questions answered with code snippets.
- 0 dependencies on migrations / new actions / new readers / new packages.
- Complexity is Small to Medium (Low risk on the 400-line budget).
