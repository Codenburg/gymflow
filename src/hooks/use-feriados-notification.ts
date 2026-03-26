"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "feriados_last_seen_at";
const API_URL = "/api/feriados/latest";

interface UseFeriadosNotificationReturn {
  hasNew: boolean;
  markAsSeen: () => void;
  latestFeriadoDate: string | null;
}

/**
 * Hook that encapsulates notification badge logic for Feriados.
 * 
 * Evaluates on mount: compares latestFeriadoDate (from server) against
 * lastSeen (from localStorage) to determine if badge should show.
 * 
 * Logic:
 * - First visit (no lastSeen): auto-save baseline, hasNew = false
 * - Returning visit: hasNew = latestFeriadoDate > lastSeen
 * - markAsSeen(): persists latestFeriadoDate to localStorage
 * 
 * Re-evaluation triggers:
 * - On mount (initial fetch)
 * - On window focus (user returns to tab)
 */
export function useFeriadosNotification(): UseFeriadosNotificationReturn {
  const [hasNew, setHasNew] = useState(false);
  const [latestFeriadoDate, setLatestFeriadoDate] = useState<string | null>(null);

  function markAsSeen() {
    if (latestFeriadoDate) {
      localStorage.setItem(STORAGE_KEY, latestFeriadoDate);
      setHasNew(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function checkForNew() {
      try {
        const lastSeen = localStorage.getItem(STORAGE_KEY);

        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const latest: string | null = data.latestFeriadoDate;

        if (cancelled) return;

        setLatestFeriadoDate(latest);

        if (!lastSeen && latest) {
          // First visit: auto-save baseline, hasNew = false
          localStorage.setItem(STORAGE_KEY, latest);
          setHasNew(false);
        } else if (!lastSeen && !latest) {
          setHasNew(false);
        } else if (lastSeen && latest) {
          // ISO 8601 strings sort lexicographically = chronologically
          setHasNew(latest > lastSeen);
        } else {
          setHasNew(false);
        }
      } catch {
        if (cancelled) return;
        // FAIL-SAFE: on any error, don't show badge
        setHasNew(false);
      }
    }

    checkForNew();

    function handleFocus() {
      checkForNew();
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return { hasNew, markAsSeen, latestFeriadoDate };
}
