# Proposal: Migrate `unstable_cache` → `use cache` (Next 16 Cache Components)

## Intent

The project uses `unstable_cache` (Next 15.x legacy API) across 10 cached readers. Next.js 16 deprecated this API in favor of the `use cache` directive + `cacheComponents: true` flag. This change performs the migration: enables `cacheComponents`, rewrites all 10 readers to use `'use cache'` + `cacheTag` + `cacheLife`, and removes the 6 `force-dynamic` flags on admin pages that were defeating the caching.

As a **bonus** discovered during the audit, 5 action files (`rutinas.ts`, `ejercicios.ts`, `dias.ts`, `reorder.ts`, `trainers.ts`) have **0 `revalidateTag` calls** — they call `revalidatePath` but not the corresponding `revalidateTag`. The cached readers exist but mutations don't invalidate them, so admins see stale data after creating/editing records. This change fixes those bugs as part of the migration. One reader (`getStats`) also has no tag at all (latent bug).

## Scope

### In Scope
- Enable `cacheComponents: true` in `next.config.ts`
- Migrate 10 `unstable_cache` readers to `use cache` + `cacheTag` + `cacheLife`:
  - `getGymConfigForServer`, `getGymDisplayForServer` (in `src/app/actions/gym.ts`)
  - `getRoutinesPaginated`, `getTrainerCounts` (in `src/services/routines/pagination.ts`)
  - `getRutinas`, `getCachedRutinaById`, `getStats` (in `src/lib/rutinas.ts`)
  - `getGymPrice` (in `src/lib/gym-price.ts`)
  - `getPromociones` (in `src/lib/promociones.ts`)
  - `getDescuentos` (in `src/lib/descuentos.ts`)
  - `getFeriados` (in `src/lib/feriados.ts`)
- Add the missing `cacheTag("rutinas")` to `getStats` (latent bug fix)
- Add `revalidateTag` calls to 5 action files (zero-coverage gap fix):
  - `actions/rutinas.ts` — add `revalidateTag("rutinas")` to all mutations
  - `actions/ejercicios.ts` — same
  - `actions/dias.ts` — same
  - `actions/reorder.ts` — same
  - `actions/trainers.ts` — add `revalidateTag("users")` (or appropriate tag) to all mutations
- Audit 4 action files with partial coverage and fill gaps:
  - `actions/promociones.ts`
  - `actions/descuentos-duracion.ts`
  - `actions/gym.ts`
  - `actions/feriados.ts`
- Remove 7 `force-dynamic` flags (6 admin pages + 1 API route):
  - `src/app/(admin)/admin/page.tsx`
  - `src/app/(admin)/admin/rutinas/page.tsx`
  - `src/app/(admin)/admin/rutinas/[id]/page.tsx`
  - `src/app/(admin)/admin/rutinas/[id]/dias/[diaId]/page.tsx`
  - `src/app/(admin)/admin/feriados/page.tsx`
  - `src/app/(admin)/admin/config/page.tsx`
  - `src/app/api/feriados/latest/route.ts` (new finding from Slice 1 attempt)

### Out of Scope
- New `use cache` directives in pages themselves (this change only touches readers)
- Multi-instance cache handlers (Redis/KV) — single-instance deployment only
- Edge runtime support — `cacheComponents` requires Node.js
- `cacheComponents: true` is incompatible with Edge runtime; any future edge code needs a workaround
- The "deferred (baja traffic)" and other non-blocking follow-ups in the ROADMAP

## Capabilities

### New Capabilities
(none — extends existing capabilities only)

### Modified Capabilities
- `api`: GET /api/gym response shape, PATCH validation, mutation revalidation — readers change from `unstable_cache` to `use cache`; new `revalidateTag` calls
- `gym-config`: cached readers for `getGymConfigForServer`, `getGymDisplayForServer`, `getGymPrice` use new API
- `homepage`: `getRoutinesPaginated`, `getTrainerCounts` use new API
- `admin-panel`: dashboard / rutinas / feriados / config pages — readers use new API, `force-dynamic` removed
- `database`: `getStats` gains a cache tag (was missing)

