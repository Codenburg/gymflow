# Spec: Feriados Past Date Rules

## 1. Requirements

| ID | Description | Location |
|----|-------------|----------|
| R1 | `getToday()` utility available in `src/lib/dates.ts` | `src/lib/dates.ts` |
| R2 | `createFeriadoSchema` rejects `fecha < hoy` | `src/lib/schemas.ts` |
| R3 | `updateFeriadoSchema` rejects `fecha < hoy` | `src/lib/schemas.ts` |
| R4 | `createFeriado` server action returns 400 error for `fecha < hoy` | `src/app/actions/feriados.ts` |
| R5 | `updateFeriado` server action returns 400 error for `fecha < hoy` | `src/app/actions/feriados.ts` |
| R6 | Public pages filter holidays to `fecha >= hoy` | `src/app/(public)/feriados/page.tsx`, `src/app/(public)/informacion/page.tsx` |
| R7 | Admin UI sets `min={getToday()}` on date input | `src/components/admin/feriado-manager.tsx` |
| R8 | Admin submit validates before sending | `src/components/admin/feriado-manager.tsx` |

---

## 2. Scenarios

### S1: Create holiday with past date
- **Given**: User is on Admin Holiday Manager
- **When**: User enters a date where `fecha < hoy`
- **Then**: 
  - Zod validation shows error: "No se pueden seleccionar fechas pasadas"
  - Server action rejects with 400: "No se pueden crear feriados en fechas pasadas"
  - No record created

### S2: Create holiday with today
- **Given**: User is on Admin Holiday Manager
- **When**: User enters a date where `fecha === hoy`
- **Then**:
  - Validation passes
  - Server action succeeds
  - Holiday is created and visible in public UI

### S3: Create holiday with future
- **Given**: User is on Admin Holiday Manager
- **When**: User enters a date where `fecha > hoy`
- **Then**:
  - Validation passes
  - Server action succeeds
  - Holiday is created and visible in public UI

### S4: Update holiday to past date
- **Given**: An existing holiday with `fecha > hoy`
- **Given**: User is on Admin Holiday Manager
- **When**: User changes the date to `fecha < hoy`
- **Then**:
  - Zod validation shows error: "No se pueden seleccionar fechas pasadas"
  - Server action rejects with 400: "No se pueden crear feriados en fechas pasadas"
  - Holiday date remains unchanged

### S5: Public page shows only today + future holidays
- **Given**: Multiple holidays exist including some with `fecha < hoy`
- **When**: User visits `/feriados`
- **Then**: Only holidays where `fecha >= hoy` are displayed

### S6: Admin page shows all holidays
- **Given**: Multiple holidays exist including some with `fecha < hoy`
- **When**: Admin visits Holiday Manager
- **Then**: ALL holidays are listed (no filter applied)

### S7: Past holidays remain in DB (not deleted)
- **Given**: Holidays with `fecha < hoy` exist in database
- **When**: Any operation occurs
- **Then**: Past holidays are never deleted, only hidden from public views

---

## 3. Validation Messages

| Layer | Message |
|-------|---------|
| Backend error (server action) | "No se pueden crear feriados en fechas pasadas" |
| Frontend toast/error | "No se pueden seleccionar fechas pasadas" |

---

## 4. Files to Modify

### `src/lib/dates.ts`
**Change**: Add `getToday()` function
```ts
export function getToday(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
```

### `src/lib/schemas.ts`
**Change**: Add `.refine()` to `createFeriadoSchema` and `updateFeriadoSchema`
- Import `getToday` from `./dates`
- Add refinement: `fecha >= getToday()` with message "No se pueden seleccionar fechas pasadas"

### `src/app/actions/feriados.ts`
**Change**: Add explicit validation in `createFeriado` and `updateFeriado`
```ts
if (fecha < getToday()) {
  return { error: "No se pueden crear feriados en fechas pasadas" }
}
```

### `src/app/(public)/feriados/page.tsx`
**Change**: Add filter before render
```ts
const visibleFeriados = feriados.filter(f => f.fecha >= getToday())
```

### `src/app/(public)/informacion/page.tsx`
**Change**: Add filter to preview section
```ts
const visibleFeriados = feriados.filter(f => f.fecha >= getToday())
```

### `src/components/admin/feriado-manager.tsx`
**Change**: Add `min={getToday()}` to date input
```tsx
<Input type="date" min={getToday()} ... />
```
- Keep full list (no filtering)
- Submit validation via React Hook Form + Zod schema

---

## 5. Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        ADMIN UI                              │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │ Date Input  │───▶│ min={today}  │    │ Filtro: NONE   │  │
│  │ (UX hint)   │    └──────────────┘    │ Shows ALL      │  │
│  └─────────────┘                        └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    ZOD VALIDATION                            │
│  createFeriadoSchema / updateFeriadoSchema                 │
│  .refine(fecha >= getToday())                               │
│  Error: "No se pueden seleccionar fechas pasadas"          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  SERVER ACTIONS                             │
│  createFeriado / updateFeriado                             │
│  if (fecha < getToday()) throw 400                          │
│  Error: "No se pueden crear feriados en fechas pasadas"    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE                                 │
│  holidays table (no changes)                                │
│  Past holidays remain but are now "invisible"               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     PUBLIC UI                               │
│  ┌─────────────────────┐    ┌────────────────────────────┐ │
│  │ /feriados           │    │ /informacion preview        │ │
│  │ filter: fecha >=    │    │ filter: fecha >= getToday() │ │
│  │   getToday()        │    │                            │ │
│  └─────────────────────┘    └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| `fecha === hoy` | Valid — both allowed and visible |
| `fecha === hoy` at midnight | Local time used — consistent behavior |
| User bypasses frontend | Server action rejects with 400 |
| Timezone differences | `getToday()` uses local time consistently; string comparison handles same-format dates correctly |

---

## 7. Acceptance Criteria

- [ ] `getToday()` returns correct `YYYY-MM-DD` string in local time
- [ ] `createFeriadoSchema` rejects past dates with user-friendly message
- [ ] `updateFeriadoSchema` rejects past dates with user-friendly message
- [ ] `createFeriado` action returns 400 for past dates
- [ ] `updateFeriado` action returns 400 for past dates
- [ ] `/feriados` shows only `fecha >= hoy` holidays
- [ ] `/informacion` preview shows only `fecha >= hoy` holidays
- [ ] Admin Holiday Manager shows ALL holidays (no filter)
- [ ] Admin date input has `min={getToday()}` attribute
- [ ] Past holidays never deleted from database
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
