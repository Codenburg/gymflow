# Exploration: migrate-unstable-cache-to-use-cache

## Confirmed Inventory

### `unstable_cache` readers to migrate (10 total, not 11)

| # | Reader | File | Lines | Tag | TTL | Notes |
|---|--------|------|-------|-----|-----|-------|
| 1 | `getGymConfigForServer` | `src/app/actions/gym.ts` | 65-75 | `gym-config` | 60s | Existing |
| 2 | `getGymDisplayForServer` | `src/app/actions/gym.ts` | 90-113 | `gym-config` | 60s | Existing |
| 3 | `getRoutinesPaginated` | `src/services/routines/pagination.ts` | 56-97 | `RUTINAS_CACHE_TAG` | 30s | Existing |
| 4 | `getTrainerCounts` | `src/services/routines/pagination.ts` | 118-207 | `RUTINAS_CACHE_TAG` | 30s | Existing |
| 5 | `getRutinas` (admin) | `src/lib/rutinas.ts` | 130-135 | `RUTINAS_CACHE_TAG` | 60s | Existing |
| 6 | `getCachedRutinaById` | `src/lib/rutinas.ts` | 212-217 | `RUTINAS_CACHE_TAG` | 60s | Existing |
| 7 | `getStats` | `src/lib/rutinas.ts` | 254-258 | (no tag — bug) | 60s | **NEEDS tag added** |
| 8 | `getGymPrice` | `src/lib/gym-price.ts` | 22-36 | `gym-config` | 60s | New in v0.18.0 |
| 9 | `getPromociones` | `src/lib/promociones.ts` | 22-34 | `promociones` | 60s | New in v0.18.0 |
| 10 | `getDescuentos` | `src/lib/descuentos.ts` | 24-36 | `descuentos-duracion` | 60s | New in v0.18.0 |
| 11 | `getFeriados` | `src/lib/feriados.ts` | 27-39 | `feriados` | **30s** (intentional — "new" badge freshness) | New in v0.18.0 |

**Wait — `getStats` has no tag!** That's a latent bug. The audit caught it.

### `force-dynamic` flags to remove (6 confirmed)

All in `src/app/(admin)/admin/`:
1. `page.tsx` (dashboard) — line 10
2. `rutinas/page.tsx` — line 10
3. `rutinas/[id]/page.tsx` — line 16
4. `rutinas/[id]/dias/[diaId]/page.tsx` — line 7
5. `feriados/page.tsx` — line 6
6. `config/page.tsx` — line 10

### `revalidateTag` audit — CRITICAL FINDINGS

| Action file | `revalidatePath` | `revalidateTag` | Status |
|-------------|------------------|-----------------|--------|
| `actions/rutinas.ts` | 3 | **0** | 🔴 GAP — must add `revalidateTag("rutinas")` to all mutations |
| `actions/ejercicios.ts` | 4 | **0** | 🔴 GAP — must add `revalidateTag("rutinas")` |
| `actions/dias.ts` | 8 | **0** | 🔴 GAP — must add `revalidateTag("rutinas")` |
| `actions/reorder.ts` | 2 | **0** | 🔴 GAP — must add `revalidateTag("rutinas")` |
| `actions/trainers.ts` | 4 | **0** | 🔴 GAP — must add `revalidateTag("users")` or similar |
| `actions/feriados.ts` | 4 | 5 | ✅ (added in page-loading-overhaul v0.18.0) |
| `actions/promociones.ts` | 11 | 7 | Partial — some paths missing |
| `actions/descuentos-duracion.ts` | 7 | 5 | Partial — some paths missing |
| `actions/gym.ts` | 8 | 6 | Partial — verify coverage |

**5 action files have 0 `revalidateTag` calls** — these are latent bugs that the migration MUST fix. The readers ARE cached (post-migration), but mutations don't invalidate them, so admins will see stale data after creating/editing records.

### Runtime API check (CRITICAL for `use cache`)

`use cache` does NOT allow `cookies()`, `headers()`, or `searchParams` inside the cached function. Need to verify each reader:

