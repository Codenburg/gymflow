"use client";

import { SearchInput } from "./search-input";
import { useUnifiedSearch } from "@/hooks/use-unified-search";

interface SearchBarProps {
  defaultValue?: string;
}

/**
 * SearchBar - Connects search input to URL state.
 * 
 * ARCHITECTURE (Dual State Pattern):
 * - inputValue: LOCAL state for immediate UI response
 * - query: URL state (debounced, applied after typing stops)
 * - setInputValue: updates local state immediately (no debounce on typing)
 * - clearInput: clears both local and URL state immediately
 * - router.replace() is used (not push) to avoid polluting history
 * 
 * Data flow:
 * User types → setInputValue (immediate) → debounce → router.replace() → URL
 */
export function SearchBar({ defaultValue }: SearchBarProps) {
  // inputValue is LOCAL state for immediate UI response
  // query is DERIVED from URL (applied state after debounce)
  const { inputValue, setInputValue, clearInput } = useUnifiedSearch();

  return (
    <div className="w-full">
      <SearchInput
        value={inputValue}
        onChange={setInputValue}
        onClear={clearInput}
        placeholder="Buscar rutinas..."
      />
    </div>
  );
}
