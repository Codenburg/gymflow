# Delta for Gym Config

## MODIFIED Requirements

### Requirement: Cached Public Price Reader

The public-facing price value displayed on `/informacion` and other public pages MUST be read through a cached reader (`getGymConfigForServer` / `getGymPrice`) implemented with the Next.js 16 `use cache` directive. The reader MUST declare `cacheTag("gym-config")` and `cacheLife({ revalidate: 60 })` (60-second TTL). The reader MUST NOT be the direct Prisma `gym.findUnique` call.

The mutation action `updateGymField` (and any equivalent price-mutating action) MUST call BOTH `revalidatePath` for affected routes AND `revalidateTag("gym-config")` — omitting `revalidateTag` is the latent bug class fixed by this change.
(Previously: Reader used the legacy `unstable_cache` API; mutation actions called `revalidatePath` only.)

#### Scenario: Public price read goes through cached reader

- GIVEN the `/informacion` page renders
- WHEN the price is read for display
- THEN the read MUST go through the cached `getGymConfigForServer` reader (or a thin `getGymPrice` wrapper using the same `gym-config` tag)
- AND the read MUST be served from cache on subsequent requests within the 60-second TTL
- AND the read MUST NOT call `prisma.gym.findUnique` directly from the page

#### Scenario: Cache invalidated on price update

- GIVEN an admin updates the gym price via `updateGymField`
- WHEN the mutation completes
- THEN the action MUST call `revalidateTag("gym-config")` alongside the existing `revalidatePath` calls
- AND the next read of the public price (on any page) MUST return the new value (not the cached stale value)

#### Scenario: use cache directive is the implementation

- GIVEN `getGymConfigForServer` and `getGymPrice` are implemented
- WHEN the source is inspected
- THEN the function body MUST start with the `"use cache"` directive
- AND MUST call `cacheTag("gym-config")` from `next/cache`
- AND MUST call `cacheLife({ revalidate: 60 })` from `next/cache`
- AND MUST NOT import or use `unstable_cache` from `next/cache`

#### Scenario: Reader does not access runtime APIs

- GIVEN `getGymConfigForServer` is a `use cache` function
- WHEN the function body is inspected
- THEN it MUST NOT call `cookies()`, `headers()`, or `searchParams`
- AND it MUST NOT use the `: private` variant of `use cache`

## ADDED Requirements

### Requirement: getGymDisplayForServer uses use cache

`getGymDisplayForServer` (in `src/app/actions/gym.ts`) MUST be implemented with the `use cache` directive, `cacheTag("gym-config")`, and `cacheLife({ revalidate: 60 })`. Its return shape and consumer-facing behavior MUST be unchanged from the previous `unstable_cache` implementation. The reader MUST invalidate when `updateGymField` calls `revalidateTag("gym-config")`.

#### Scenario: getGymDisplayForServer is cached with gym-config tag

- GIVEN `getGymDisplayForServer` is called from a Server Component
- WHEN the function source is inspected
- THEN it MUST declare `"use cache"` as the first statement
- AND it MUST call `cacheTag("gym-config")` and `cacheLife({ revalidate: 60 })`
- AND the response shape MUST match the previous `unstable_cache` implementation

#### Scenario: Display fields reflect new data after update

- GIVEN an admin updates a display field (`nombre`, `direccion`, `mapsEmbedUrl`, `socialInstagram`, `socialWhatsapp`) via `updateGymField`
- WHEN the action calls `revalidateTag("gym-config")`
- THEN the next read of `getGymDisplayForServer` MUST return the updated value
