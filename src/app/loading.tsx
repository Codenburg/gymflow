import { RoutineListSkeleton } from "@/components/routines/routine-card-skeleton";
import { getGymConfigForServer } from "@/app/actions/gym";
import { resolveGymName } from "@/lib/gym-display";

export default async function Loading() {
  // Resolve gym name via the same DB → env → "Gimnasio" chain used by
  // the root metadata and the public homepage. Wrapped in try/catch so
  // a DB outage falls through to the env/chain default instead of
  // failing the loading skeleton render.
  let gymName: string;
  try {
    const gym = await getGymConfigForServer();
    gymName = resolveGymName(gym?.nombre);
  } catch {
    gymName = resolveGymName(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 sm:px-8 py-8 sm:py-12 max-w-7xl pb-16 lg:pb-0">
        <div className="mb-12">
          {/* Header - identical structure */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex-1 text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground uppercase">
                {gymName}
              </h1>
              <p className="text-xs text-muted-foreground mt-1 lg:hidden">by Codenburg</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
          </div>

          {/* Search + Cards - identical flex structure */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Trainer pills placeholder - matches exact width */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="space-y-2">
                <div className="h-8 w-24 bg-muted rounded animate-pulse" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 w-full bg-muted rounded animate-pulse" />
                ))}
              </div>
            </aside>

            {/* Content area */}
            <div className="flex-1">
              {/* Search placeholder */}
              <div className="mb-6">
                <div className="h-10 w-full bg-muted rounded-lg animate-pulse" />
              </div>

              {/* Cards grid - exact same position as real cards */}
              <RoutineListSkeleton count={6} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
