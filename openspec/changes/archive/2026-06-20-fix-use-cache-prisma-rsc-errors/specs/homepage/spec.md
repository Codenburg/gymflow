# Delta for homepage

## Purpose

Revert cached routine readers on the homepage from Next.js 16 `"use cache"` to `unstable_cache` because the `"use cache"` directive serializes the captured closure, and the `prisma` singleton (a `PrismaClient` wrapping `pg.Pool`) is not JSON-serializable. Cross-request cache behavior, tags, and TTLs are preserved.

## MODIFIED Requirements

### Requirement: Homepage Server Component

The homepage (`app/page.tsx`) SHALL be implemented as a Next.js Server Component that fetches and displays routines. The data reads for the routine grid (`getRoutinesPaginated`) and the trainer-pills consumer (`getTrainerCounts`) MUST be served from cached readers declared in `src/services/routines/pagination.ts`. Each reader MUST be implemented with `unstable_cache` from `next/cache`, MUST declare the key-parts of its cache scope (e.g. `tags: ["rutinas"]`, `revalidate: 30` for a 30-second TTL), and MUST accept the `searchParams` object as a function argument — NOT call `searchParams` inside the cached body.

The component MUST use React 19's `use()` hook to consume promises directly. The readers MUST NOT use the `"use cache"` directive, MUST NOT use `use cache: private`, and MUST NOT import the singleton `prisma` instance inside a `"use cache"` body.
(Previously: Readers used the Next.js 16 `"use cache"` directive with `cacheTag("rutinas")` and `cacheLife({ revalidate: 30 })`. That API serializes the captured closure, and `prisma` (a `PrismaClient` wrapping `pg.Pool`) is not serializable, producing `PrismaClientKnownRequestError` at request time.)

#### Scenario: Homepage loads with all routines

- GIVEN the database contains routine records
- WHEN the user navigates to the homepage (/)
- THEN the page SHALL fetch all routines through the cached `getRoutinesPaginated` reader
- AND display them using the RoutineList component
- AND the SearchBar SHALL be visible at the top of the page

#### Scenario: Homepage loads with search results

- GIVEN the user previously searched for "Legs"
- WHEN the user reloads the page or navigates to /?search=Legs
- THEN the page SHALL fetch routines filtered by "Legs" via `getRoutinesPaginated({ search: "Legs", ... })`
- AND the `searchParams` value SHALL be passed as a function argument (NOT read from inside the cached body)
- AND the response SHALL be served from cache when the same `searchParams` shape was requested within the 30-second TTL

#### Scenario: getRoutinesPaginated uses unstable_cache

- GIVEN `getRoutinesPaginated` lives in `src/services/routines/pagination.ts`
- WHEN the function source is inspected
- THEN the body MUST be wrapped in `unstable_cache(...)` from `next/cache`
- AND MUST declare `tags: ["rutinas"]` and `revalidate: 30`
- AND MUST NOT start with the `"use cache"` directive
- AND MUST NOT import or call the singleton `prisma` instance inside a `"use cache"` closure

#### Scenario: getTrainerCounts uses unstable_cache

- GIVEN `getTrainerCounts` lives in `src/services/routines/pagination.ts`
- WHEN the function source is inspected
- THEN the body MUST be wrapped in `unstable_cache(...)`
- AND MUST declare `tags: ["rutinas"]` and `revalidate: 30`
- AND MUST NOT start with the `"use cache"` directive

#### Scenario: searchParams is an argument, not a runtime API call

- GIVEN both pagination readers take `searchParams` (or a derived params object) as input
- WHEN the function body is inspected
- THEN it MUST accept the params via the function signature
- AND MUST NOT call `await searchParams` / `(await ...).searchParams` inside the cached body

#### Scenario: Homepage renders without Prisma serialization errors

- GIVEN the homepage Server Component renders
- WHEN Next.js executes the cached readers
- THEN the browser console SHALL NOT contain `PrismaClientKnownRequestError`
- AND the request SHALL return a 200 status with the routine list HTML