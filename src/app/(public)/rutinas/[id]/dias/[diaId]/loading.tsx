import { DayDetailSkeleton } from "@/components/routines/day-detail-skeleton";

/**
 * Per-route loading UI for `/rutinas/[id]/dias/[diaId]`.
 *
 * Without this file, Next.js falls back to the parent route group's
 * `loading.tsx` (or the root `loading.tsx` rendering `<DumbbellSpinner />`),
 * which is the wrong shape for a day detail page. The
 * `DayDetailSkeleton` already mirrors the page layout
 * (`min-h-screen bg-background` + `container mx-auto px-6 py-8 max-w-4xl`),
 * so clicking a DayCard now transitions into a page-shaped skeleton
 * instead of a centered spinner.
 */
export default function DayDetailLoading() {
  return <DayDetailSkeleton />;
}
