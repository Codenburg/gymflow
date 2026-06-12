# Delta for Homepage

## MODIFIED Requirements

### Requirement: Homepage Server Component

The homepage (`app/page.tsx`) SHALL be implemented as a Next.js Server Component that fetches and displays routines. The data reads for the routine grid (`getRoutinesPaginated`) and the trainer-pills consumer (`getTrainerCounts`) MUST be served from `use cache` readers declared in `src/services/routines/pagination.ts`. Each reader MUST declare `cacheTag("rutinas")` and `cacheLife({ revalidate: 30 })` (30-second TTL). The readers MUST accept the `searchParams` object as a function argument — NOT call `searchParams` inside the `use cache` body.

The component MUST use React 19's `use()` hook to consume promises directly.
(Previously: The pagination readers used the legacy `unstable_cache` API. `getTrainerCounts` and `getRoutinesPaginated` shared the same `RUTINAS_CACHE_TAG` and 30-second TTL — only the API surface changed.)

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
- AND the `searchParams` value SHALL be passed as a function argument (NOT read from inside the `use cache` body)
- AND the response SHALL be served from cache when the same `searchParams` shape was requested within the 30-second TTL

#### Scenario: getRoutinesPaginated uses use cache

- GIVEN `getRoutinesPaginated` lives in `src/services/routines/pagination.ts`
- WHEN the function source is inspected
- THEN the body MUST start with `"use cache"`
- AND MUST call `cacheTag("rutinas")` and `cacheLife({ revalidate: 30 })`
- AND MUST NOT use `unstable_cache`

#### Scenario: getTrainerCounts uses use cache

- GIVEN `getTrainerCounts` lives in `src/services/routines/pagination.ts`
- WHEN the function source is inspected
- THEN the body MUST start with `"use cache"`
- AND MUST call `cacheTag("rutinas")` and `cacheLife({ revalidate: 30 })`
- AND MUST NOT use `unstable_cache`

#### Scenario: searchParams is an argument, not a runtime API call

- GIVEN both pagination readers take `searchParams` (or a derived params object) as input
- WHEN the function body is inspected
- THEN it MUST accept the params via the function signature
- AND MUST NOT call `await searchParams` / `(await ...).searchParams` inside the `use cache` body (this would be a `use cache` violation and would fail at build time)

#### Scenario: Trainer pills reflect URL state

- GIVEN the home page `/` has trainer filter params in the URL
- WHEN the page loads on desktop
- THEN the trainer pills SHALL show the correct selected state matching the URL params
- AND the pills SHALL be served by the cached `getTrainerCounts` reader
