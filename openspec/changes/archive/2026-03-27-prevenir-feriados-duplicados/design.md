# Design: Prevenir Feriados Duplicados

## Technical Approach

Prevent duplicate Feriado records by enforcing a composite unique constraint on `(gymId, fecha)` at the database layer, with date normalization to strip time components. The API layer will catch Prisma's P2002 unique constraint violations and return HTTP 409, while the server actions will perform an early pre-check for better UX. The frontend will differentiate 409 errors to show specific duplicate messages.

## Architecture Decisions

### Decision: Use Database Constraint as Source of Truth

**Choice**: Composite unique constraint `@@unique([gymId, fecha])` with date normalization to YYYY-MM-DD
**Alternatives considered**: Application-level locking, distributed locks, transaction isolation levels
**Rationale**: Database constraints are the authoritative enforcement mechanism. Race conditions are handled atomically by PostgreSQL. Pre-checks in application code are UX optimizations only, not the source of truth.

### Decision: Store Dates as YYYY-MM-DD Strings (Not DateTime with Timezone)

**Choice**: Store as `DateTime` but normalize via `normalizeToDate()` utility that converts to YYYY-MM-DD string before comparison
**Alternatives considered**: Store as native PostgreSQL date type, use date-only strings in schema
**Rationale**: Current schema uses `DateTime`. Changing to `String` would require migration and affect API response shape. Normalizing at the application layer with `split('T')[0]` is simpler and consistent with existing patterns.

### Decision: Add `statusCode` to FormState Interface

**Choice**: Extend `FormState` with optional `statusCode: number` field
**Alternatives considered**: Create separate `ApiFormState` type, use discriminated unions
**Rationalie**: Minimal change that maintains backward compatibility. All existing consumers continue to work since `statusCode` is optional.

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│  FeriadoManager (feriado-manager.tsx)                                │
│  - uses createFeriado server action                                  │
│  - checks result.statusCode === 409 for duplicate toast              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SERVER ACTIONS LAYER                            │
│  createFeriado (feriados.ts)                                         │
│  1. verifyAdmin()                                                    │
│  2. validate with feriadoSchema                                      │
│  3. normalize fecha to YYYY-MM-DD  ──────────────────┐              │
│  4. pre-check: findFirst({gymId, fecha}) ────────────┼──► If exists │
│  5. prisma.feriado.create({data})                   │   return 409 │
│                                                    ▼              │
│                                          ┌──────────────────┐       │
│                                          │ Prisma Client   │       │
│                                          │ (P2002 if dup)  │       │
│                                          └──────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       API ROUTE LAYER                                │
│  POST /api/feriados (route.ts)                                      │
│  - verifyAdmin()                                                     │
│  - validate with feriadoSchema                                      │
│  - prisma.feriado.create({data})                                    │
│  - catch P2002 → return 409                                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER (PostgreSQL)                     │
│  Table: Feriado                                                     │
│  - Constraint: UNIQUE (gymId, fecha)                                │
│  - gymId: String DEFAULT 'gym'                                      │
│  - fecha: DateTime (normalized to midnight UTC)                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Date Normalization Flow

```
Input fecha: "2026-12-25T14:30:00.000Z"
                    │
                    ▼
         normalizeToDate(date)
                    │
                    ▼
         date.toISOString().split('T')[0]
                    │
                    ▼
Output: "2026-12-25" (stored as DateTime with time 00:00:00Z)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add `@@unique([gymId, fecha])` on Feriado model |
| `src/lib/dates.ts` | Create | Add `normalizeToDate()` utility function |
| `src/lib/schemas.ts` | Modify | Add `statusCode?: number` to FormState interface |
| `src/app/actions/feriados.ts` | Modify | Add pre-check duplicate validation + date normalization + statusCode |
| `src/app/api/feriados/route.ts` | Modify | Handle P2002 error → 409 Conflict response |
| `src/components/admin/feriado-manager.tsx` | Modify | Check statusCode === 409 for specific toast message |

## Interfaces / Contracts

### FormState Enhancement (src/lib/schemas.ts)

```typescript
export interface FormState<T = void> {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  message?: string;
  statusCode?: number;  // NEW: HTTP status code for API errors
  code?: string;       // NEW: Error code (e.g., "DUPLICATE")
}
```

### normalizeToDate Utility (src/lib/dates.ts) - NEW FILE

```typescript
/**
 * Normalizes a Date to YYYY-MM-DD format (ISO 8601 date-only).
 * Strips any time component by returning the date portion only.
 * 
 * @param date - Date object or date string to normalize
 * @returns YYYY-MM-DD formatted string
 * 
 * @example
 * normalizeToDate(new Date("2026-12-25T14:30:00.000Z")) // "2026-12-25"
 * normalizeToDate("2026-12-25")                         // "2026-12-25"
 */
export function normalizeToDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
```

### API Error Response Format (409 Conflict)

```typescript
// Response when P2002 unique constraint violation occurs
{
  error: "Ya existe un feriado para esta fecha",
  code: "DUPLICATE"
}
```

### createFeriado Server Action Response (409 Case)

```typescript
// When duplicate detected in pre-check
return {
  success: false,
  message: "Ya existe un feriado para esta fecha",
  statusCode: 409,
  code: "DUPLICATE"
};

