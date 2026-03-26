"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFeriadosNotification } from "@/hooks/use-feriados-notification";

/**
 * Client component that displays a link to the Feriados page
 * with a notification badge when new feriados exist.
 * 
 * Structure is identical on all breakpoints - no conditional rendering.
 * Badge is positioned absolutely INSIDE the Link which has relative positioning.
 */
export function FeriadosNavButton() {
  const { hasNew } = useFeriadosNotification();

  return (
    <Link
      href="/feriados"
      className="relative inline-flex items-center gap-2 px-4 py-2 min-w-[130px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg transition-all duration-200 text-sm font-medium whitespace-nowrap"
    >
      <Calendar className="w-4 h-4" />
      Feriados
      {hasNew && (
        <Badge
          variant="destructive"
          className="absolute top-0 right-0 h-5 min-w-[1.25rem] px-1 flex items-center justify-center -translate-y-1/2 translate-x-1/4"
        >
          <span aria-hidden="true">!</span>
          <span className="sr-only">Nuevos feriados</span>
        </Badge>
      )}
    </Link>
  );
}
