"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void; // Optional separate clear handler
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Buscar rutinas...",
}: SearchInputProps) {
  const handleClear = () => {
    if (onClear) {
      // Use dedicated clear handler (updates URL + local state)
      onClear();
    } else {
      // Fallback: just update the value
      onChange("");
    }
  };

  return (
    <div className="relative w-full">
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-10 w-full bg-background border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20 [&::-webkit-search-cancel-button]:hidden [&::-ms-clear]:hidden"
        aria-label="Buscar rutinas"
      />
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search className="w-5 h-5 text-muted-foreground" />
      </div>
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 hover:text-foreground transition-colors"
          aria-label="Limpiar búsqueda"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
