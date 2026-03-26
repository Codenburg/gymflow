"use client";

import { SearchBar } from "@/components/search/search-bar";
import { InfoButton } from "@/components/info-button";
import { FeriadosNavButton } from "@/components/feriados/feriados-nav-button";

export function SearchSection({ defaultValue }: { defaultValue?: string }) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      {/* Search - full width on mobile, auto on desktop */}
      <SearchBar defaultValue={defaultValue} className="w-full sm:w-auto sm:flex-1 sm:max-w-md" />

      {/* Secondary actions - stacked on mobile, inline on desktop */}
      <div className="flex items-center gap-2">
        <InfoButton className="flex-1 sm:flex-none sm:min-w-[130px]" />
        <FeriadosNavButton className="flex-1 sm:flex-none sm:min-w-[130px]" />
      </div>
    </div>
  );
}
