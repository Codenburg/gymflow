---
change: fix-use-cache-prisma-rsc-errors
status: archived
schema: spec-driven/v1
generated_by: sdd-tasks
generated_at: 2026-06-20
completed_at: 2026-06-20
strict_tdd: true
test_command_unit: pnpm test:unit
test_command_e2e: pnpm test
---

# Tasks: Fix `use cache` + Prisma RSC errors

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250-350 (11 reader wraps + ErrorState + 3 test files) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (safety net + ErrorState) → PR 2 (11 reader migrations) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

Reasoning: 9 source files + 3 new test files; mechanical 11-reader migration pushes diff close to 400 lines once JSDoc banners + tests are included. Design §Open Questions explicitly recommends stacked PRs.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Safety net (Vitest grep guard) + ErrorState client-directive fix + regression tests | PR 1 | Independent; base = main; unlocks the guard for PR 2 |
| 2 | Migrate 11 cached readers from `"use cache"` to `unstable_cache` across 7 source files | PR 2 | Base = main; guard from PR 1 catches any missed reader |

## Phase 1 — Foundation (Safety Net + ErrorState)

- [x] 1.1 Add Vitest grep guard failing on `use cache` ∩ `@/lib/prisma`
- [x] 1.2 Add `"use client"` directive to `ErrorState`
- [x] 1.3 Add Vitest unit test for `ErrorState` (button + onClick)
- [x] 1.4 Add Playwright regression test for `/` (no Prisma/event-handler console errors)

## Phase 2 — `gym-config` Tag Readers (3 readers, 2 files)

- [x] 2.1 Migrate `getGymNameForServer` → `unstable_cache`
- [x] 2.2 Migrate `getGymDisplayForServer` → `unstable_cache`
- [x] 2.3 Migrate `getGymPrice` → `unstable_cache`

## Phase 3 — `rutinas` Tag Readers (5 readers, 2 files)

- [x] 3.1 Migrate `getRutinas` → `unstable_cache`
- [x] 3.2 Migrate `getCachedRutinaById` → `unstable_cache`
- [x] 3.3 Migrate `getStats` → `unstable_cache`
- [x] 3.4 Migrate `getRoutinesPaginated` → `unstable_cache`
- [x] 3.5 Migrate `getTrainerCounts` → `unstable_cache`

## Phase 4 — Independent Leaves (3 readers, 3 files)

- [x] 4.1 Migrate `getPromociones` → `unstable_cache`
- [x] 4.2 Migrate `getFeriados` → `unstable_cache`
- [x] 4.3 Migrate `getDescuentos` → `unstable_cache`

## Phase 5 — Verification

- [x] 5.1 Run full unit + E2E suite; confirm guard passes + no regressions
- [x] 5.2 Manual smoke: `/` loads; error path renders `ErrorState` with working "Reintentar"

---

# Task Details

## Phase 1 — Foundation

### 1.1 Add Vitest grep guard
**Files**: `tests/unit/cache-prisma-guard.test.ts` (create)
**TDD test**: `pnpm test:unit tests/unit/cache-prisma-guard.test.ts` → RED on current tree (8 files match).
**Implementation**: Walk `src/**/*.{ts,tsx}` recursively; collect paths containing BOTH `"use cache"` and `from "@/lib/prisma"`; `expect(offenders).toEqual([])` with a message listing offenders on failure.
**Verification**: `pnpm test:unit` fails today (offenders listed); passes after Phase 2-4.
**Rollback**: Delete the test file; no production code touched.

### 1.2 Add `"use client"` to `ErrorState`
**Files**: `src/components/ui/error-state.tsx` (modify)
**TDD test**: covered by 1.3 + 1.4 (component must be client + clickable).
**Implementation**: Insert `"use client";` as the first non-comment line; keep the rest verbatim.
**Verification**: `pnpm build` succeeds; no `Event handlers cannot be passed` warning for `app/(public)/page.tsx:116`.
**Rollback**: Remove the directive line; no other changes.

