import { Suspense } from "react";
import { SearchSection } from "@/components/search/search-section";
import { RoutineList } from "@/components/routines/routine-list";
import { RoutineListSkeleton } from "@/components/routines/routine-card-skeleton";
import { TrainerPillsClient } from "@/components/search/trainer-pills-client";
import { BottomBar } from "@/components/layout/bottom-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { getRoutinesPaginated, PAGE_SIZE, TrainerCount } from "@/services/routines/pagination";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";

interface SearchParams {
  page?: string;
  search?: string;
  trainers?: string;
}

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  // Normalize inputs in page component (per design decision)
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search || "";
  const trainers = params.trainers
    ? String(params.trainers).split(",").filter(Boolean)
    : [];

  // Call pagination service
  const { data, total, trainerCounts, error } = await getRoutinesPaginated({
    page,
    pageSize: PAGE_SIZE,
    search,
    trainers,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Transform trainerCounts to UI format
  const trainersForUI = trainerCounts.map((t: TrainerCount) => ({
    nombre: t.nombre,
    count: t.count,
  }));

  // Strict state rendering - NO mixing
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 sm:px-8 py-8 sm:py-12 max-w-7xl pb-16 lg:pb-0">
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <div className="flex-1 text-center">
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground uppercase">
                  Champion Gym
                </h1>
                <p className="text-xs text-muted-foreground mt-1 lg:hidden">by Codenburg</p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </main>
        <BottomBar />
        <ErrorState message={error} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 sm:px-8 py-8 sm:py-12 max-w-7xl pb-16 lg:pb-0">
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <div className="flex-1 text-center">
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground uppercase">
                  Champion Gym
                </h1>
                <p className="text-xs text-muted-foreground mt-1 lg:hidden">by Codenburg</p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </main>
        <BottomBar />
        <EmptyState />
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 sm:px-8 py-8 sm:py-12 max-w-7xl pb-16 lg:pb-0">
        <div className="mb-12">
          {/* Header with title and theme toggle */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex-1 text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground uppercase">
                Champion Gym
              </h1>
              <p className="text-xs text-muted-foreground mt-1 lg:hidden">by Codenburg</p>
            </div>
            <ThemeToggle />
          </div>

          {/* Search + Cards Container - mobile-first flex layout */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Trainer Pills - desktop only */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <TrainerPillsClient trainers={trainersForUI} />
            </aside>

            {/* Search + Cards */}
            <div className="flex-1">
              {/* Search Section - aligned with cards */}
              <div className="mb-6">
                <SearchSection
                  defaultValue={search}
                  trainers={trainersForUI}
                />
              </div>

              {/* Cards Grid - streaming with skeleton fallback */}
              <div>
                <Suspense fallback={<RoutineListSkeleton count={6} />}>
                  <RoutineListWrapper
                    routines={data}
                    currentPage={page}
                    totalPages={totalPages}
                    search={search}
                    trainers={trainers}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile bottom bar */}
      <BottomBar />
    </div>
  );
}

interface RoutineListWrapperProps {
  routines: Array<{
    id: string;
    nombre: string;
    tipo: string;
    descripcion: string | null;
    creadorId: string;
    diasCount: number;
    createdAt: Date;
    updatedAt: Date;
    creadorUser: {
      id: string;
      name: string;
    };
  }>;
  currentPage: number;
  totalPages: number;
  search: string;
  trainers: string[];
}

async function RoutineListWrapper({
  routines,
  currentPage,
  totalPages,
  search,
  trainers,
}: RoutineListWrapperProps) {
  return (
    <>
      <RoutineList rutinas={routines} />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        search={search}
        trainers={trainers}
      />
    </>
  );
}
