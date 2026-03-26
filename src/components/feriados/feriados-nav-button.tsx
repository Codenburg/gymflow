"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { useFeriadosNotification } from "@/hooks/use-feriados-notification";

interface FeriadosNavButtonProps {
  className?: string;
}

/**
 * Client component that displays a link to the Feriados page
 * with a notification badge when new feriados exist.
 * 
 * Structure is identical on all breakpoints - no conditional rendering.
 * Badge is positioned absolutely INSIDE the Link which has relative positioning.
 */
export function FeriadosNavButton({ className = "" }: FeriadosNavButtonProps) {
  const { hasNew } = useFeriadosNotification();

  return (
    <Link
      href="/feriados"
      className={`relative inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg transition-all duration-200 text-sm font-medium ${className}`}
    >
      <Calendar className="w-4 h-4" />
      Feriados
      {hasNew && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold shadow-md ring-2 ring-background">
          <span aria-hidden="true">!</span>
          <span className="sr-only">Nuevos feriados</span>
        </span>
      )}
    </Link>
  );
}
