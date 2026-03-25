# Design: Agregar horarios parciales a Feriados

## Technical Approach

Extend the `Feriado` model with three new fields: `todo_dia` (Boolean), `hora_inicio` (Time), and `hora_fin` (Time). The Prisma schema uses PostgreSQL's native `Time` type for time storage. Zod validation enforces cross-field rules. The admin UI conditionally reveals time inputs based on the "Día completo" checkbox state. Public pages display either "Todo el día" or "Abierto de [hora] a [hora]" based on `todo_dia`.

## Architecture Decisions

### Decision: Store times as PostgreSQL Time type

**Choice**: Use `@db.Time` for `hora_inicio` and `hora_fin`
**Alternatives considered**: Store as `String` with manual validation, store as `DateTime`
**Rationale**: `@db.Time` provides native time validation at the database level, appropriate storage for time-only values, and automatic string formatting via Prisma. String storage would require manual validation. DateTime would incorrectly imply a full timestamp.

### Decision: Nullable time fields with conditional NOT NULL

**Choice**: `hora_inicio` and `hora_fin` are nullable, with application-level enforcement that both must be set when `todo_dia=false`
**Alternatives considered**: Make times required with default values, use a CHECK constraint
**Rationale**: Migration safety — nullable columns can be added without breaking existing records. Application-level validation in Zod provides user-friendly error messages. Database CHECK constraints would produce cryptic errors.

### Decision: Time stored as String in Zod schema

**Choice**: Zod schema accepts `hora_inicio` and `hora_fin` as strings (e.g., "08:00"), Prisma handles conversion to `@db.Time`
**Alternatives considered**: Use Zod's `z.time()` parser
**Rationale**: Browser time inputs return string values. Prisma's `@db.Time` type automatically serializes strings in "HH:mm:ss" format. Zod string validation allows custom error messages.

### Decision: Use checkbox for full/partial day toggle

**Choice**: Admin UI has a "Día completo" checkbox; unchecking reveals time inputs
**Alternatives considered**: Always show time inputs with optional fields, use a select dropdown
**Rationale**: Checkbox is the standard UI pattern for binary choices. Hiding irrelevant inputs reduces visual noise. The majority of holidays are full-day, so time inputs should not be visible by default.

## Data Flow

### Create Feriado with Partial Schedule

```
AdminForm 
  → FormData (fecha, todo_dia, hora_inicio?, hora_fin?)
  → createFeriado action
  → Zod validation (feriadoSchema)
  → Prisma.feriado.create()
  → PostgreSQL (todo_dia=false, hora_inicio="08:00", hora_fin="14:00")
  → revalidatePath("/admin/informacion")
```

### Fetch Holidays (Public Page)

```
Page (Server Component)
  → getFeriados()
  → fetch("/api/feriados")
  → Prisma.feriado.findMany()
  → API Response: [{ id, fecha, todo_dia, hora_inicio, hora_fin, createdAt }]
  → Render: "Todo el día" or "Abierto de HH:mm a HH:mm"
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add `todo_dia`, `hora_inicio`, `hora_fin` fields to Feriado model |
| `src/lib/schemas.ts` | Modify | Update `feriadoSchema` with new fields and cross-field validation |
| `src/app/api/feriados/route.ts` | Modify | Add new fields to `FeriadoResponse`, update schema validation |
| `src/app/actions/feriados.ts` | Modify | `createFeriado` passes new fields through FormData |
| `src/components/admin/feriado-manager.tsx` | Modify | Add checkbox + conditional time inputs |
| `src/app/(public)/feriados/page.tsx` | Modify | Display "Todo el día" or time range |
| `src/app/(public)/informacion/page.tsx` | Modify | Update holidays preview to show time ranges |

## Interfaces / Contracts

### FeriadoResponse (API)

```typescript
interface FeriadoResponse {
  id: string;
  fecha: string;         // ISO string
  todo_dia: boolean;
  hora_inicio: string | null;  // "HH:mm:ss" or null
  hora_fin: string | null;     // "HH:mm:ss" or null
  createdAt: string;      // ISO string
}
```

### FeriadoInput (Zod)

```typescript
const feriadoSchema = z.object({
  fecha: z.string().min(1, { message: "La fecha es requerida" })
    .transform((val) => new Date(val)),
  todo_dia: z.boolean().default(true),
  hora_inicio: z.string().optional(),
  hora_fin: z.string().optional(),
})
.refine(
  (data) => {
    if (data.todo_dia === false) {
      return data.hora_inicio && data.hora_fin;
    }
    return true;
  },
  { message: "Hora de inicio y fin son requeridas para horarios parciales" }
)
.refine(
  (data) => {
    if (data.hora_inicio && data.hora_fin) {
      return data.hora_inicio < data.hora_fin;
    }
    return true;
  },
  { message: "La hora de inicio debe ser anterior a la hora de fin" }
);
```

### Feriado (UI - Admin)

```typescript
interface Feriado {
  id: string;
  fecha: Date;
  todo_dia: boolean;
  hora_inicio: string | null;
  hora_fin: string | null;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Zod Schema | Time validation rules | Unit test: valid partial, invalid partial, valid full-day |
| API GET | Response shape with new fields | Integration test: verify all fields present |
| API POST | Partial day creation | Integration test: create with times, verify in DB |
| Admin UI | Checkbox toggles time inputs | Manual verification |
| Public Page | "Todo el día" vs "Abierto de X a Y" | Visual verification |

## Migration / Rollout

1. **Prisma Migration**: Add nullable columns `todo_dia` (default true), `hora_inicio`, `hora_fin`
2. **Existing Records**: All existing records automatically get `todo_dia=true` via default
3. **Application Deploy**: Deploy code changes
4. **No downtime**: Migration is backward-compatible

## Open Questions

- [ ] Should overnight schedules be supported (e.g., "21:00 to 02:00")? Currently not in scope.
- [ ] Should there be a maximum duration for partial holidays? Currently no limit enforced.