## Approach

3 chained logical slices, joint push (per user decision: "el proyecto es mio, yo lo reviso"):

> **Slice ordering (revised)**: The original plan had Slice 1 = enable the flag, Slice 3 = remove `force-dynamic`. Next.js 16 rejects the build at parse time when both coexist ("Route segment config 'dynamic' is not compatible with `nextConfig.cacheComponents`"). The slices are reordered so the flag enables AFTER all `force-dynamic` flags are removed.

- **Slice 1 (Remove `force-dynamic`)**: Remove all 7 `force-dynamic` flags (6 admin pages + 1 API route discovered during the first attempt). Build must still pass (the flags just become no-ops since `cacheComponents` isn't enabled yet).
- **Slice 2 (Enable flag)**: Add `cacheComponents: true` to `next.config.ts`. Build verification checkpoint — the flag enables the `use cache` machinery but no reader uses it yet, so the build should pass.
- **Slice 3 (Reader migration + revalidateTag fixes)**: Migrate all 10 readers to `use cache` + `cacheTag` + `cacheLife`. Fix the 5 zero-coverage `revalidateTag` gaps. Audit + fill 4 partial-coverage files. Add missing tag to `getStats`. This is where the cache finally starts working.

`use cache` migration pattern (from `next-cache-components` skill):

```typescript
// Before (unstable_cache):
export const getX = unstable_cache(
  async (args) => { ... },
  ["key"],
  { tags: ["my-tag"], revalidate: 60 }
);

// After (use cache):
export async function getX(args: Args) {
  "use cache";
  cacheTag("my-tag");
  cacheLife({ revalidate: 60 });
  return ...;
}
```

`unstable_cache` doesn't need `unstable_cache` import anymore — `revalidatePath` and `revalidateTag` come from `next/cache` and are still needed in the action files.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `next.config.ts` | Modified | Add `cacheComponents: true` |
| `src/app/actions/gym.ts` | Modified | 2 readers migrated + revalidateTag audit |
| `src/services/routines/pagination.ts` | Modified | 2 readers migrated |
| `src/lib/rutinas.ts` | Modified | 3 readers migrated (1 gets new tag) |
| `src/lib/gym-price.ts` | Modified | 1 reader migrated |
| `src/lib/promociones.ts` | Modified | 1 reader migrated |
| `src/lib/descuentos.ts` | Modified | 1 reader migrated |
| `src/lib/feriados.ts` | Modified | 1 reader migrated (30s TTL preserved) |
| `src/app/actions/rutinas.ts` | Modified | Add revalidateTag("rutinas") to 3 mutations |
| `src/app/actions/ejercicios.ts` | Modified | Add revalidateTag to 4 mutations |
| `src/app/actions/dias.ts` | Modified | Add revalidateTag to ~5 mutations |
| `src/app/actions/reorder.ts` | Modified | Add revalidateTag to 2 mutations |
| `src/app/actions/trainers.ts` | Modified | Add revalidateTag to 4 mutations |
| `src/app/actions/promociones.ts` | Modified | Audit + fill any revalidateTag gaps |
| `src/app/actions/descuentos-duracion.ts` | Modified | Audit + fill any gaps |
| `src/app/actions/feriados.ts` | Modified | Audit coverage |
| `src/app/(admin)/admin/page.tsx` | Modified | Remove force-dynamic |
| `src/app/(admin)/admin/rutinas/page.tsx` | Modified | Remove force-dynamic |
| `src/app/(admin)/admin/rutinas/[id]/page.tsx` | Modified | Remove force-dynamic |
| `src/app/(admin)/admin/rutinas/[id]/dias/[diaId]/page.tsx` | Modified | Remove force-dynamic |
| `src/app/(admin)/admin/feriados/page.tsx` | Modified | Remove force-dynamic |
| `src/app/(admin)/admin/config/page.tsx` | Modified | Remove force-dynamic |
| `openspec/specs/api/spec.md` | Modified | New cache API contract |
| `openspec/specs/gym-config/spec.md` | Modified | Readers use new API |
| `openspec/specs/database/spec.md` | Modified | `getStats` gains tag |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `cacheComponents: true` is a project-wide flag that changes build behavior | High | Slice 1 verifies build before any reader changes. If Slice 1 build fails, we know the flag is incompatible and can plan a fallback. |
| `use cache` doesn't allow runtime APIs (cookies, headers, searchParams) | Low | All 11 readers verified to not use these (see exploration.md). |
| 5 action files missing `revalidateTag` calls are latent bugs | Confirmed | This change fixes them as part of Slice 2. |
| Removing `force-dynamic` may cause unexpected behavior in admin pages | Medium | The pages use cached readers + `revalidatePath` for writes. `revalidateTag` now works (added in Slice 2). Should be safe. |
| The 30s TTL for `getFeriados` is intentional for "new" badge freshness | Low | Documented in exploration.md + carried over. Don't change to 60s. |
| Total change is ~25 files, 3 slices, ~500-700 lines | Medium | Chained slices, joint push per user pattern. Each slice under 400-line budget. |

## Rollback Plan

3-step rollback in reverse slice order (Slice 3 → Slice 2 → Slice 1):
- Slice 3: re-add the 6 `force-dynamic` flags
- Slice 2: revert readers back to `unstable_cache`, remove added `revalidateTag` calls
- Slice 1: remove `cacheComponents: true` from `next.config.ts`

If the project-wide flag breaks the build at any point in the future, removing it is a 1-line revert that puts the project back into the v0.18.x state.

## Dependencies

- `next@16.1.6` — already installed
- `next-cache-components` skill — for the exact migration syntax
- Existing cached readers — 10 already use `unstable_cache`
- Existing `cacheTag`, `revalidateTag`, `revalidatePath` imports in action files

## Performance & Breaking Changes

- **Bundle size**: Negligible — same code, different API
- **Performance**: **MAJOR WIN** — admin pages were never being cached due to `force-dynamic` flags + `unstable_cache` not being the recommended Next 16 API. After this change, admin pages hit cache for 30-60s windows.
- **Breaking changes**: 
  - `next.config.ts` adds `cacheComponents: true` — any future page that uses `cookies()` / `headers()` / `searchParams` in a `use cache` function will fail to build (mitigated: we already verified no reader uses these)
  - API contract: `unstable_cache` and `use cache` produce equivalent responses; no client-visible change

## Success Criteria

- [ ] `cacheComponents: true` in `next.config.ts`
- [ ] All 10 readers migrated to `use cache` + `cacheTag` + `cacheLife`
- [ ] `getStats` reader has `cacheTag("rutinas")` added (was missing)
- [ ] All 9 action files have `revalidateTag` calls in every mutation function
- [ ] All 6 `force-dynamic` flags removed from admin pages
- [ ] `pnpm build` clean across all 3 slices
- [ ] `pnpm test:unit` — 101/101 still pass
- [ ] `pnpm test tests/gym-config.spec.ts` — 10/11 still pass (same pre-existing failure)
- [ ] Manual smoke: admin creates a rutina, navigates to list, sees fresh data within 1s (cache invalidation works)
- [ ] Manual smoke: admin views /admin/dashboard, second view within 60s is from cache (no DB hit)

## Bump Type

**MAJOR** (1.0.0 if we're at 0.x, otherwise 1.0.0 minor-prep release):
- Project is currently at **0.18.2** (pre-1.0)
- Per semver, pre-1.0 is "anything goes" but this is the largest behavioral change since 0.16.0
- Recommendation: bump to **0.19.0** (MINOR in pre-1.0 semver, but the "MAJOR" equivalent in the project's convention) to signal "this is a big one"
- The ROADMAP lists this as one of the 4 blockers for 1.0 prep — this IS the 1.0 prep

**User confirmation needed**: bump to 0.19.0 (MINOR pre-1.0) or hold for 1.0.0 (after also doing #2, #3, #4)?