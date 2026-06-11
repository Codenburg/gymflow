import { DumbbellSpinner } from "@/components/ui/dumbbell-spinner";

/**
 * Root loading fallback.
 *
 * Used by Next.js as the LAST-RESORT loading UI for any route that
 * does NOT have a co-located `loading.tsx` (route groups
 * `(public)/loading.tsx` and `(admin)/loading.tsx` override this
 * for their segments). The dumbbell spinner is the generic,
 * page-agnostic fallback.
 */
export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <DumbbellSpinner size={80} />
    </div>
  );
}
