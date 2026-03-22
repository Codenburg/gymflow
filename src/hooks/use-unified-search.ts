"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ActiveFilter } from "@/types/search";

const DEBOUNCE_DELAY = 300;

/**
 * useUnifiedSearch hook - Robust dual state pattern.
 * 
 * ARQUITECTURA:
 * - inputValue: useState para re-renders inmediatos del UI
 * - query/trainerFilters: derivados de searchParams (no son estado local)
 * - prevUrlRef: tracking de última URL escrita para idempotencia
 * - debounceTimeoutRef: cleanup correcto de timeouts
 * 
 * GUARDS:
 * 1. Sync prioriza navegación real sobre debounce
 * 2. Serialización estable de trainers (sort)
 * 3. Idempotencia via prevUrlRef
 * 4. Cleanup双重检查 en unmount y antes de cada operación
 */
export function useUnifiedSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * inputValue: estado LOCAL para respuesta inmediata del UI.
   * Se actualiza en cada keystroke, no espera debounce.
   */
  const [inputValue, setInputValueState] = useState(searchParams.get("search") ?? "");

  // ═══════════════════════════════════════════════════════════════════════════
  // REFS
  // ═══════════════════════════════════════════════════════════════════════════

  const isMountedRef = useRef(true);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUrlRef = useRef(searchParams.toString());
  const inputValueRef = useRef(inputValue);

  // Keep ref in sync
  inputValueRef.current = inputValue;

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVED STATE (no useMemo needed - computed from searchParams directly)
  // ═══════════════════════════════════════════════════════════════════════════

  const query = searchParams.get("search") ?? "";

  const trainerFilters = (() => {
    const trainersParam = searchParams.get("trainers");
    if (trainersParam) {
      return trainersParam
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .sort(); // Orden estable para serialización idempotente
    }

    const creador = searchParams.get("creador");
    if (creador) {
      return [creador];
    }

    return [];
  })();

  const activeFilters: ActiveFilter[] = trainerFilters.map((trainer) => ({
    type: "entrenador" as const,
    value: trainer,
    label: `Entrenador: ${trainer}`,
  }));

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Construye URLSearchParams preservando todos los params existentes,
   * luego aplica search y trainers override.
   */
  const buildParams = useCallback(
    (searchToSet: string, trainersToSet: string[]) => {
      const params = new URLSearchParams(searchParams.toString());

      if (searchToSet.trim()) {
        params.set("search", searchToSet);
      } else {
        params.delete("search");
      }

      if (trainersToSet.length > 0) {
        params.delete("creador");
        // Sort para serialización estable (idempotencia)
        params.set("trainers", [...trainersToSet].sort().join(","));
      } else {
        params.delete("creador");
        params.delete("trainers");
      }

      return params;
    },
    [searchParams]
  );

  /**
   * Ejecuta router.replace si la URL es distinta a la última grabada.
   * Returns true if replaced, false if skipped (idempotent).
   */
  const executeReplace = useCallback(
    (params: URLSearchParams): boolean => {
      const newUrl = params.toString();

      if (newUrl === prevUrlRef.current) {
        return false;
      }

      router.replace(`?${newUrl}`, { scroll: false });
      prevUrlRef.current = newUrl;
      return true;
    },
    [router]
  );

  /**
   * Cancela debounce activo y limpia el ref.
   */
  const cancelDebounce = useCallback(() => {
    if (debounceTimeoutRef.current !== null) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cancelDebounce();
    };
  }, [cancelDebounce]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNC: Navegación externa (back/forward)
  // Detecta navegación comparando prevUrlRef con searchParams actual
  //even if debounce is active, real navigation takes priority
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const currentUrl = searchParams.toString();

    // No hubo navegación real si la URL es igual a la última que escribimos
    if (currentUrl === prevUrlRef.current) {
      return;
    }

    // Hubo navegación real: cancelar debounce y sincronizar
    cancelDebounce();

    const urlSearch = searchParams.get("search") ?? "";
    setInputValueState(urlSearch);
    inputValueRef.current = urlSearch;
    prevUrlRef.current = currentUrl;
  }, [searchParams, cancelDebounce]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SET INPUT VALUE: Actualiza estado local + programa debounce para URL
  // ═══════════════════════════════════════════════════════════════════════════

  const setInputValue = useCallback(
    (value: string) => {
      // Update local state immediately for responsive UI
      setInputValueState(value);
      inputValueRef.current = value;

      // Cancel any pending debounce
      cancelDebounce();

      // Schedule new debounced URL update
      debounceTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;

        const params = buildParams(value, trainerFilters);
        executeReplace(params);
        debounceTimeoutRef.current = null;
      }, DEBOUNCE_DELAY);
    },
    [cancelDebounce, buildParams, trainerFilters, executeReplace]
  );

  // Alias for compatibility
  const setQuery = setInputValue;

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT HANDLERS: Trainer filters (inmediato, no debounce)
  // ═══════════════════════════════════════════════════════════════════════════

  const toggleTrainerFilter = useCallback(
    (name: string) => {
      cancelDebounce();

      const newFilters = trainerFilters.includes(name)
        ? trainerFilters.filter((t) => t !== name)
        : [...trainerFilters, name];

      const params = buildParams(query, newFilters);
      executeReplace(params);
    },
    [trainerFilters, query, buildParams, executeReplace, cancelDebounce]
  );

  const clearTrainerFilters = useCallback(() => {
    cancelDebounce();

    const params = buildParams(query, []);
    executeReplace(params);
  }, [query, buildParams, executeReplace, cancelDebounce]);

  const removeFilter = useCallback(
    (filter: ActiveFilter) => {
      if (filter.type === "entrenador") {
        cancelDebounce();

        const newFilters = trainerFilters.filter((t) => t !== filter.value);
        const params = buildParams(query, newFilters);
        executeReplace(params);
      }
    },
    [trainerFilters, query, buildParams, executeReplace, cancelDebounce]
  );

  const clearFilters = useCallback(() => {
    cancelDebounce();

    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.delete("creador");
    params.delete("trainers");

    setInputValueState("");
    inputValueRef.current = "";
    executeReplace(params);
  }, [searchParams, executeReplace, cancelDebounce]);

  const clearInput = useCallback(() => {
    cancelDebounce();

    setInputValueState("");
    inputValueRef.current = "";

    const params = buildParams("", trainerFilters);
    executeReplace(params);
  }, [trainerFilters, buildParams, executeReplace, cancelDebounce]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    inputValue,
    setInputValue,
    query,
    setQuery,
    clearInput,
    results: null,
    isLoading: false,
    trainerFilters,
    toggleTrainerFilter,
    clearTrainerFilters,
    activeFilters,
    removeFilter,
    clearFilters,
  };
}
