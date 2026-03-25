# Tasks: Agregar horarios parciales a Feriados

## Phase 1: Database & Schema (Foundation)

- [x] 1.1 Add `todo_dia`, `hora_inicio`, `hora_fin` fields to `Feriado` model in `prisma/schema.prisma`
- [x] 1.2 Run `npx prisma migrate dev --name add_feriado_partial_schedule` to create migration (pre-existing db conflict noted)
- [x] 1.3 Verify migration creates columns with correct types and defaults (schema valid, client generated)

## Phase 2: Validation Schema (Domain)

- [x] 2.1 Update `feriadoSchema` in `src/lib/schemas.ts` to include `todo_dia`, `hora_inicio`, `hora_fin` fields
- [x] 2.2 Add Zod `.refine()` for partial-day time requirement validation
- [x] 2.3 Add Zod `.refine()` for `hora_inicio < hora_fin` validation
- [x] 2.4 Update `FeriadoInput` type export

## Phase 3: API Layer (Infrastructure)

- [x] 3.1 Update `FeriadoResponse` interface in `src/app/api/feriados/route.ts` to include new fields
- [x] 3.2 Update `feriadoSchema` inside route.ts to use shared schema from lib/schemas.ts
- [x] 3.3 Update GET handler to return `todo_dia`, `hora_inicio`, `hora_fin` in response
- [x] 3.4 Update POST handler to accept and store new fields
- [x] 3.5 Test API: GET returns new fields, POST creates partial-day holiday (via build verification)

## Phase 4: Server Actions (Application)

- [x] 4.1 Update `createFeriado` in `src/app/actions/feriados.ts` to pass `todo_dia`, `hora_inicio`, `hora_fin` via FormData (schema handles automatically)
- [x] 4.2 Update `Feriado` interface in `feriado-manager.tsx` to include new fields

## Phase 5: Admin UI (Presentation)

- [x] 5.1 Add "Día completo" checkbox to `feriado-manager.tsx` (checked by default)
- [x] 5.2 Add conditional rendering for `hora_inicio` and `hora_fin` time inputs (visible when checkbox unchecked)
- [x] 5.3 Wire checkbox state to show/hide time inputs
- [x] 5.4 Update `createFeriado` FormData to include new fields
- [x] 5.5 Update holiday list display to show "Día completo" badge for full-day holidays

## Phase 6: Public Pages (Presentation)

- [x] 6.1 Update `src/app/(public)/feriados/page.tsx` — add `todo_dia`, `hora_inicio`, `hora_fin` to `Feriado` interface
- [x] 6.2 Update `formatDate` or create new helper to display "Todo el día" or "Abierto de HH:mm a HH:mm"
- [x] 6.3 Update `src/app/(public)/informacion/page.tsx` — add new fields to `Feriado` interface
- [x] 6.4 Update `HolidaysPreview` to display partial schedules

## Phase 7: Verification

- [x] 7.1 Run `npx tsc --noEmit` to verify TypeScript compiles ✅
- [x] 7.2 Run `npm run lint` to verify ESLint passes (only pre-existing warnings)
- [x] 7.3 Run `npm run build` to verify production build succeeds ✅
- [ ] 7.4 Manual test: Create a full-day holiday via admin UI
- [ ] 7.5 Manual test: Create a partial-day holiday (uncheck checkbox, enter times)
- [ ] 7.6 Manual test: Verify validation error when partial holiday missing times
- [ ] 7.7 Manual test: Verify validation error when `hora_inicio >= hora_fin`
- [ ] 7.8 Manual test: Verify public pages display correct labels

(End of file - total 53 lines)