### 1.3 Add Vitest unit test for `ErrorState`
**Files**: `tests/unit/error-state.test.tsx` (create)
**TDD test**: `pnpm test:unit tests/unit/error-state.test.tsx` → RED (file missing); GREEN once component + 1.2 land.
**Implementation**: `render(<ErrorState message="boom" />)`; assert `data-testid="error-state"` wrapper, "Reintentar" text, and the rendered button has a click handler (no thrown event-handler build error). Stub `window.location.reload`.
**Verification**: Test passes; `data-testid` selector preserved.
**Rollback**: Delete the test file.

### 1.4 Add Playwright regression for `/`
**Files**: `tests/homepage-regression.spec.ts` (create)
**TDD test**: `pnpm test tests/homepage-regression.spec.ts` → RED on current tree (Prisma + event-handler errors).
**Implementation**: Attach `page.on("console", …)`; navigate `/`; wait for `getByText("Full Body").first().toBeVisible()`; assert console contains neither `PrismaClientKnownRequestError` nor `Event handlers cannot be passed to Client Component props`; assert `page.content()` excludes `ErrorBoundary:homepage`; intercept `/api/rutinas` with 500 (mirroring `homepage.spec.ts:4.15`), assert `[data-testid="error-state"]` is visible and the "Reintentar" button is enabled.
**Verification**: Test passes after 1.2 + Phases 2-4.
**Rollback**: Delete the test file.

## Phase 2 — `gym-config` Tag Readers

### 2.1 Migrate `getGymNameForServer`
**Files**: `src/app/actions/gym.ts` (modify)
**TDD test**: 1.1 guard covers regression; per-reader test unnecessary.
**Implementation**: Remove `import { cacheTag, cacheLife }`; add `import { unstable_cache }`; drop the 3 directive lines; wrap body in `unstable_cache(async () => {...}, ["gym-name"], { tags: ["gym-config"], revalidate: 60 })()`; update JSDoc to `unstable_cache` note.
**Verification**: `pnpm build`; `pnpm test:unit` (guard); manual: `/` still shows gym name.
**Rollback**: Revert the function block + import change.

### 2.2 Migrate `getGymDisplayForServer`
**Files**: `src/app/actions/gym.ts` (modify)
**TDD test**: 1.1 guard.
**Implementation**: Same pattern as 2.1; keyParts `["gym-display"]`; `tags: ["gym-config"]`; `revalidate: 60`; unique keyParts per D3.
**Verification**: `pnpm build`; guard test count drops by 1; `/informacion` still renders display fields.
**Rollback**: Revert this function only.

### 2.3 Migrate `getGymPrice`
**Files**: `src/lib/gym-price.ts` (modify)
**TDD test**: 1.1 guard.
**Implementation**: Drop `cacheTag`/`cacheLife`; add `unstable_cache`; keyParts `["gym-price"]`; `tags: ["gym-config"]`; `revalidate: 60`; replace JSDoc banner.
**Verification**: `pnpm build`; guard count drops by 1; price unchanged on `/informacion`.
**Rollback**: Revert the file.

## Phase 3 — `rutinas` Tag Readers

### 3.1 Migrate `getRutinas`
**Files**: `src/lib/rutinas.ts` (modify)
**TDD test**: 1.1 guard.
**Implementation**: Drop directives; wrap body in `unstable_cache(async (ownerId) => fetchRutinasListFromDb(ownerId), ["rutinas-list"], { tags: ["rutinas"], revalidate: 60 })`; `ownerId` flows through inner function args so it joins the auto-key.
**Verification**: `pnpm build`; guard count drops by 1; admin dashboard still lists rutinas.
**Rollback**: Revert the function block.

