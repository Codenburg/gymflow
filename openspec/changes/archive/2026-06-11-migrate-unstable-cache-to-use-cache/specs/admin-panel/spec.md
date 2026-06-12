# Delta for Admin Panel

## MODIFIED Requirements

### Requirement: Per-Page Admin Loading States

Each admin page (rutinas list, rutinas/new, rutinas/[id], rutinas/[id]/dias/[diaId], promociones, descuentos-duracion, feriados, trainers, config, dashboard) MUST have a co-located `loading.tsx` file that renders a page-shaped skeleton matching the destination page's layout. The loading files MUST use the `<Skeleton>` UI primitive.

After the v0.19.0 cache migration, the cached reader portion of each admin page's data is served from `use cache` and invalidated by `revalidateTag` calls in the action files. The `loading.tsx` skeleton is shown for the in-flight read on the first visit; subsequent visits within the TTL are served from cache and the skeleton is NOT shown.
(Previously: All 6 admin pages declared `export const dynamic = 'force-dynamic'`, which defeated the cache.)

#### Scenario: Each admin page shows a page-shaped loading state

- GIVEN the user navigates to any admin page listed above
- WHEN the page's data is in flight
- THEN the co-located `loading.tsx` MUST render a skeleton matching the page's eventual shape
- AND the user MUST NOT see a wrong-shaped skeleton (e.g. homepage cards on an admin page)

#### Scenario: Cached reader skips skeleton on warm visits

- GIVEN an admin page's cached reader is populated (TTL not yet expired)
- AND no `revalidateTag` has been called for the relevant tag
- WHEN the user revisits the page
- THEN the cached reader returns immediately AND the `loading.tsx` skeleton is NOT displayed

## ADDED Requirements

### Requirement: Admin pages are no longer force-dynamic

The 6 admin pages that previously declared `export const dynamic = 'force-dynamic'` MUST NOT carry that directive after the v0.19.0 cache migration:

- `src/app/(admin)/admin/page.tsx` (dashboard)
- `src/app/(admin)/admin/rutinas/page.tsx`
- `src/app/(admin)/admin/rutinas/[id]/page.tsx`
- `src/app/(admin)/admin/rutinas/[id]/dias/[diaId]/page.tsx`
- `src/app/(admin)/admin/feriados/page.tsx`
- `src/app/(admin)/admin/config/page.tsx`

After the removal, each page is dynamic ONLY when its runtime requires it (e.g. the auth check in the admin layout calls `cookies()`). The cached reader portion of each page's data is now served from `use cache` for the relevant TTL.

#### Scenario: force-dynamic is removed from all 6 admin pages

- GIVEN the 6 admin pages listed above
- WHEN the source is inspected
- THEN NONE of them MUST contain `export const dynamic = 'force-dynamic'`
- AND `pnpm build` MUST NOT show these pages as forced-dynamic

#### Scenario: Pages remain dynamic for auth / runtime-API reasons

- GIVEN an admin page calls `cookies()` for the auth check (or no `use cache` directive is present)
- WHEN the page is requested
- THEN the page MUST be rendered dynamically — `cacheComponents: true` requires this for any runtime API call

### Requirement: Cache invalidation on admin mutations

Every admin mutation flow MUST keep the admin UI consistent with the database. The mechanism is: the mutation action calls `revalidateTag` for the relevant cache tag (see `Server Action Cache Invalidation Contract` in `api/spec.md`).

#### Scenario: Admin creates a rutina and sees it in the list

- GIVEN an admin is on `/admin/rutinas` and the cached `getRutinas` reader is warm
- WHEN the admin submits the create form and `createRutina` calls `revalidateTag("rutinas")`
- THEN the new rutina MUST appear in the list on the next read (cache was invalidated)

#### Scenario: Admin deletes a feriado and the public list drops it

- GIVEN an admin is on `/admin/feriados`
- WHEN the admin deletes a feriado and `deleteFeriado` calls `revalidateTag("feriados")`
- THEN the public `/feriados` page MUST NOT list the deleted feriado on its next read
- AND the home-page "latest feriado" badge MUST update within 30 seconds of the deletion

#### Scenario: Stat counts on the dashboard reflect recent mutations

- GIVEN an admin is on `/admin` and the dashboard reads `getStats`
- WHEN any rutina / dia / ejercicio mutation completes and calls `revalidateTag("rutinas")`
- THEN the next dashboard render MUST show the updated stat counts