- `getGymConfigForServer` — reads from DB only ✅
- `getGymDisplayForServer` — reads from DB only ✅
- `getRoutinesPaginated` — takes `searchParams` as ARGUMENT (not inside) ✅
- `getTrainerCounts` — takes `searchParams` as ARGUMENT (not inside) ✅
- `getRutinas` — reads from DB only ✅
- `getCachedRutinaById` — takes `id` as ARGUMENT ✅
- `getStats` — reads from DB only ✅
- `getGymPrice` — reads from DB only ✅
- `getPromociones` — reads from DB only ✅
- `getDescuentos` — reads from DB only ✅
- `getFeriados` — reads from DB only ✅

**All readers pass the runtime API check** — no `'use cache: private'` workarounds needed.

## Affected Files

### Readers to migrate (7 files)
- `src/app/actions/gym.ts`
- `src/services/routines/pagination.ts`
- `src/lib/rutinas.ts`
- `src/lib/gym-price.ts`
- `src/lib/promociones.ts`
- `src/lib/descuentos.ts`
- `src/lib/feriados.ts`

### Action files needing `revalidateTag` additions (5 files, critical bug fix)
- `src/app/actions/rutinas.ts`
- `src/app/actions/ejercicios.ts`
- `src/app/actions/dias.ts`
- `src/app/actions/reorder.ts`
- `src/app/actions/trainers.ts`

### Action files needing audit + possible additions (4 files)
- `src/app/actions/promociones.ts` (some paths missing)
- `src/app/actions/descuentos-duracion.ts` (some paths missing)
- `src/app/actions/gym.ts` (verify coverage)
- `src/app/actions/feriados.ts` (verify, added in v0.18.0)

### `force-dynamic` flags to remove (6 files)
- `src/app/(admin)/admin/page.tsx`
- `src/app/(admin)/admin/rutinas/page.tsx`
- `src/app/(admin)/admin/rutinas/[id]/page.tsx`
- `src/app/(admin)/admin/rutinas/[id]/dias/[diaId]/page.tsx`
- `src/app/(admin)/admin/feriados/page.tsx`
- `src/app/(admin)/admin/config/page.tsx`

### Config
- `next.config.ts` — add `cacheComponents: true`

**Total**: ~25 files affected

## Migration Order (dependency graph)

The slices should respect this order so each one compiles + passes tests independently:

1. **Slice 1: Foundation**
   - Add `cacheComponents: true` to `next.config.ts`
   - Verify build still passes (no readers migrated yet, just flag is on)

2. **Slice 2: Reader migration + revalidateTag fixes (THE BIG SLICE)**
   - Migrate all 11 readers to `use cache` + `cacheTag` + `cacheLife`
   - Add `revalidateTag` calls to 5 action files (the 0-coverage ones)
   - Audit + fix 4 action files (the partial-coverage ones)
   - Add missing tag to `getStats` reader
   - Verify build + tests pass

3. **Slice 3: Remove `force-dynamic` flags**
   - Remove the 6 flags
   - Verify build + tests pass (this is where the cache finally starts working — the flags were defeating it)
   - Manual smoke: admin creates a rutina, navigates to list, sees fresh data within 1s (cache invalidation)

## Risk: `cacheComponents: true` is a project-wide flag

Enabling it changes the build behavior:
- All pages with `cookies()` / `headers()` / `searchParams` access become dynamic
- The static prerendering of `/feriados` and `/informacion` may change
- Any page that doesn't pass the `use cache` constraint will fail at build time

Mitigation:
- Slice 1 ONLY enables the flag and verifies build — no reader changes
- If Slice 1 build fails, we know the flag is incompatible and need a fallback plan
- Slice 2 migrates all readers BEFORE Slice 3 removes `force-dynamic`, so the build stays green between slices

## Ready for Proposal

Yes. The inventory is complete, the runtime API check passes, the migration order is clear. The 5 critical `revalidateTag` gaps are a real bug fix that improves the change beyond just "move from one API to another".