# Design: Migrate `unstable_cache` → `use cache` (Next 16 Cache Components)

## Architecture

- **High-level**: enable `cacheComponents: true` → migrate 10 readers to `use cache` + `cacheTag` + `cacheLife` → fix 5 revalidateTag gaps in action files → remove 6 `force-dynamic` flags
- **Data flow**: each cached reader becomes a Server Component function with `'use cache'` directive that calls `cacheTag()` and `cacheLife()` inside; mutations call `revalidateTag()` to invalidate
- **No DB changes** — code-only refactor

## `use cache` Migration Pattern

The migration pattern from the `next-cache-components` skill:

```typescript
// Before (unstable_cache):
import { unstable_cache } from "next/cache";

export const getGymPrice = unstable_cache(
  async () => {
    const gym = await prisma.gym.findUnique({
      where: { id: "gym" },
      select: { price: true },
    });
    return gym?.price ?? null;
  },
  ["gym-price"],
  { tags: ["gym-config"], revalidate: 60 }
);

// After (use cache):
import prisma from "@/lib/prisma";
import { cacheTag, cacheLife } from "next/cache";

export async function getGymPrice() {
  "use cache";
  cacheTag("gym-config");
  cacheLife({ revalidate: 60 });
  const gym = await prisma.gym.findUnique({
    where: { id: "gym" },
    select: { price: true },
  });
  return gym?.price ?? null;
}
```

**Key differences**:
- The function is now `async function getX()` (not `const getX = ...`)
- The `keys` array disappears (auto-derived from function args)
- `tags` becomes `cacheTag("tag")` inside the function
- `revalidate: 60` becomes `cacheLife({ revalidate: 60 })` inside the function
- The exported name is the function itself

**For readers that take args** (e.g., `getCachedRutinaById(id)`):
```typescript
// Before:
export const getCachedRutinaById = (id: string) =>
  unstable_cache(
    async () => { /* uses id */ },
    [id],
    { tags: [RUTINAS_CACHE_TAG], revalidate: 60 }
  )();

// After:
export async function getCachedRutinaById(id: string) {
  "use cache";
  cacheTag(RUTINAS_CACHE_TAG);
  cacheLife({ revalidate: 60 });
  // ... uses id directly
}
```

**For readers with complex args** (e.g., `getRoutinesPaginated({ page, pageSize, search, trainers })`):
- Args become function params
- `use cache` auto-generates the cache key from args (serializable)
- No manual keys array

## `getStats` — missing tag fix (latent bug)

Current:
```typescript
export const getStats = unstable_cache(
  async () => { /* ... */ },
  ["stats"],
  { revalidate: 60 }  // ← NO tags!
);
```

After:
```typescript
export async function getStats() {
  "use cache";
  cacheTag("rutinas");  // ← ADDED — was missing
  cacheLife({ revalidate: 60 });
  // ...
}
```

## `revalidateTag` Audit + Fixes

For each action file, every `revalidatePath(...)` call gets a sibling `revalidateTag(...)` call.

| Action file | Mutations | `revalidatePath` calls | Tags to add |
|-------------|-----------|------------------------|-------------|
| `actions/rutinas.ts` | 3 | 3 | `revalidateTag("rutinas")` |
| `actions/ejercicios.ts` | 4 | 4 | `revalidateTag("rutinas")` |
| `actions/dias.ts` | 8 | 8 | `revalidateTag("rutinas")` |
| `actions/reorder.ts` | 2 | 2 | `revalidateTag("rutinas")` |
| `actions/trainers.ts` | 4 | 4 | `revalidateTag("users")` (or new tag like `trainers`) |
| `actions/promociones.ts` | 11 | 11 | Audit + fill `revalidateTag("promociones")` |
| `actions/descuentos-duracion.ts` | 7 | 7 | Audit + fill `revalidateTag("descuentos-duracion")` |
| `actions/gym.ts` | 8 | 8 | Audit + fill `revalidateTag("gym-config")` |
| `actions/feriados.ts` | 4 | 4 (already has 5 tags) | Audit — probably complete |

