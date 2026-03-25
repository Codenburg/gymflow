# Proposal: Agregar horarios parciales a Feriados

## Intent

Currently, the `Feriado` (holiday) model only stores a `fecha` (date), treating all holidays as full-day closures. Some holidays (e.g., Christmas Eve, New Year's Eve) may only close the gym partially (e.g., closing early at 14:00). This change allows specifying partial-day schedules for holidays while maintaining backward compatibility with existing full-day holidays.

**User Value**: Gym administrators can accurately represent holidays that have partial schedules rather than forcing a binary "open/closed" choice.

## Scope

### In Scope
- Add three new fields to the `Feriado` model: `todo_dia`, `hora_inicio`, `hora_fin`
- Update Zod validation schema with cross-field validation rules
- Update REST API (`/api/feriados`) to handle new fields
- Update server actions for CRUD operations
- Update admin UI (`feriado-manager.tsx`) with checkbox + time inputs
- Update public UI (`/feriados/page.tsx` and `/informacion/page.tsx`) to display partial schedules
- Database migration with backward compatibility for existing holidays

### Out of Scope
- Recurring holidays (e.g., "every third Monday of March")
- Holiday exceptions for specific years
- Notifications or reminders for upcoming partial holidays
- Integration with calendar exports

## Approach

### Data Model Change

Extend the `Feriado` model in `prisma/schema.prisma`:

```prisma
model Feriado {
  id         String    @id @default(uuid())
  fecha      DateTime
  todo_dia   Boolean   @default(true)  // NEW: true = full day, false = partial
  hora_inicio String?  @db.Time        // NEW: nullable, required when todo_dia=false
  hora_fin   String?   @db.Time        // NEW: nullable, required when todo_dia=false
  createdAt  DateTime  @default(now())
  gymId      String    @default("gym")
  gym        Gym       @relation(fields: [gymId], references: [id], onDelete: Cascade)

  @@index([gymId])
}
```

Note: PostgreSQL `Time` type stores time without date (e.g., "14:30:00").

### Validation Rules (Zod)

```typescript
// Base shape
const horarioParcialSchema = z.object({
  fecha: z.string().min(1, { error: "La fecha es requerida" })
    .transform((val) => new Date(val)),
  todo_dia: z.boolean().default(true),
  hora_inicio: z.string().optional(), // Required when todo_dia=false
  hora_fin: z.string().optional(),    // Required when todo_dia=false
}).refine(
  (data) => {
    // If todo_dia=false, hora_inicio and hora_fin are required
    if (data.todo_dia === false) {
      return data.hora_inicio && data.hora_fin;
    }
    return true;
  },
  { message: "Hora de inicio y fin son requeridas para horarios parciales" }
).refine(
  (data) => {
    // If both provided, hora_inicio must be before hora_fin
    if (data.hora_inicio && data.hora_fin) {
      return data.hora_inicio < data.hora_fin;
    }
    return true;
  },
  { message: "La hora de inicio debe ser anterior a la hora de fin" }
);
```

### Migration Strategy

1. Add new columns as nullable (`todo_dia`, `hora_inicio`, `hora_fin`)
2. Set `todo_dia = true` for all existing records (backward compatible)
3. Apply NOT NULL constraint on `todo_dia` after migration
4. Add CHECK constraint: `hora_inicio IS NOT NULL AND hora_fin IS NOT NULL WHERE todo_dia = false`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add `todo_dia`, `hora_inicio`, `hora_fin` fields to Feriado |
| `src/lib/schemas.ts` | Modified | Update `feriadoSchema` with new fields and cross-field validation |
| `src/app/api/feriados/route.ts` | Modified | Handle new fields in GET/POST/DELETE |
| `src/app/actions/feriados.ts` | Modified | Update `createFeriado` with new fields |
| `src/components/admin/feriado-manager.tsx` | Modified | Add checkbox + conditional time inputs |
| `src/app/(public)/feriados/page.tsx` | Modified | Display "Todo el día" or time range |
| `src/app/(public)/informacion/page.tsx` | Modified | Update holidays preview section |

## UI Behavior

### Admin UI (`feriado-manager.tsx`)
- Add checkbox "Día completo" (checked by default)
- When unchecked: reveal two time inputs (hora_inicio, hora_fin)
- When checked: time inputs are hidden and set to null

### Public UI
**Full-day holiday:**
```
25 de Diciembre de 2026 — Todo el día
```

**Partial holiday:**
```
24 de Diciembre de 2026 — Abierto de 08:00 a 14:00
```

## API Response Changes

### GET /api/feriados (unchanged shape, new fields)
```json
[
  {
    "id": "uuid",
    "fecha": "2026-12-25T00:00:00.000Z",
    "todo_dia": true,
    "hora_inicio": null,
    "hora_fin": null,
    "createdAt": "2026-03-25T..."
  }
]
```

### POST /api/feriados (new fields accepted)
```json
// Request body
{
  "fecha": "2026-12-24",
  "todo_dia": false,
  "hora_inicio": "08:00",
  "hora_fin": "14:00"
}
```

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Existing holidays display incorrectly during migration | Low | Medium | All existing records get `todo_dia=true`, no data loss |
| Time validation edge cases (midnight crossover) | Low | Low | Only validate `hora_inicio < hora_fin`, no overnight support |
| Browser timezone issues with time inputs | Medium | Low | Store as string in HH:mm format, handle UTC conversion in API |
| Breaking changes if client caches old API response | Low | Medium | Use `Cache-Control: no-store` (already used) |

## Rollback Plan

1. **Revert Prisma schema**: Remove new fields from `Feriado` model
2. **Revert migration**: `npx prisma migrate dev` will create a reverting migration
3. **Revert code changes**: Restore previous versions of modified files from git
4. **No data loss**: Existing `Feriado` records will be preserved (columns dropped, data in old rows remains until cleanup)

## Dependencies

- **PostgreSQL 18.3**: Requires `@db.Time` type support (available in PostgreSQL 8.0+)
- **Prisma 7**: Migration tooling required
- **No external dependencies**: Uses native PostgreSQL Time type

## Success Criteria

- [ ] Admin can create a partial-day holiday with specific open hours
- [ ] Admin can create a full-day holiday (default behavior, unchanged UX)
- [ ] Existing holidays continue to work with `todo_dia=true`
- [ ] Public page displays "Todo el día" for full-day holidays
- [ ] Public page displays "Abierto de [hora] a [hora]" for partial holidays
- [ ] Validation rejects partial holiday without both times
- [ ] Validation rejects `hora_inicio >= hora_fin`
- [ ] Database migration succeeds on fresh install
- [ ] Database migration succeeds on existing database with holidays
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without warnings on modified files
