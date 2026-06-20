# Proposal: Fix `use cache` + Prisma RSC errors

## Intent

Four runtime errors break the homepage and any RSC error path that renders `ErrorState`. Root cause: `"use cache"` serializes the captured closure. `prisma` is a `PrismaClient` instance wrapping `pg.Pool` — not JSON-serializable. The v0.19.0 `unstable_cache` → `use cache` migration introduced this. Affects **11 cached readers** across 5 files. Secondary: `ErrorState` is a Server Component but renders a Button with `onClick`.

| # | Error | Where |
|---|-------|-------|
| 1 | `PrismaClientKnownRequestError` on `gym.findUnique` | `src/app/actions/gym.ts:85` |
| 2 | `PrismaClientKnownRequestError` on `rutina.groupBy` | `src/services/routines/pagination.ts:71` |
| 3 | `ErrorBoundary:homepage` cascade | `src/app/error.tsx` |
| 4 | `Event handlers cannot be passed to Client Component props` | `src/app/(public)/page.tsx:116` |

## Scope

**In Scope** — Revert 11 readers `"use cache"` → `unstable_cache`; add `"use client"` to `error-state.tsx`; preserve tags/TTLs (60s gym-config/rutinas/promociones/descuentos/stats, 30s rutinas-pagination/feriados); Playwright regression asserting no console errors on `/`; Vitest grep guard failing if any Prisma-importing file uses `"use cache"`.

**Out of Scope** — Re-attempting `use cache`; TTL/tag changes; refactoring `src/lib/prisma.ts`.

## Capabilities

**New** `next-cache-with-prisma`: any cached reader importing the singleton `prisma` MUST use `unstable_cache`.

**Modified** `homepage`, `gym-config`, `rutinas` readers MUST use `unstable_cache` (lists in § Approach). `components`: `ErrorState` MUST be a client component.

## Approach

**Decision A — A3 (`unstable_cache`)** chosen. Official Next.js workaround for this exact pattern; preserves 60s/30s cross-request cache. A1 drops cache (perf regression); A2 wrapper defeats the cache; A4 `react.cache` is request-scoped only.

**Decision B — B2 (Playwright E2E)** chosen. The bug surfaces only when Next.js' compiler serializes the closure — a Vitest mock of Prisma would not exercise the failure path. Pair with a Vitest test for `ErrorState` and the Vitest grep guard.

Readers to migrate (11 total): `getGymNameForServer`, `getGymDisplayForServer`, `getGymPrice`, `getRutinas`, `getCachedRutinaById`, `getStats`, `getPromociones`, `getFeriados`, `getDescuentos`, `getRoutinesPaginated`, `getTrainerCounts`.

## Affected Areas

| File | Change |
|------|--------|
| `src/app/actions/gym.ts` (2) + `src/services/routines/pagination.ts` (2) + `src/lib/{gym-price,rutinas,promociones,feriados,descuentos}.ts` (7) | Readers → `unstable_cache` |
| `src/components/ui/error-state.tsx` | Add `"use client"` |
| `tests/homepage.spec.ts` + `tests/unit/` | New regression + guard |
| `openspec/specs/{homepage,gym-config,rutinas,components}/spec.md` | Modified delta |
| `openspec/specs/next-cache-with-prisma/spec.md` | New |

## Risks

| Risk | Lik | Mitigation |
|------|-----|------------|
| Forgetting one of 11 readers | Med | Vitest grep guard |
| `unstable_cache` key collision | Low | Unique key per reader |
| Re-adding `"use cache"` later | Low | Spec rule + grep guard |

## Rollback Plan

Revert the 11 reader files + `error-state.tsx` + tests. No DB/TTL changes. <15 min.

## Dependencies

`next@16.1.6` — `unstable_cache` still exported.

## Success Criteria

- [ ] `grep -rl '"use cache"' src/ | xargs grep -l 'from "@/lib/prisma"'` returns 0 files.
- [ ] `pnpm build` succeeds; `pnpm test:unit` passes (guard + ErrorState test).
- [ ] New Playwright test: `/` loads with zero `PrismaClientKnownRequestError` and zero `Event handlers cannot be passed` console errors.
- [ ] Manual: `/` shows routines + trainer pills; error path renders `ErrorState` with working "Reintentar".