### 3.2 Migrate `getCachedRutinaById`
**Files**: `src/lib/rutinas.ts` (modify)
**TDD test**: 1.1 guard.
**Implementation**: keyParts `["rutina-by-id"]`; `tags: ["rutinas"]`; `revalidate: 60`; `id` as inner arg; same `fetchRutinaById` body.
**Verification**: `pnpm build`; guard count drops by 1; `/rutinas/[id]` still loads.
**Rollback**: Revert the function block.

### 3.3 Migrate `getStats`
**Files**: `src/lib/rutinas.ts` (modify)
**TDD test**: 1.1 guard.
**Implementation**: keyParts `["rutinas-stats"]`; `tags: ["rutinas"]`; `revalidate: 60`; no args.
**Verification**: `pnpm build`; guard count drops by 1; admin stats card unchanged.
**Rollback**: Revert the function block.

### 3.4 Migrate `getRoutinesPaginated`
**Files**: `src/services/routines/pagination.ts` (modify)
**TDD test**: 1.1 guard; 1.4 Playwright covers end-to-end.
**Implementation**: Drop directives; wrap body in `unstable_cache(async (params) => {...}, ["rutinas-paginated"], { tags: ["rutinas"], revalidate: 30 })`; `params` is the auto-keyed argument; MUST NOT call `searchParams` inside the cached body.
**Verification**: `pnpm build`; guard count drops by 1; `/` still lists routines; `/?search=Full` filters work.
**Rollback**: Revert the function block.

### 3.5 Migrate `getTrainerCounts`
**Files**: `src/services/routines/pagination.ts` (modify)
**TDD test**: 1.1 guard; 1.4 Playwright.
**Implementation**: keyParts `["trainer-counts"]`; `tags: ["rutinas"]`; `revalidate: 30`; `search` as inner arg.
**Verification**: `pnpm build`; guard count drops by 1; trainer pills on `/` still render.
**Rollback**: Revert the function block.

## Phase 4 — Independent Leaves

### 4.1 Migrate `getPromociones`
**Files**: `src/lib/promociones.ts` (modify)
**TDD test**: 1.1 guard.
**Implementation**: keyParts `["promociones"]`; `tags: ["promociones"]`; `revalidate: 60`; JSDoc banner updated.
**Verification**: `pnpm build`; guard count drops by 1; `/informacion` promociones section unchanged.
**Rollback**: Revert the file.

### 4.2 Migrate `getFeriados`
**Files**: `src/lib/feriados.ts` (modify)
**TDD test**: 1.1 guard.
**Implementation**: keyParts `["feriados"]`; `tags: ["feriados"]`; `revalidate: 30` (preserve 30s TTL per D4).
**Verification**: `pnpm build`; guard count drops by 1; feriados badge + informacion page unchanged.
**Rollback**: Revert the file.

### 4.3 Migrate `getDescuentos`
**Files**: `src/lib/descuentos.ts` (modify)
**TDD test**: 1.1 guard.
**Implementation**: keyParts `["descuentos-duracion"]`; `tags: ["descuentos-duracion"]`; `revalidate: 60`; JSDoc banner updated.
**Verification**: `pnpm build`; guard count drops to 0; admin descuentos page unchanged.
**Rollback**: Revert the file.

## Phase 5 — Verification

### 5.1 Run full test suite
**Files**: none (verification only)
**TDD test**: N/A.
**Implementation**: `pnpm test:unit` (all unit + guard = 0 offenders); `pnpm test tests/homepage-regression.spec.ts` (E2E green); `pnpm build` (no compile errors).
**Verification**: All pass; `grep -rl '"use cache"' src/ | xargs grep -l 'from "@/lib/prisma"'` returns 0 files.
**Rollback**: N/A (verification only).

### 5.2 Manual smoke
**Files**: none.
**TDD test**: N/A.
**Implementation**: Start `pnpm dev`; load `/` (routines + trainer pills visible); trigger 500 path (or `?search=nonexistent_xyz_12345` is fine for empty); click "Reintentar" in `ErrorState`; confirm page reloads.
**Verification**: No console errors in DevTools; reload works.
**Rollback**: N/A.
