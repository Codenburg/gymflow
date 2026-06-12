# Delta for Database

## ADDED Requirements

### Requirement: getStats reader declares the rutinas cache tag

`getStats` (in `src/lib/rutinas.ts`) MUST be implemented as a Next.js 16 `use cache` function that declares `cacheTag("rutinas")` and `cacheLife({ revalidate: 60 })` (60-second TTL). The tag MUST be the same `rutinas` tag used by `getRoutinesPaginated`, `getTrainerCounts`, `getRutinas`, and `getCachedRutinaById`, so that a single `revalidateTag("rutinas")` from any rutina-mutating action invalidates all of them.
(Previously: `getStats` was cached via `unstable_cache` with NO tag at all — a latent bug, since the mutation actions had no way to invalidate it. The result was that the dashboard's stat counts could stay stale indefinitely after a routine mutation.)

#### Scenario: getStats is a use cache function with the rutinas tag

- GIVEN `getStats` is the source of the dashboard's stat cards (total rutinas, dias, ejercicios)
- WHEN the function source is inspected
- THEN the body MUST start with the `"use cache"` directive
- AND MUST call `cacheTag("rutinas")` and `cacheLife({ revalidate: 60 })`
- AND MUST NOT import or use `unstable_cache` from `next/cache`
- AND MUST NOT be missing the `cacheTag` declaration (the pre-migration bug)

#### Scenario: Stats refresh after a rutina mutation

- GIVEN `getStats` is cached and `revalidateTag("rutinas")` is called by `createRutina` / `deleteRutina` / `updateRutina` / `createEjercicio` / `deleteEjercicio` / `createDia` / `deleteDia` / `reorderEjercicios`
- WHEN any of those actions completes successfully
- THEN the next call to `getStats` MUST return the fresh counts
- AND the stat card grid on `/admin` MUST display the new totals (not stale pre-mutation values)

#### Scenario: getStats does not access runtime APIs

- GIVEN `getStats` is a `use cache` function
- WHEN the body is inspected
- THEN it MUST NOT call `cookies()`, `headers()`, or `searchParams`
- AND it MUST NOT use `use cache: private`
