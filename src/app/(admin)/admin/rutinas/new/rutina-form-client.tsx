"use client";

import dynamic from "next/dynamic";

// Dynamic import with ssr:false to prevent hydration mismatch from dnd-kit IDs
const RutinaCompletaForm = dynamic(
  () =>
    import("@/components/admin/rutina-completa-form").then(
      (mod) => mod.RutinaCompletaForm
    ),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-[#121212] rounded-2xl border border-[#e5e7eb] dark:border-[#2a2a2a] p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    ),
  }
);

export default function RutinaFormClient() {
  return <RutinaCompletaForm />;
}