The exact mutation names per file are determined during apply.

## Removing `force-dynamic` flags

Before:
```typescript
// src/app/(admin)/admin/page.tsx
export const dynamic = "force-dynamic";
```

After: **delete the line entirely**. The page becomes a Server Component that uses cached readers. The page itself doesn't need `use cache` — it's the readers that are cached. The page re-renders on each request but its data reads come from the cache.

**Why this is safe**: the pages don't use `cookies()` or `headers()` for data (the auth check is in the admin layout, which is separate). Removing the flag means the page is dynamic (re-renders on each request) but its **data reads are cached**. The combination = same UX, faster data.

## File-by-File Changes (per slice)

> **Slice ordering note (revised)**: The original plan had Slice 1 = enable the flag, Slice 3 = remove `force-dynamic`. Next.js 16 rejects the build at parse time when both coexist ("Route segment config 'dynamic' is not compatible with `nextConfig.cacheComponents`"). The slices have been reordered so the flag enables AFTER all `force-dynamic` flags are removed.

### Slice 1 (Remove `force-dynamic`) — target ~10 lines
- 6 admin pages: delete the `export const dynamic = "force-dynamic"` line
  - `src/app/(admin)/admin/page.tsx`
  - `src/app/(admin)/admin/rutinas/page.tsx`
  - `src/app/(admin)/admin/rutinas/[id]/page.tsx`
  - `src/app/(admin)/admin/rutinas/[id]/dias/[diaId]/page.tsx`
  - `src/app/(admin)/admin/feriados/page.tsx`
  - `src/app/(admin)/admin/config/page.tsx`