// When P2002 thrown by database
return {
  success: false,
  message: "Ya existe un feriado para esta fecha",
  statusCode: 409,
  code: "DUPLICATE"
};
```

## Data Model Changes

### Prisma Schema Modification (prisma/schema.prisma)

```prisma
model Feriado {
  id          String    @id @default(uuid())
  fecha       DateTime
  todo_dia    Boolean   @default(true)
  hora_inicio String?
  hora_fin    String?
  createdAt   DateTime  @default(now())
  gymId       String    @default("gym")
  gym         Gym       @relation(fields: [gymId], references: [id], onDelete: Cascade)

  @@unique([gymId, fecha])  // NEW: Composite unique constraint
  @@index([gymId])
}
```

### Migration Strategy

1. **Pre-migration check**: Before applying migration, run a script to detect duplicates:
   ```sql
   SELECT gymId, fecha, COUNT(*) as cnt 
   FROM Feriado 
   GROUP BY gymId, fecha 
   HAVING COUNT(*) > 1;
   ```

2. **If duplicates exist**: Manual cleanup required before migration can apply

3. **Migration SQL** (conceptual):
   ```sql
   -- Normalize existing dates to midnight
   UPDATE "Feriado" SET "fecha" = DATE_TRUNC('day', "fecha");
   
   -- Add unique constraint
   CREATE UNIQUE INDEX "Feriado_gymId_fecha_idx" ON "Feriado"("gymId", "fecha");
   ```

## API Route Changes

### POST /api/feriados - P2002 Handling (src/app/api/feriados/route.ts)

In the POST handler's catch block, add:

```typescript
} catch (error) {
  console.error("Failed to create feriado:", error);
  
  // Check for Prisma P2002 unique constraint violation
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
    return NextResponse.json(
      { error: "Ya existe un feriado para esta fecha", code: "DUPLICATE" },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { error: "Service temporarily unavailable. Please try again later." },
    { status: 500 }
  );
}
```

## Server Action Changes

### createFeriado with Pre-check (src/app/actions/feriados.ts)

```typescript
import { normalizeToDate } from "@/lib/dates";  // NEW import

export async function createFeriado(
  prevState: FormState,
  formData: FormData
): Promise<FormState<{ id: string }>> {
  // ... auth check unchanged ...

  // Validate form data
  const rawData = Object.fromEntries(formData.entries());
  const parsed = feriadoSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "Error de validación",
    };
  }

  // NEW: Normalize fecha to YYYY-MM-DD
  const normalizedFecha = normalizeToDate(parsed.data.fecha);

  // NEW: Pre-check for duplicate
  const existing = await prisma.feriado.findFirst({
    where: { 
      gymId: parsed.data.gymId ?? "gym",
      fecha: new Date(normalizedFecha)
    },
  });

  if (existing) {
    return {
      success: false,
      message: "Ya existe un feriado para esta fecha",
      statusCode: 409,
      code: "DUPLICATE",
    };
  }

  try {
    const feriado = await prisma.feriado.create({
      data: {
        ...parsed.data,
        fecha: new Date(normalizedFecha),
      },
    });

    revalidatePath("/admin/informacion");

    return {
      success: true,
      data: { id: feriado.id },
      message: "Feriado creado exitosamente",
    };
  } catch (error) {
    console.error("Error creating feriado:", error);
    
    // Check for P2002 from race condition (pre-check passed but create failed)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return {
        success: false,
        message: "Ya existe un feriado para esta fecha",
        statusCode: 409,
        code: "DUPLICATE",
      };
    }
    
    return {
      success: false,
      message: "Error al crear el feriado",
    };
  }
}
```

## Frontend Changes

### FeriadoManager Toast Handling (src/components/admin/feriado-manager.tsx)

In `handleAdd`:

```typescript
const result: FormState<{ id: string }> = await createFeriado({ success: false }, formData);

if (result.success && result.data?.id) {
  // ... existing success handling ...
  toast.success("Feriado agregado exitosamente");
} else if (result.statusCode === 409) {
  // NEW: Specific duplicate error message
  toast.error("Ya existe un feriado para esta fecha");
} else {
  toast.error(result.message || "Error al guardar");
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `normalizeToDate()` edge cases | Test with various date formats, timezones, leap years |
| Unit | FormState type includes new fields | TypeScript compilation check |
| Integration | API returns 409 on P2002 | Mock Prisma to throw P2002, verify response |
| Integration | Pre-check prevents duplicate | Setup test DB with existing Feriado, attempt create |
| E2E | Duplicate toast appears on 409 | Playwright test with duplicate creation |

## Migration / Rollout

### Pre-migration Checklist
1. Check for existing duplicates:
   ```bash
   npx prisma execute-sql "SELECT gymId, fecha, COUNT(*) FROM Feriado GROUP BY gymId, fecha HAVING COUNT(*) > 1"
   ```
2. If duplicates found, manually delete or merge before proceeding

### Migration Steps
1. Create migration: `npx prisma migrate dev --name add_feriado_gymid_fecha_unique`
2. Migration normalizes existing dates and adds constraint
3. Deploy application changes (schema, API, actions, frontend)

### Rollback
1. Database: `npx prisma migrate revert`
2. Code: Revert all 5 modified files to previous commit
3. FormState: `statusCode` becomes unused but harmless (optional field)

## Open Questions

- [ ] Should we also normalize dates on UPDATE operations?
- [ ] Do we need to handle `updateFeriado` with the same pre-check logic?
- [ ] Should the migration script auto-cleanup duplicates (keep earliest, delete rest)?

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration fails if duplicates exist | Medium | Pre-migration check script; manual cleanup before applying |
| Breaking change if other code relies on FormState shape | Low | `statusCode` is optional; backward compatible |
| Timezone handling: user in UTC-3 submits local date | Medium | `normalizeToDate` uses UTC; clarify in UI that date is UTC-based |
| Race condition between pre-check and create | Low | Database constraint is authoritative; P2002 handler covers this case |
