import { Skeleton } from "@/components/ui/skeleton";

/**
 * InformacionSkeleton — placeholder for the public `/informacion` page.
 * Mirrors the structure of the real page:
 *
 *   - back link + title
 *   - Price tile (h2 "Precio" + big price text + subtext)
 *   - 2 Collapsible sections (Promociones, Descuentos) — each renders
 *     a header bar with a title and a chevron placeholder. The bodies
 *     stay collapsed so the skeleton matches the most common initial
 *     visual state of the page.
 *   - Hours section (h2 "Horarios" + 7 day rows)
 *   - Address section (h2 "Dirección" + map placeholder)
 *
 * Built on the `Skeleton` primitive (which renders
 * `bg-muted animate-pulse rounded`) so it satisfies the E2E assertion
 * in `tests/homepage.spec.ts:4.10` for the `.animate-pulse` class
 * appearing during loading.
 */
export function InformacionSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center">
      <main className="w-full max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-7 w-36" />
          <div className="w-9" />
        </div>

        <div className="grid gap-6">
          {/* Price tile */}
          <section className="bg-[var(--button-secondary-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-3">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-32" />
          </section>

          {/* Promociones — collapsible (rendered collapsed) */}
          <CollapsibleSkeleton title="Promociones" />
          {/* Descuentos — collapsible (rendered collapsed) */}
          <CollapsibleSkeleton title="Descuentos" />

          {/* Hours */}
          <section className="bg-[var(--button-secondary-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-3">
            <Skeleton className="h-6 w-24" />
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </section>

          {/* Address */}
          <section className="bg-[var(--button-secondary-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </section>
        </div>
      </main>
    </div>
  );
}

function CollapsibleSkeleton({ title }: { title: string }) {
  // Width approximation matches the real CollapsibleSection's title
  // text width so layout doesn't shift when content resolves.
  const titleWidth = title === "Descuentos" ? "w-28" : "w-32";
  return (
    <div className="bg-[var(--button-secondary-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between w-full p-5">
        <Skeleton className={`h-6 ${titleWidth}`} />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
    </div>
  );
}
