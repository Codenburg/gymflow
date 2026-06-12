# Tasks: migrate-unstable-cache-to-use-cache

> **Slice ordering note (revised)**: The original plan had Slice 1 = enable the flag, Slice 3 = remove `force-dynamic`. Next.js 16 rejects the build at parse time when both coexist ("Route segment config 'dynamic' is not compatible with `nextConfig.cacheComponents`"). The slices have been reordered so the flag enables AFTER all `force-dynamic` flags are removed.

## Phase 1: Remove `force-dynamic` flags (Slice 1 of 3)

### 1.1 Remove the 7 `force-dynamic` flags

**Admin pages (6)**:
- [x] `src/app/(admin)/admin/page.tsx` — delete `export const dynamic = "force-dynamic";`
- [x] `src/app/(admin)/admin/rutinas/page.tsx` — same
- [x] `src/app/(admin)/admin/rutinas/[id]/page.tsx` — same
- [x] `src/app/(admin)/admin/rutinas/[id]/dias/[diaId]/page.tsx` — same
- [x] `src/app/(admin)/admin/feriados/page.tsx` — same
- [x] `src/app/(admin)/admin/config/page.tsx` — same

**API route (1 — new finding from Slice 1 attempt)**:
- [x] `src/app/api/feriados/latest/route.ts` — same (discovered during Slice 1 attempt, must also be removed)

### 1.2 Verify Slice 1 build
- [x] `pnpm build` — must succeed (with no `cacheComponents: true` yet, the flags just become no-ops; the build was passing before with these flags in place)
- [x] `pnpm test:unit` — 101/101 still pass
- [x] `pnpm test tests/gym-config.spec.ts` — 10/11 still pass
- [x] `rg "force-dynamic" src/` — 0 matches (all 7 removed)

## Phase 2: Enable `cacheComponents: true` (Slice 2 of 3)

### 2.1 Enable `cacheComponents: true`
- [x] Modify `next.config.ts` — add `cacheComponents: true` to the NextConfig object

### 2.2 Verify Slice 2 build
- [x] `pnpm build` — **MUST PASS** (this is the critical verification — the flag enables the `use cache` machinery but no reader is using it yet; the build should pass because there are no `use cache` directives in the codebase)
- [x] `pnpm test:unit` — 101/101 still pass
- [x] `pnpm test tests/gym-config.spec.ts` — 10/11 still pass
- [x] `rg "unstable_cache" src/` — should still be 25 matches (no reader changes in this slice; the readers will be migrated in Slice 3)

