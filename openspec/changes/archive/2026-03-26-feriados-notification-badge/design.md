# Design: Feriados Notification Badge

## Technical Approach

Implementar un badge de notificación en el navbar que aparece cuando hay feriados nuevos desde la última visita del usuario. La solución usa un endpoint ligero, un hook encapsulado, y un componente client isolated para evitar hydration mismatches.

## Architecture Decisions

### Decision: Endpoint ligero en lugar de endpoint completo

**Choice**: Crear `GET /api/feriados/latest` que solo retorna `latestFeriadoDate`
**Alternatives considered**: Reusar `/api/feriados` existente y filtrar en el cliente
**Rationale**: Evitar traer toda la lista de feriados (potencialmente grande) solo para comparar un timestamp. El endpoint ligero minimiza transferencia de datos y query time.

### Decision: ISO string comparison directo

**Choice**: `latestFeriadoDate > lastSeen` sin `new Date()` ni parsing
**Alternatives considered**: Comparar timestamps con `Date.getTime()`
**Rationale**: ISO 8601 strings sort lexicographically de forma correcta para timestamps UTC. Evitar parsing innecesario y timezone issues.

### Decision: localStorage para persistencia de lastSeen

**Choice**: `localStorage.setItem('feriados_last_seen_at', latestFeriadoDate)`
**Alternatives considered**: Cookies, sessionStorage, DB con userId
**Rationale**: No requiere autenticación (el badge es para usuarios logged-in o anonymous), no requiere schema changes, y persiste entre sesiones del browser. Simplicidad ante todo.

### Decision: First visit auto-guarda sin mostrar badge

**Choice**: Si no existe `lastSeen`, guardar `latestFeriadoDate` en localStorage y retornar `hasNew = false`
**Alternatives considered**: Mostrar badge en primera visita si hay feriados
**Rationale**: UX consistente - la primera visita del usuario se convierte en su baseline. No hay "nuevos" feriados en la primera visita porque los está viendo todos por primera vez.

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Homepage (Server Component)                                     │
│  └─> <FeriadosNavButton /> (Client Component)                    │
│       │                                                          │
│       └─> useFeriadosNotification()                             │
│            │                                                     │
│            ├─[GET /api/feriados/latest]─────────────────────────┤
│            │  Returns: { latestFeriadoDate: string | null }      │
│            │                                                     │
│            ├─[localStorage.getItem('feriados_last_seen_at')]─────┤
│            │  Returns: string | null                              │
│            │                                                     │
│            └─ Compare: latestFeriadoDate > lastSeen (ISO str)   │
│                 Returns: { hasNew, markAsSeen, latestDate }     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Feriados Page (Server Component)                                │
│  └─> <MarkAsSeenWrapper /> (Client Component)                    │
│       └─> useEffect(() => { markAsSeen() }, [])                  │
│            └─ localStorage.setItem('feriados_last_seen_at',     │
│                                     latestFeriadoDate)           │
└─────────────────────────────────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/api/feriados/latest/route.ts` | **Create** | GET endpoint returning latest Feriado date |
| `src/hooks/use-feriados-notification.ts` | **Create** | Hook encapsulating all notification logic |
| `src/components/feriados/feriados-nav-button.tsx` | **Create** | Client component with badge display |
| `src/components/feriados/mark-as-seen-wrapper.tsx` | **Create** | Client wrapper calling markAsSeen on mount |
| `src/app/(public)/page.tsx` | **Modify** | Import and render `<FeriadosNavButton />` replacing the Link to `/feriados` in mobile nav |
| `src/app/(public)/feriados/page.tsx` | **Modify** | Wrap content with `<MarkAsSeenWrapper />` |

## Interfaces / Contracts

### API Endpoint

```typescript
// GET /api/feriados/latest
// Response 200:
interface LatestFeriadoResponse {
  latestFeriadoDate: string | null; // ISO 8601 format
}
```

### Hook Interface

```typescript
"use client";

interface UseFeriadosNotificationReturn {
  hasNew: boolean;                        // true = mostrar badge
  markAsSeen: () => void;                 // guardar latestFeriadoDate en localStorage
  latestFeriadoDate: string | null;       // fecha más reciente del servidor
  isLoading: boolean;                     // estado de carga del fetch
}

function useFeriadosNotification(): UseFeriadosNotificationReturn;
```

### Component Props

```typescript
// FeriadosNavButton
// No props - es un component isolated

