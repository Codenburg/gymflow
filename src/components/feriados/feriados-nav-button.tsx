"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFeriadosNotification } from "@/hooks/use-feriados-notification";

/**
 * Client component that displays a link to the Feriados page
 * with a notification badge when new feriados exist.
 * 
 * Post-hydration only: returns null on server-side render
 * to avoid hydration mismatches.
 */
export function FeriadosNavButton() {
  const { hasNew, isLoading } = useFeriadosNotification();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR/Pre-hydration: no renderizar nada para evitar mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div className="relative inline-block">
      <Link
        href="/feriados"
        className="block px-4 py-2 min-w-[130px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg transition-all duration-200 text-sm font-medium whitespace-nowrap text-center"
      >
        <span className="flex items-center justify-center gap-2">
          <Calendar className="w-4 h-4" />
          Feriados
        </span>
      </Link>
      {!isLoading && hasNew && (
        <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2">
          <Badge
            variant="destructive"
            className="h-5 min-w-[1.25rem] px-1 flex items-center justify-center"
          >
            <span aria-hidden="true">!</span>
            <span className="sr-only">Nuevos feriados</span>
          </Badge>
        </span>
      )}
    </div>
  );
}
