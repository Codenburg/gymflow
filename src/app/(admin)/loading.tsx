import { Skeleton } from "@/components/ui/skeleton";
import { AdminStatsGridSkeleton } from "@/components/admin/skeletons/admin-stats-grid-skeleton";
import { AdminRutinasTableSkeleton } from "@/components/admin/skeletons/admin-rutinas-table-skeleton";

/**
 * (admin) route group loading — Next.js streams this file while the
 * segment's Server Components (auth check, data reads) are in flight.
 *
 * The skeleton mirrors the (admin)/admin/layout.tsx structure
 * (top bar + sidebar + main content area) so the user sees a
 * familiar "this is loading the admin panel" state instead of a
 * flash of the home skeleton.
 *
 * Per-page `loading.tsx` files (Slice 2/3) will refine the main
 * content area to match the destination page's specific shape.
 */
export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar placeholder — matches AdminSidebar's footprint */}
        <aside
          aria-hidden="true"
          className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-secondary border-r border-border z-30"
        >
          {/* Logo */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>

          {/* Nueva Rutina button */}
          <div className="p-4">
            <Skeleton className="h-9 w-full rounded-md" />
          </div>

          {/* Nav items — 5 pills matching visible nav */}
          <nav className="flex-1 px-2 space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
              >
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </nav>

          {/* User dropdown footer */}
          <div className="mt-auto border-t border-border p-4 flex items-center gap-3">
            <Skeleton className="w-5 h-5 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="w-4 h-4 ml-auto rounded" />
          </div>
        </aside>

        {/* Main content — default placeholder; per-page loading.tsx
            files in Slice 2/3 will refine the shape per page */}
        <div className="ml-64 flex-1 p-6 hidden lg:block">
          <div className="space-y-8">
            <div className="flex items-center gap-4 px-4">
              <Skeleton className="h-7 w-64" />
            </div>
            <AdminStatsGridSkeleton />
            <AdminRutinasTableSkeleton rows={5} />
          </div>
        </div>

        {/* Mobile content — same default placeholder, no sidebar offset */}
        <div className="lg:hidden p-4 pt-16 w-full">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-7 w-48" />
            </div>
            <AdminStatsGridSkeleton />
            <AdminRutinasTableSkeleton rows={5} />
          </div>
        </div>
      </div>
    </div>
  );
}
