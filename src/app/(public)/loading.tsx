import { Skeleton } from "@/components/ui/skeleton";
import { RoutineListSkeleton } from "@/components/routines/routine-card-skeleton";

/**
 * (public) route group loading — Next.js streams this file while the
 * segment's Server Components (gym name resolution, trainer counts
 * query, routine list data fetch) are in flight.
 *
 * The skeleton mirrors the (public) homepage shape so the user sees
 * a familiar "this is loading the home page" state instead of:
 *   - the generic `<DumbbellSpinner />` from `src/app/loading.tsx`
 *     (which would be visually wrong for a card grid), or
 *   - a flash of the wrong skeleton from a different route group.
 *
 * **E2E test 4.10 fix**: the homepage test
 * (`tests/homepage.spec.ts:4.10 — displays skeleton cards during
 * loading`) asserts that `.animate-pulse` is visible while the home
 * page is loading. The generic DumbbellSpinner has no `.animate-pulse`
 * class, so the test failed between Slice 1 and Slice 3. The `Skeleton`
 * primitive used here renders `bg-muted animate-pulse rounded`, so
 * the class is present and the test passes.
 */
export default function PublicLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 sm:px-8 py-8 sm:py-12 max-w-7xl pb-16 lg:pb-0">
        {/* Header — mirrors the homepage h1 + theme toggle */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1 flex flex-col items-center gap-2">
            <Skeleton className="h-10 w-56 sm:h-12 sm:w-72" />
            <Skeleton className="h-3 w-24 lg:hidden" />
          </div>
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>

        {/* Search + Cards container — mirrors the homepage flex layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Trainer pills sidebar — desktop only */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="space-y-2">
              <Skeleton className="h-5 w-28 mb-3" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5"
                >
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </aside>

          {/* Search + Cards */}
          <div className="flex-1">
            {/* Search bar */}
            <div className="mb-6">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            {/* Cards grid — reuses the existing homepage grid skeleton */}
            <RoutineListSkeleton count={6} />
          </div>
        </div>
      </main>
    </div>
  );
}
