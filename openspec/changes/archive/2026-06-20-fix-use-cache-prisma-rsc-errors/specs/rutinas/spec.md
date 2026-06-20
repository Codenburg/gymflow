# Delta for rutinas

## Purpose

Add caching rules for the rutinas data readers. The current `rutinas` spec covers drag-and-drop reordering only; this delta adds explicit requirements that the cached data readers (`getRutinas`, `getCachedRutinaById`, `getStats`) MUST use `unstable_cache` instead of `"use cache"` because they import the singleton `prisma`.

## ADDED Requirements

### Requirement: Rutinas Data Readers Use unstable_cache

The cached data readers in `src/lib/rutinas.ts` — `getRutinas`, `getCachedRutinaById`, and `getStats` — MUST be implemented with `unstable_cache` from `next/cache`. Each reader MUST declare `tags: ["rutinas"]` and `revalidate: 60` (60-second TTL). The readers MUST accept all parameters (including `ownerId`, `id`) as function arguments, MUST NOT read runtime APIs (`cookies`, `headers`, `searchParams`) inside the cached body, and MUST NOT use the `"use cache"` directive.

(Reason: These readers import the singleton `prisma` instance from `@/lib/prisma`. The Next.js 16 `"use cache"` directive serializes the captured closure; `prisma` wraps a `pg.Pool` and is not JSON-serializable, causing `PrismaClientKnownRequestError` at request time. `unstable_cache` keeps the cross-request cache without serializing the closure.)

#### Scenario: getRutinas uses unstable_cache with rutinas tag

- GIVEN `getRutinas` lives in `src/lib/rutinas.ts`
- WHEN the function source is inspected
- THEN its body MUST be wrapped in `unstable_cache(...)` from `next/cache`
- AND MUST declare `tags: ["rutinas"]` and `revalidate: 60`
- AND MUST accept `ownerId` as a function argument
- AND MUST NOT use the `"use cache"` directive

#### Scenario: getCachedRutinaById uses unstable_cache

- GIVEN `getCachedRutinaById` lives in `src/lib/rutinas.ts`
- WHEN the function source is inspected
- THEN its body MUST be wrapped in `unstable_cache(...)` from `next/cache`
- AND MUST declare `tags: ["rutinas"]` and `revalidate: 60`
- AND MUST accept `id` as a function argument
- AND MUST NOT use the `"use cache"` directive

#### Scenario: getStats uses unstable_cache

- GIVEN `getStats` lives in `src/lib/rutinas.ts`
- WHEN the function source is inspected
- THEN its body MUST be wrapped in `unstable_cache(...)` from `next/cache`
- AND MUST declare `tags: ["rutinas"]` and `revalidate: 60`
- AND MUST NOT use the `"use cache"` directive

#### Scenario: Rutinas readers invalidate on cacheTag("rutinas") revalidation

- GIVEN a mutation action calls `revalidateTag("rutinas")` (e.g. after creating/updating/deleting a Rutina, Dia, or Ejercicio)
- WHEN the next request reads `getRutinas`, `getCachedRutinaById`, or `getStats`
- THEN the returned data MUST reflect the latest DB state (not the stale cached value)

#### Scenario: Rutinas readers do not throw PrismaClientKnownRequestError

- GIVEN a Server Component consumes `getRutinas`, `getCachedRutinaById`, or `getStats`
- WHEN Next.js resolves the cached function
- THEN the browser console SHALL NOT contain `PrismaClientKnownRequestError`
- AND the request SHALL return a 200 status with the expected payload