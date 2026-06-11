import { Skeleton } from "@/components/ui/skeleton";

/**
 * AdminStatsCardSkeleton — placeholder for a single stat tile in the
 * admin dashboard's stats row. Mirrors the visual structure of the
 * real AdminCard variant: icon block on the left, label + big number
 * stacked on the right.
 */
export function AdminStatsCardSkeleton() {
  return (
    <div className="bg-secondary border border-border rounded-xl p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      </div>
    </div>
  );
}
