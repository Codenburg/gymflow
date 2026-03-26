"use client";

import Link from "next/link";
import { Info } from "lucide-react";

interface InfoButtonProps {
  className?: string;
}

export function InfoButton({ className = "" }: InfoButtonProps) {
  return (
    <Link
      href="/informacion"
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg transition-all duration-200 text-sm font-medium ${className}`}
    >
      <Info className="w-4 h-4" />
      Información
    </Link>
  );
}