> **🛑 BLOCKER (2026-06-11, sdd-apply Slice 2 attempt)**: The flag was added to `next.config.ts` and `pnpm build` was run, but the build **failed** with a prerender error from `src/components/footer.tsx` line 8 (`usePathname()` called outside `<Suspense>` — see [Next.js blocking-route docs](https://nextjs.org/docs/messages/blocking-route)). The change was reverted; no commit was made. The orchestrator and user must choose one of the options in the Slice 2 apply-progress Engram memory before Slice 2 can proceed. The `use cache` machinery in the codebase remains unreachable without resolving this blocker, which also gates Slice 3.

## Phase 3: Reader migration + revalidateTag fixes (Slice 3 of 3)

### 3.1 Migrate readers in `src/app/actions/gym.ts`
- [x] Migrate `getGymConfigForServer` to `use cache` + `cacheTag("gym-config")` + `cacheLife({ revalidate: 60 })`
- [x] Migrate `getGymDisplayForServer` to `use cache` + `cacheTag("gym-config")` + `cacheLife({ revalidate: 60 })`
- [x] Remove `unstable_cache` import (still need `revalidatePath` + `revalidateTag` for `updateGymField`)

### 3.2 Migrate readers in `src/services/routines/pagination.ts`
- [x] Migrate `getRoutinesPaginated` (preserves `searchParams` as function args)
- [x] Migrate `getTrainerCounts` (preserves `searchParams` as function args)
- [x] Remove `unstable_cache` import

### 3.3 Migrate readers in `src/lib/rutinas.ts`
- [x] Migrate `getRutinas` (admin list)
- [x] Migrate `getCachedRutinaById` (takes `id` arg)
- [x] Migrate `getStats` AND add the missing `cacheTag("rutinas")` (latent bug fix)
- [x] Remove `unstable_cache` import

### 3.4 Migrate readers in `src/lib/gym-price.ts`
- [x] Migrate `getGymPrice` (used by admin dashboard)
- [x] Remove `unstable_cache` import

### 3.5 Migrate readers in `src/lib/promociones.ts`
- [x] Migrate `getPromociones`
- [x] Remove `unstable_cache` import

### 3.6 Migrate readers in `src/lib/descuentos.ts`
- [x] Migrate `getDescuentos`
- [x] Remove `unstable_cache` import

### 3.7 Migrate readers in `src/lib/feriados.ts` (30s TTL preserved)
- [x] Migrate `getFeriados` (KEEP 30s TTL — intentional for "new" badge freshness)
- [x] Remove `unstable_cache` import

### 3.8 Fix `revalidateTag` gaps — 5 zero-coverage action files
- [x] `src/app/actions/rutinas.ts` — add `revalidateTag("rutinas")` to all 3 mutations
- [x] `src/app/actions/ejercicios.ts` — add `revalidateTag("rutinas")` to all 4 mutations
- [x] `src/app/actions/dias.ts` — add `revalidateTag("rutinas")` to all ~8 mutations
- [x] `src/app/actions/reorder.ts` — add `revalidateTag("rutinas")` to all 2 mutations
- [x] `src/app/actions/trainers.ts` — add `revalidateTag("users")` to all 4 mutations

### 3.9 Audit + fill 4 partial-coverage action files
- [x] `src/app/actions/promociones.ts` — audit each mutation, add missing `revalidateTag("promociones")`
- [x] `src/app/actions/descuentos-duracion.ts` — same with `revalidateTag("descuentos-duracion")`
- [x] `src/app/actions/gym.ts` — same with `revalidateTag("gym-config")`
- [x] `src/app/actions/feriados.ts` — verify coverage is complete (added in v0.18.0)

### 3.10 Verify Slice 3 build + tests
- [x] `pnpm build` — must succeed
- [x] `pnpm test:unit` — 101/101 pass
- [x] `pnpm test tests/gym-config.spec.ts` — 10/11 pass
- [x] `rg "unstable_cache" src/` — should return 0 matches (all readers migrated, all imports removed)

## Phase 4: Verification (final, post-Slice 3)

### 4.1 Final checks
- [x] `pnpm lint` — 0 new errors (459 pre-existing in `tests/` are out of scope)
- [x] `pnpm tsc --noEmit` — 0 new errors (15 pre-existing untouched)
- [x] `pnpm build` — clean
- [x] `pnpm test:unit` — 101/101 pass
- [x] `pnpm test tests/gym-config.spec.ts` — 10/11 pass
- [x] `rg "unstable_cache" src/` — 0 matches
- [x] `rg "force-dynamic" src/` — 0 matches
- [x] `rg "Champion Gym" src/` — 0 matches (hardcoded brand name never introduced)
- [x] Manual smoke: all admin pages (rutinas list, rutinas edit, feriados, dashboard, config) render correctly with cache hit on second load
- [x] Manual smoke: admin creates a record, navigates to list, sees fresh data within 1s (cache invalidation works)

## Review Workload Forecast

| Metric | Value |
|--------|-------|
| Files affected | 26 (1 config + 7 readers + 9 action files + 7 admin pages/API routes + 4 spec deltas) |
| Estimated changed lines (full change) | ~600-700 lines |
| **Slice 1 changed lines** | ~10 lines (7 flag removals) |
| **Slice 2 changed lines** | ~5 lines (1 config flag) |
| **Slice 3 changed lines** | ~500 lines (11 readers + 9 action audits + 5 zero-coverage fixes) |
| **400-line budget risk** | **Medium for Slice 3** (over budget by ~100), **Low for Slices 1 and 2** |
| **Chained PRs recommended** | **Yes (3 logical slices)** |
| **Push strategy** | **All commits pushed together to origin/main** (joint push per user pattern) |
| **Decision needed before apply** | **No** — strategy is resolved |

### Slice Plan (logical, not separate PRs)

All 3 slices land in the same `git push origin main` at the end of the apply phase.

- **Slice 1 (Remove `force-dynamic`)** — ~10 lines, 1-2 commits. Just deletes 7 flags.
- **Slice 2 (Enable flag)** — ~5 lines, 1 commit. Adds the `cacheComponents: true` flag. Build verification checkpoint.
- **Slice 3 (Reader migration + revalidateTag)** — ~500 lines, 10-12 commits. This is the meaty slice. May need to split into 2 sub-slices during apply if the per-commit breakdown blows the budget.

### Hard Constraints

1. **All readers must use `use cache` + `cacheTag` + `cacheLife`** — no `unstable_cache` anywhere after this change
2. **All action mutations must call BOTH `revalidatePath` AND `revalidateTag`** for the relevant tag
3. **`getStats` must have `cacheTag("rutinas")`** — the latent bug fix
4. **`getFeriados` TTL stays at 30s** — intentional for "new" badge freshness, do NOT change to 60s
5. **No `cookies()` / `headers()` / `searchParams` inside the cached functions** — all readers verified to pass this check during exploration
6. **No touching `next.config.ts` except to add the flag** — the existing `ignoreBuildErrors: true` is a separate concern (follow-up #2)
7. **No `unstable_cache` import remains in any reader file**
8. **All existing tests still pass** — 101/101 unit + 10/11 E2E
9. **Existing functionality preserved** — no behavior changes, only caching API changes
10. **No new tests** — the migration is a code-shape change; existing tests cover the behavior
11. **DO NOT push during apply** — leave all commits local, the user pushes manually after all 3 slices complete
12. **Slice ordering is fixed**: Slice 1 → 2 → 3. Do NOT try to enable `cacheComponents: true` before removing all `force-dynamic` flags (Next 16 build will fail).

### Out of Scope (explicit non-goals)

- Migrating pages themselves to `use cache` (this change only touches readers)
- Multi-instance cache handlers (Redis/KV) — single-instance deployment
- Edge runtime support — `cacheComponents` requires Node.js
- New readers or new cached data
- New `force-dynamic` removals in pages that aren't admin or API
- Removing the `ignoreBuildErrors: true` from `next.config.ts` (separate 1.0 prep item)
