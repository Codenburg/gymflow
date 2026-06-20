# Design: Fix `use cache` + Prisma RSC errors

## Technical Approach

Pure reader-side revert: swap 11 `"use cache"` directives for `unstable_cache` wrappers, and add `"use client"` to `ErrorState`. Revalidation wiring is already in place (`revalidateTag("gym-config")` in `actions/gym.ts:196,268`; `revalidateTag("rutinas")` in `reorder.ts:97` and `ejercicios.ts:86,159,215`; matching tags in `promociones.ts`, `feriados.ts`, `descuentos-duracion.ts`) — no action-side changes needed. The "Migrated to Next.js 16" JSDoc banners get replaced with `unstable_cache` migration notes. The proposal is the spec; this design records the wrapper shape, order, and tests.

## Architecture Decisions

| # | Decision | Choice | Alternatives | Rationale |
|---|----------|--------|--------------|-----------|
| D1 | Cache API | `unstable_cache(fn, keyParts, { tags, revalidate })` | `react.cache` (req-scoped), `globalThis` Map (per-process), drop cache (perf) | `unstable_cache` is the Next.js 16 workaround for this exact closure-serialization bug. Preserves cross-request cache + tags + TTL. |
| D2 | `keyParts` strategy | Static `["<reader>"]` per function; dynamic args hashed automatically by Next | Embed `JSON.stringify(args)` in `keyParts` | Next.js appends the function call args to the cache key automatically; static `keyParts` keeps unique-per-reader guarantees and avoids accidental key collisions between siblings in the same file. |
| D3 | `keyParts` namespace | Per-reader: `gym-name`, `gym-display`, `gym-price`, `rutinas-list`, `rutina-by-id`, `rutinas-stats`, `rutinas-paginated`, `trainer-counts`, `promociones`, `feriados`, `descuentos-duracion` | Single global key `cache` | Prevents two readers in `actions/gym.ts` from sharing a cache entry. |
| D4 | TTL profile | `revalidate: 60` gym/rutinas/promociones/descuentos; `revalidate: 30` rutinas-pagination/feriados | Drop down to 30s everywhere | Spec mandates preservation of pre-`use cache` values. 30s pagination/feriados are documented intentional choices. |
| D5 | ErrorState direction | Add `"use client"` directive (1 line) | Extract a `ErrorStateClient` wrapper, convert to render-prop | The component has no other server-only concerns; one directive is the minimum. Keeps `data-testid="error-state"` selector. |
| D6 | Test for the bug surface | Playwright E2E (page console listener) + Vitest grep guard | Vitest unit only, no E2E | The bug only manifests when Next.js serializes the closure during a real RSC render. A Vitest mock wouldn't exercise the failure path. |
| D7 | Guard trigger | Vitest unit test scans `src/**/*.{ts,tsx}` for `use cache` ∩ `@/lib/prisma` | ESLint custom rule | Vitest is already wired; zero new infra. ESLint rule would need a custom plugin. |

## Data Flow

    Server Component
         │
         ▼
    public reader (e.g. getGymNameForServer)
         │
         ├──► unstable_cache wrapper
         │       keyParts: ["gym-name"]
         │       tags: ["gym-config"], revalidate: 60
         │
         ▼
    cache MISS ──► prisma.gym.findUnique() ──► result
    cache HIT  ──► result (≤60s old)
         │
         ▼
    RSC payload  ──► Client (or further server render)

    Mutation path:  updateGymField() ──► revalidateTag("gym-config") ──► purge

## unstable_cache Wrapper Pattern

```ts
// src/lib/gym-price.ts
import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";

export async function getGymPrice(): Promise<number | null> {
  return unstable_cache(
    async () => {
      try {
        const gym = await prisma.gym.findUnique({
          where: { id: "gym" },
          select: { price: true },
        });
        return gym ? Number(gym.price) : null;
      } catch (error) {
        console.error("[getGymPrice] Failed to fetch gym price:", error);
        return null;
      }
    },
    ["gym-price"],                   // static keyParts (unique per reader)
    { tags: ["gym-config"], revalidate: 60 }
  )();
}
```

