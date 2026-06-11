import { AdminStatsCardSkeleton } from "@/components/admin/skeletons/admin-stats-card-skeleton";

/**
 * AdminStatsGridSkeleton — 3 stat tiles in a row, matching the
 * admin dashboard's stats grid (`grid-cols-1 md:grid-cols-3 gap-4`).
 */
export function AdminStatsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <AdminStatsCardSkeleton />
      <AdminStatsCardSkeleton />
      <AdminStatsCardSkeleton />
    </div>
  );
}
