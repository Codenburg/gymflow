"use client";

import { SearchBar } from "@/components/search/search-bar";

export function SearchSection({ defaultValue }: { defaultValue?: string }) {
  return (
    <div className="flex-1 max-w-3xl">
      <SearchBar defaultValue={defaultValue} />
    </div>
  );
}