For arg-taking readers (`getRutinas(ownerId)`, `getCachedRutinaById(id)`, `getRoutinesPaginated(params)`, `getTrainerCounts(search)`): pass the typed args through the inner function — Next.js appends them to the cache key, so different `ownerId`/`id`/`params`/`search` produce different entries.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/actions/gym.ts` | Modify | `getGymNameForServer` + `getGymDisplayForServer`: drop `"use cache"`/`cacheTag`/`cacheLife`; wrap body in `unstable_cache` with unique keyParts, `tags: ["gym-config"]`, `revalidate: 60` |
| `src/services/routines/pagination.ts` | Modify | `getRoutinesPaginated` + `getTrainerCounts`: same pattern; `tags: ["rutinas"]`, `revalidate: 30`; `params`/`search` flow through the inner function |
| `src/lib/rutinas.ts` | Modify | `getRutinas` + `getCachedRutinaById` + `getStats`: wrap in `unstable_cache`; `tags: ["rutinas"]`, `revalidate: 60`; `ownerId`/`id` are inner-function args |
| `src/lib/promociones.ts` | Modify | `getPromociones`: wrap; `tags: ["promociones"]`, `revalidate: 60` |
| `src/lib/gym-price.ts` | Modify | `getGymPrice`: wrap; `tags: ["gym-config"]`, `revalidate: 60` |
| `src/lib/feriados.ts` | Modify | `getFeriados`: wrap; `tags: ["feriados"]`, `revalidate: 30` |
| `src/lib/descuentos.ts` | Modify | `getDescuentos`: wrap; `tags: ["descuentos-duracion"]`, `revalidate: 60` |
| `src/components/ui/error-state.tsx` | Modify | Add `"use client"` as the first statement; keep `data-testid="error-state"` and the `onClick` handler |
| `tests/unit/cache-prisma-guard.test.ts` | Create | Vitest: scan `src/**/*.{ts,tsx}`; fail if any file contains both `"use cache"` and `from "@/lib/prisma"`; print offending paths |
| `tests/unit/error-state.test.tsx` | Create | Vitest: render `ErrorState`; assert "Reintentar" button is a `<button>` with an `onClick` (no `Event handlers cannot be passed` build error) |
| `tests/homepage-regression.spec.ts` | Create | Playwright: navigate `/`; attach `page.on("console", …)`; assert no `PrismaClientKnownRequestError` / no `Event handlers cannot be passed to Client Component props`; assert `ErrorBoundary:homepage` not present; visit an error path and click `[data-testid="error-state"]` "Reintentar" |

## Migration Order

1. **`tests/unit/cache-prisma-guard.test.ts`** (create) — Fails on the current tree. Becomes the safety net for every subsequent step.
2. **`src/components/ui/error-state.tsx`** (modify — add `"use client"`) — Single-line, independent of cache work; unblocks the `Event handlers` error in the homepage's error branch.
3. **`src/app/actions/gym.ts`** — `getGymNameForServer` + `getGymDisplayForServer`; `gym-config` tag.
4. **`src/lib/gym-price.ts`** — `getGymPrice`; `gym-config` tag. (Same tag group; groups the touch of the most-touched tag.)
5. **`src/lib/rutinas.ts`** — `getRutinas` + `getCachedRutinaById` + `getStats`; `rutinas` tag, 60s.
6. **`src/services/routines/pagination.ts`** — `getRoutinesPaginated` + `getTrainerCounts`; `rutinas` tag, 30s.
7. **`src/lib/promociones.ts`**, **`src/lib/feriados.ts`**, **`src/lib/descuentos.ts`** — independent leaves, any order after the prior two groups.
8. **`tests/unit/error-state.test.tsx`** + **`tests/homepage-regression.spec.ts`** — locks the regression.

Each step leaves the tree in a runnable state; the guard test fails on the current tree and passes after step 7.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (Vitest) | No `use cache` + `prisma` co-occurrence | Grep guard — `fast-glob` or `node:fs` recursive walk; `readFileSync`; assert no file matches both regexes; report all offenders in the failure message |
| Unit (Vitest) | `ErrorState` renders with onClick | `render(<ErrorState message="x" />)`; assert button is a real DOM element with a click handler attached (no build-time `Event handlers` error) |
| E2E (Playwright) | `/` loads with no Prisma or event-handler console errors | `page.on("console", …)` listener collects all messages; navigate to `/`; wait for `getByText("Full Body").first().toBeVisible()`; assert collected messages contain neither `PrismaClientKnownRequestError` nor `Event handlers cannot be passed to Client Component props`; assert `page.content()` does not include `ErrorBoundary:homepage` |
| E2E (Playwright) | `ErrorState` "Reintentar" button is clickable | Force an error path (e.g. intercept `/api/rutinas` with 500, or rely on the existing `4.15` pattern in `homepage.spec.ts:224-247`); `await expect(page.locator('[data-testid="error-state"]')).toBeVisible()`; `await button.click()` does not throw |

## Rollback Plan

Revert the 9 source files + 2 test files (single `git revert` of the change's commit). No DB migration, no TTL/key change, no schema change. The cache wraps are functionally equivalent to the pre-`use cache` shape, so re-adding the directives later requires no data backfill. **<15 min** end-to-end.

## Risks

| Risk | Lik | Mitigation |
|------|-----|------------|
| Forgetting one of 11 readers | Med | Guard test fails the build if any pair survives |
| Two readers in the same file share a cache key (e.g. both `actions/gym.ts`) | Low | Per-reader static `keyParts` (D3); guard test catches `use cache` but not key collision — add a per-file uniqueness check to the guard if the team wants belt + suspenders |
| Playwright timing flakiness on `ErrorState` click | Low | Use the existing `helpers.ts:waitForToast` + `aria-label="Notifications"` pattern; the `error.tsx` boundary already fires reliably in `homepage.spec.ts:4.15` |
| `revalidateTag` profile arg (`"max"`) being dropped on the `use cache` → `unstable_cache` revert | Low | Audit: every `revalidateTag` call already passes `"max"` as a second arg (confirmed in `actions/*.ts`). No change required. |

## Open Questions

- [ ] Should the guard also fail on `use cache: private` (a defensive rule not currently exercised)? Pro: future-proofs against re-introduction. Con: small false-positive surface. **Recommendation: include `use cache: private` in the regex for forward safety.** Awaiting user confirmation.
- [ ] Single PR or stacked PR? D1 (400-line review budget) plus 9 modified files + 3 new files = ~500 lines. A single PR is on the edge; two stacked PRs (guard+error-state first, then the 7 readers) keep each under 400 lines. **Recommendation: stacked PRs (guard+error-state as PR1, readers as PR2) for review ergonomics.** Awaiting user confirmation.
