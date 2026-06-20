# Delta for gym-config

## Purpose

Revert the cached gym-config readers from `"use cache"` back to `unstable_cache` because the singleton `prisma` instance is not JSON-serializable. Tags, TTLs, and revalidation behavior are preserved.

## MODIFIED Requirements

### Requirement: Cached Public Price Reader

The public-facing price on `/informacion` and other public pages MUST be read through a cached reader (`getGymConfigForServer` / `getGymPrice`) implemented with `unstable_cache` from `next/cache`, declaring `tags: ["gym-config"]` and `revalidate: 60`. The mutation action `updateGymField` MUST call BOTH `revalidatePath` for affected routes AND `revalidateTag("gym-config")`.
(Previously: Reader used `"use cache"` with `cacheTag("gym-config")` + `cacheLife({ revalidate: 60 })`; serializing the captured closure caused `PrismaClientKnownRequestError` on `gym.findUnique`.)

#### Scenario: Public price read goes through cached reader

- GIVEN the `/informacion` page renders
- WHEN the price is read for display
- THEN the read MUST go through the cached `getGymConfigForServer` (or `getGymPrice` wrapper using `gym-config` tag)
- AND the response MUST be served from cache within the 60-second TTL
- AND the page MUST NOT call `prisma.gym.findUnique` directly

#### Scenario: Cache invalidated on price update

- GIVEN an admin updates the gym price via `updateGymField`
- WHEN the mutation completes
- THEN the action MUST call `revalidateTag("gym-config")` alongside existing `revalidatePath` calls
- AND the next public read MUST return the new value

#### Scenario: Stale data acceptable for 60 seconds

- GIVEN an admin updates the price at time T
- WHEN a public page reads the price between T and T+60s without a revalidation
- THEN the page MAY display the cached old value (acceptable per the 60-second TTL)
- AND the admin panel's own page MUST show the new value immediately

#### Scenario: Price reader does not throw PrismaClientKnownRequestError

- GIVEN `getGymPrice` or `getGymConfigForServer` is called from a Server Component
- WHEN Next.js resolves the cached function
- THEN the browser console SHALL NOT contain `PrismaClientKnownRequestError` for `gym.findUnique`
- AND the returned price MUST match the current DB row

### Requirement: getGymDisplayForServer uses unstable_cache

`getGymDisplayForServer` (in `src/app/actions/gym.ts`) MUST be wrapped in `unstable_cache` from `next/cache`, declaring `tags: ["gym-config"]` and `revalidate: 60`. Its return shape MUST match the previous implementation. The reader MUST NOT use the `"use cache"` directive and MUST invalidate when `updateGymField` calls `revalidateTag("gym-config")`.
(Previously: Used `"use cache"` + `cacheTag("gym-config")`; serialized closure broke `gym.findUnique`.)

#### Scenario: getGymDisplayForServer is wrapped in unstable_cache

- GIVEN `getGymDisplayForServer` is called from a Server Component
- WHEN the function source is inspected
- THEN its body MUST be wrapped in `unstable_cache(...)` from `next/cache`
- AND MUST declare `tags: ["gym-config"]` and `revalidate: 60`
- AND MUST NOT start with `"use cache"`
- AND the response shape MUST match the previous `unstable_cache` implementation

#### Scenario: Display fields reflect new data after update

- GIVEN an admin updates a display field (`nombre`, `direccion`, `mapsEmbedUrl`, `socialInstagram`, `socialWhatsapp`)
- WHEN `updateGymField` calls `revalidateTag("gym-config")`
- THEN the next read of `getGymDisplayForServer` MUST return the updated value

### Requirement: getGymConfigForServer is a cached reader

`getGymConfigForServer` (in `src/app/actions/gym.ts`) MUST be wrapped in `unstable_cache` from `next/cache`, declaring `tags: ["gym-config"]` and `revalidate: 60`. The reader MUST NOT call `cookies()`, `headers()`, or `searchParams` inside the cached body, and MUST NOT use the `"use cache"` directive.
(Previously: `"use cache"` serialized the `prisma` closure and broke `gym.findUnique`.)

#### Scenario: getGymConfigForServer uses unstable_cache

- GIVEN `getGymConfigForServer` is the public reader for the singleton gym record
- WHEN the function source is inspected
- THEN the body MUST be wrapped in `unstable_cache(...)` from `next/cache`
- AND MUST declare `tags: ["gym-config"]` and `revalidate: 60`
- AND MUST NOT use the `"use cache"` directive
- AND MUST NOT access runtime APIs (`cookies`, `headers`, `searchParams`) inside the cached body

#### Scenario: 60-second TTL preserves stale-data window

- GIVEN `getGymConfigForServer` is cached with `revalidate: 60`
- WHEN `updateGymField` calls `revalidateTag("gym-config")`
- THEN subsequent reads within 60s MUST return the new value (tag invalidated the entry)
- AND reads in the same window without a revalidation SHALL also return the new value