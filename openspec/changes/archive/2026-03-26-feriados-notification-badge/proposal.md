# Proposal: Feriados Notification Badge

## Intent

Implementar un badge de notificación en el navbar que alerte al usuario cuando hay un nuevo feriado creado desde su última visita. El badge aparece en el botón de "Feriados" en el homepage para indicar que hay contenido nuevo que el usuario no ha visto.

## Scope

### In Scope
- Crear `GET /api/feriados/latest` - endpoint ligero que retorna `{ latestFeriadoDate: string | null }`
- Crear hook `useFeriadosNotification` con toda la lógica de comparación y localStorage
- Crear componente `FeriadosNavButton` como client component isolated
- Integrar `FeriadosNavButton` en `page.tsx` (homepage)
- Implementar `markAsSeen()` en la página de feriados
- Persistir `feriados_last_seen_at` en localStorage

### Out of Scope
- No modificar el schema de Prisma
- No crear tablas ni migraciones
- No implementar notificaciones push
- No mostrar count de nuevos feriados (solo badge sí/no)

## Approach

### Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  Homepage (Server Component)                                 │
│  └─> <FeriadosNavButton /> (Client Component)               │
│       └─> useFeriadosNotification()                          │
│            ├─ GET /api/feriados/latest                     │
│            ├─ localStorage: feriados_last_seen_at           │
│            └─ returns: { hasNew, markAsSeen, latestDate }  │
└─────────────────────────────────────────────────────────────┘
```

### Detalle de Implementación

#### 1. API Endpoint: `GET /api/feriados/latest`

```typescript
// Returns: { latestFeriadoDate: string | null }
// string = ISO date del Feriado más recientemente creado (createdAt)
// null = no hay feriados en el sistema
```

**Rationale**: Endpoint ligero que evita traer toda la lista de feriados solo para comparar fechas.

#### 2. Hook: `useFeriadosNotification`

```typescript
"use client";

interface UseFeriadosNotificationReturn {
  hasNew: boolean;           // true = mostrar badge
  markAsSeen: () => void;   // guardar latestFeriadoDate en localStorage
  latestFeriadoDate: string | null;
}

//内部逻辑 (Internal Logic):
// 1. On mount: fetch /api/feriados/latest
// 2. Get lastSeen from localStorage
// 3. If no lastSeen AND latestFeriadoDate exists:
//    - Auto-save latestFeriadoDate to localStorage
//    - Set hasNew = false (FIRST VISIT NEVER SHOWS BADGE)
// 4. If latestFeriadoDate is null: hasNew = false
// 5. If both exist: hasNew = latestFeriadoDate > lastSeen (ISO string comparison)
// 6. On error: hasNew = false (FAIL-SAFE)
```

#### 3. First Visit Logic (CRITICAL)

| Condition | Action | Result |
|-----------|--------|--------|
| No `lastSeen` + `latestFeriadoDate` exists | Auto-save `latestFeriadoDate` to localStorage | `hasNew = false` |
| No `lastSeen` + `latestFeriadoDate` is null | No localStorage write | `hasNew = false` |
| `lastSeen` + `latestFeriadoDate` exists | Compare: `latest > lastSeen` | `hasNew = boolean` |
| Any error | Fail-safe | `hasNew = false` |

**Rationale**: First-time visitors NEVER see the badge. Their first "visit" becomes their baseline.

#### 4. String Comparison

```typescript
// ISO strings sort lexicographically correctly
// "2026-12-25T00:00:00.000Z" > "2026-01-01T00:00:00.000Z" ✓
hasNew = latestFeriadoDate > lastSeen;
```

No se necesita `new Date()` ni parsing.直接 comparación de strings.

#### 5. markAsSeen() Behavior

```typescript
const markAsSeen = () => {
  if (latestFeriadoDate) {
    localStorage.setItem('feriados_last_seen_at', latestFeriadoDate);
  }
};
```

**CRITICAL**: Se persiste el valor del servidor (`latestFeriadoDate`), NO `Date.now()`. Esto asegura consistencia entre comparar tiempos del servidor.

#### 6. Post-Hydration Only

```typescript
"use client";

export function FeriadosNavButton() {
  const [hasNew, setHasNew] = useState(false); // Initial state = false (SSR safe)
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    // All logic here
  }, []);
  
  if (!mounted) return null; // or placeholder
  
  return <Link ...>{hasNew && <Badge />}</Link>;
}
```

Evita hydration mismatch y flash de estado incorrecto.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/feriados/latest/route.ts` | **New** | Lightweight endpoint returning latest Feriado date |
| `src/hooks/use-feriados-notification.ts` | **New** | Hook con toda la lógica de notificación |
| `src/components/feriados-nav-button.tsx` | **New** | Client component con el Link y Badge |
| `src/app/(public)/page.tsx` | Modified | Importa y usa `<FeriadosNavButton />` |
| `src/app/(public)/feriados/page.tsx` | Modified | Llama `markAsSeen()` al montar |

## Fail-Safe Behavior

En TODOS los casos de error, `hasNew = false`:

```typescript
try {
  // fetch logic
} catch {
  setHasNew(false); // FAIL-SAFE: nunca mostrar badge si no podemos determinar estado
}
```

Casos de error cubiertos:
- Fetch fallido a `/api/feriados/latest`
- localStorage no disponible
- Parse error de datos
- redisma query falla

## Rollback Plan

1. **Eliminar archivos creados**:
   - `src/app/api/feriados/latest/route.ts`
   - `src/hooks/use-feriados-notification.ts`
   - `src/components/feriados-nav-button.tsx`

2. **Revertir modificaciones**:
   - `src/app/(public)/page.tsx` - remover `<FeriadosNavButton />`
   - `src/app/(public)/feriados/page.tsx` - remover `markAsSeen()`

3. **Limpiar localStorage** (opcional):
   - `feriados_last_seen_at` puede quedar como orphan pero no causa problemas

## Dependencies

- Prisma schema con modelo `Feriado` existente ✓
- API `/api/feriados` existente ✓
- localStorage API disponible en browser ✓

## Success Criteria

- [ ] El badge NO aparece en la primera visita del usuario
- [ ] El badge aparece cuando se crea un novo Feriado después de la primera visita
- [ ] El badge desaparece después de visitar `/feriados`
- [ ] No hay hydration warnings en el homepage
- [ ] No hay errores en consola cuando la red falla (fail-safe)
- [ ] El badge usa comparison de strings ISO (no Date parsing)
- [ ] `markAsSeen()` persiste `latestFeriadoDate` (no `Date.now()`)

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── feriados/
│   │       ├── latest/
│   │       │   └── route.ts          # NEW: GET /api/feriados/latest
│   │       └── route.ts              # Existing
│   └── (public)/
│       ├── page.tsx                  # MODIFIED: +FeriadosNavButton
│       └── feriados/
│           └── page.tsx              # MODIFIED: +markAsSeen
├── components/
│   └── feriados-nav-button.tsx       # NEW: Client component
└── hooks/
    └── use-feriados-notification.ts  # NEW: Hook
```