// MarkAsSeenWrapper  
// Props:
interface MarkAsSeenWrapperProps {
  children: React.ReactNode;
}
```

## Detailed Implementation

### 1. API Endpoint: `src/app/api/feriados/latest/route.ts`

```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  try {
    const latest = await prisma.feriado.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    return NextResponse.json({
      latestFeriadoDate: latest?.createdAt.toISOString() ?? null,
    });
  } catch (error) {
    console.error("[GET /api/feriados/latest] Error:", error);
    return NextResponse.json({ latestFeriadoDate: null });
  }
}
```

### 2. Hook: `src/hooks/use-feriados-notification.ts`

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "feriados_last_seen_at";
const API_URL = "/api/feriados/latest";

interface UseFeriadosNotificationReturn {
  hasNew: boolean;
  markAsSeen: () => void;
  latestFeriadoDate: string | null;
  isLoading: boolean;
}

export function useFeriadosNotification(): UseFeriadosNotificationReturn {
  const [hasNew, setHasNew] = useState(false);
  const [latestFeriadoDate, setLatestFeriadoDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const markAsSeen = useCallback(() => {
    if (latestFeriadoDate) {
      localStorage.setItem(STORAGE_KEY, latestFeriadoDate);
    }
  }, [latestFeriadoDate]);

  useEffect(() => {
    let cancelled = false;

    async function checkForNew() {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const latest: string | null = data.latestFeriadoDate;

        if (cancelled) return;

        setLatestFeriadoDate(latest);

        const lastSeen = localStorage.getItem(STORAGE_KEY);

        // First visit: auto-guardar baseline
        if (!lastSeen && latest) {
          localStorage.setItem(STORAGE_KEY, latest);
          setHasNew(false);
        } else if (!lastSeen && !latest) {
          // No hay localStorage y no hay feriados - hasNew = false
          setHasNew(false);
        } else if (lastSeen && latest) {
          // Visita returning: comparar ISO strings
          setHasNew(latest > lastSeen);
        } else {
          // lastSeen existe pero latest es null - no hay cambios
          setHasNew(false);
        }
      } catch {
        if (cancelled) return;
        // FAIL-SAFE: ante cualquier error, no mostrar badge
        setHasNew(false);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    checkForNew();

    return () => {
      cancelled = true;
    };
  }, []);

  return { hasNew, markAsSeen, latestFeriadoDate, isLoading };
}
```

### 3. Component: `src/components/feriados/feriados-nav-button.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFeriadosNotification } from "@/hooks/use-feriados-notification";

export function FeriadosNavButton() {
  const { hasNew, isLoading } = useFeriadosNotification();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR/Pre-hydration: no renderizar nada para evitar mismatch
  if (!mounted) {
    return null;
  }

  return (
    <Link
      href="/feriados"
      className="inline-flex items-center justify-center gap-2 px-4 py-2 min-w-[130px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg transition-all duration-200 text-sm font-medium whitespace-nowrap"
    >
      <Calendar className="w-4 h-4" />
      Feriados
      {!isLoading && hasNew && (
        <Badge
          variant="destructive"
          className="ml-1 h-5 w-5 p-0 flex items-center justify-center"
        >
          <span className="sr-only">Nuevos feriados</span>
        </Badge>
      )}
    </Link>
  );
}
```

### 4. Component: `src/components/feriados/mark-as-seen-wrapper.tsx`

```typescript
"use client";

import { useEffect, useRef } from "react";
import { useFeriadosNotification } from "@/hooks/use-feriados-notification";

interface MarkAsSeenWrapperProps {
  children: React.ReactNode;
}

export function MarkAsSeenWrapper({ children }: MarkAsSeenWrapperProps) {
  const { markAsSeen } = useFeriadosNotification();
  const called = useRef(false);

  useEffect(() => {
    if (!called.current) {
      called.current = true;
      markAsSeen();
    }
  }, [markAsSeen]);

  return <>{children}</>;
}
```

### 5. Homepage Modification

En `src/app/(public)/page.tsx`:

- Importar `FeriadosNavButton` de `@/components/feriados/feriados-nav-button`
- Reemplazar el Link a `/feriados` en el nav móvil con `<FeriadosNavButton />`

### 6. Feriados Page Modification

En `src/app/(public)/feriados/page.tsx`:

- Importar `MarkAsSeenWrapper` de `@/components/feriados/mark-as-seen-wrapper`
- Envolver el contenido principal de `FeriadosWrapper` con `<MarkAsSeenWrapper>`

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Hook logic: ISO comparison, localStorage read/write, fail-safe | Vitest with mock localStorage |
| Unit | markAsSeen does not call localStorage when latestFeriadoDate is null | Vitest |
| Integration | API endpoint returns correct date format | API route tests |
| E2E | Badge appears after creating new Feriado via admin | Playwright |

## Migration / Rollout

No migration required. Los cambios son additive-only:
- Nuevo endpoint
- Nuevos archivos (hook, components)
- Modificaciones backward-compatible en pages existentes

## Open Questions

Ninguna. Todos los technical decisions están resueltos en la proposal y specs.
