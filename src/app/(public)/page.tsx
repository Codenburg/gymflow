import { Suspense } from "react";
import { SearchSection } from "@/components/search/search-section";
import { RoutineList } from "@/components/routines/routine-list";
import { RoutineListSkeleton } from "@/components/routines/routine-card-skeleton";
import { TrainerSidebarClient } from "@/components/search/trainer-sidebar-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { getFilteredRutinas } from "@/lib/rutinas";

interface SearchParams {
  search?: string;
  trainers?: string;
}

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const search = params?.search;
  const trainers = params?.trainers;

  // Use cached function - avoids repeated DB queries within revalidation period
  // If DB fails, result is null (not cached) so UI shows error state
  let result;
  try {
    result = await getFilteredRutinas(search, trainers);
  } catch {
    result = null;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 sm:px-8 py-8 sm:py-12 max-w-7xl">
        <div className="mb-12">
          {/* Header with title and theme toggle */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 tracking-tight">
                Rutinas Champion Gym
              </h1>
              <p className="text-muted-foreground text-lg">Explora las mejores rutinas de entrenamiento</p>
            </div>
            <ThemeToggle />
          </div>

          {/* Search + Cards Container - all aligned */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Trainer Sidebar - null result means DB error, not empty trainers */}
            <TrainerSidebarClient
              trainers={result?.trainers ?? null}
            />

            {/* Search + Cards */}
            <div className="flex-1">
              {/* Search Section - aligned with cards */}
              <div className="mb-6">
                <SearchSection defaultValue={search ?? ""} />
              </div>

              {/* Cards Grid - streaming with skeleton fallback */}
              <Suspense fallback={<RoutineListSkeleton count={6} />}>
                <RoutineListWrapper result={result} />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

interface RoutineListWrapperProps {
  result: Awaited<ReturnType<typeof getFilteredRutinas>> | null;
}

async function RoutineListWrapper({ result }: RoutineListWrapperProps) {
  return <RoutineList rutinas={result?.rutinas ?? null} />;
}