- 1 API route: `src/app/api/feriados/latest/route.ts` (new finding from Slice 1 attempt)
- Verify: `pnpm build` clean (no reader changes yet; the flags just become no-ops since `cacheComponents` isn't enabled)
- Verify: `pnpm test:unit` still 101/101

### Slice 2 (Enable flag) — target ~5 lines
- `next.config.ts` — add `cacheComponents: true` to the config object
- Verify: `pnpm build` clean (the flag enables the `use cache` machinery but no reader is using it yet; the build should pass)
- Verify: `pnpm test:unit` still 101/101

### Slice 3 (Reader migration + revalidateTag fixes) — target ~500 lines
- 7 reader files modified:
  - `src/app/actions/gym.ts` — 2 readers (`getGymConfigForServer`, `getGymDisplayForServer`)
  - `src/services/routines/pagination.ts` — 2 readers (`getRoutinesPaginated`, `getTrainerCounts`)
  - `src/lib/rutinas.ts` — 3 readers (`getRutinas`, `getCachedRutinaById`, `getStats` + new tag)
  - `src/lib/gym-price.ts` — 1 reader (`getGymPrice`)
  - `src/lib/promociones.ts` — 1 reader (`getPromociones`)
  - `src/lib/descuentos.ts` — 1 reader (`getDescuentos`)
  - `src/lib/feriados.ts` — 1 reader (`getFeriados`, 30s TTL preserved)
- 5 action files get `revalidateTag` added (zero-coverage gaps):
  - `src/app/actions/rutinas.ts` — 3 mutations get `revalidateTag("rutinas")`
  - `src/app/actions/ejercicios.ts` — 4 mutations get `revalidateTag("rutinas")`
  - `src/app/actions/dias.ts` — 8 mutations get `revalidateTag("rutinas")`
  - `src/app/actions/reorder.ts` — 2 mutations get `revalidateTag("rutinas")`
  - `src/app/actions/trainers.ts` — 4 mutations get `revalidateTag("users")`
- 4 action files audited + gaps filled:
  - `src/app/actions/promociones.ts` — fill missing `revalidateTag("promociones")`
  - `src/app/actions/descuentos-duracion.ts` — fill missing `revalidateTag("descuentos-duracion")`
  - `src/app/actions/gym.ts` — fill missing `revalidateTag("gym-config")`
  - `src/app/actions/feriados.ts` — verify complete (added in v0.18.0)
- Remove `unstable_cache` imports from the 7 reader files
- Verify: `pnpm build` clean, tests pass
- Manual smoke: admin creates a record, navigates to list, sees fresh data within 1s (cache invalidation works)
- Manual smoke: admin views dashboard twice within 60s, second view is from cache (no DB hit)

## Total Stats

- 26 files affected (1 config + 7 readers + 9 action files + 7 admin pages/API routes + 4 spec deltas)
- ~600-700 lines net change
- 3 slices, Slice 3 may exceed 400-line budget by ~100 lines (acceptable given joint push)
- Bump: **0.19.0** pre-1.0

## Why the slices are reordered

Next.js 16 does a parse-time check: if `cacheComponents: true` is enabled AND any `export const dynamic = "force-dynamic"` exists anywhere in `src/`, the build fails with:

```
Route segment config "dynamic" is not compatible with `nextConfig.cacheComponents`. Please remove it.
```

The order must be: **(1) remove all `force-dynamic` → (2) enable `cacheComponents: true` → (3) migrate readers to `use cache`**. The original Slice 1 → 2 → 3 order is impossible.

This is a real, non-obvious constraint of Next 16 Cache Components. The apply sub-agent caught it during the first attempt and surfaced it. We're correcting the plan now.

## Migration Order (dependency graph)

```
Slice 1 → Slice 2 → Slice 3 → archive → release
```

Each slice compiles + tests green in isolation. Joint push per user pattern.

## Caching & Revalidation Contract (codified)

After this change, the project's caching contract is:

**Every reader** uses `use cache` + `cacheTag` + `cacheLife` with a defined tag.

**Every mutation** in an action file calls BOTH `revalidatePath` (for path-based revalidation) AND `revalidateTag` (for cache invalidation). The path-based revalidation handles pages; the tag-based handles the cached reader.

**Tag conventions** (stable, don't rename):
- `gym-config` — gym singleton config (price, name, address, social, horario)
- `rutinas` — rutinas, days, ejercicios, stats
- `promociones` — promociones list
- `descuentos-duracion` — descuentos list
- `feriados` — feriados list (30s TTL for "new" badge freshness)
- `users` — trainers (for `actions/trainers.ts` mutations)

## Test Strategy

**Unit tests (Vitest)**: no new tests needed. The migration is a code-shape change; the existing 101 tests still cover the behavior.

**E2E tests (Playwright)**:
- `tests/gym-config.spec.ts` — 10/11 should still pass (the 1 pre-existing failure from v0.17.0 is unrelated)
- Existing E2E tests cover admin flow + cache invalidation. No new tests needed.

**Manual smoke** (per slice):
- Slice 1: build clean
- Slice 2: build clean, unit tests pass
- Slice 3: build clean, unit tests pass, manual admin flow

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `cacheComponents: true` is project-wide flag — may break build for pages that use runtime APIs | Low (audited) | Slice 1 verifies build before any reader changes. All 11 readers verified to not use cookies/headers/searchParams. |
| Removing `force-dynamic` may cause unexpected behavior in admin pages | Medium | The pages use cached readers + `revalidatePath` for writes. `revalidateTag` now works (added in Slice 2). Should be safe. |
| The 30s TTL for `getFeriados` is intentional for "new" badge freshness | Low | Carried over from v0.18.0. Don't change to 60s. |
| Latent `revalidateTag` bugs in 5 action files — fixing them is a real change beyond migration scope | Confirmed | This is an intended side effect of the change. The bugs would cause stale data after the cache is enabled; fixing them now is correct. |

## Ready for Tasks

Yes. The migration order is clear, the risk profile is bounded by Slice 1's flag-only nature, and the spec already covers the `revalidateTag` contract.

## Note for the future agent

After this change, the original `unstable_cache` → `use cache` migration is COMPLETE. The remaining "migrate unstable_cache" follow-up in the ROADMAP can be marked done. The next 1.0 prep items are: #2 (TypeScript errors), #3 (E2E coverage), #4 (GGA hook).