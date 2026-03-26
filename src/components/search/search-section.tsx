"use client";

import { SearchBar } from "@/components/search/search-bar";
import { InfoButton } from "@/components/info-button";
import { FeriadosNavButton } from "@/components/feriados/feriados-nav-button";

export function SearchSection({ defaultValue }: { defaultValue?: string }) {
  return (
    <>
      {/* Mobile layout: stacked search + buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:hidden">
        <SearchBar defaultValue={defaultValue} className="w-full sm:flex-1 sm:max-w-md" />
        <div className="flex items-center gap-2">
          <InfoButton className="flex-1 sm:flex-none sm:min-w-[130px]" />
          <FeriadosNavButton className="flex-1 sm:flex-none sm:min-w-[130px]" />
        </div>
      </div>

      {/* Desktop layout (md+): search expands, buttons grouped right */}
      <div className="hidden md:flex items-center gap-3">
        <div className="flex-1">
          <SearchBar defaultValue={defaultValue} className="w-full" />
        </div>
        <div className="flex items-center gap-2">
          <InfoButton />
          <FeriadosNavButton />
        </div>
      </div>
    </>
  );
}
