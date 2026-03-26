# Tasks: Feriados Notification Badge

## Phase 1: API Endpoint

- [ ] 1.1 Create `src/app/api/feriados/latest/route.ts` with GET handler that queries `prisma.feriado.findFirst` ordered by `createdAt: "desc"` selecting only `createdAt`
- [ ] 1.2 Return `{ latestFeriadoDate: latest?.createdAt.toISOString() ?? null }` on success
- [ ] 1.3 Return `{ latestFeriadoDate: null }` with error logging on exception
- [ ] 1.4 Verify endpoint works: test `GET /api/feriados/latest` returns valid JSON with `latestFeriadoDate` field

## Phase 2: Hook Implementation

- [ ] 2.1 Create `src/hooks/use-feriados-notification.ts` with `"use client"` directive
- [ ] 2.2 Define `UseFeriadosNotificationReturn` interface with `hasNew`, `markAsSeen`, `latestFeriadoDate`, `isLoading`
- [ ] 2.3 Implement `useFeriadosNotification` hook with initial state: `hasNew = false`, `isLoading = true`, `latestFeriadoDate = null`
- [ ] 2.4 Implement `markAsSeen` callback that persists `latestFeriadoDate` to localStorage key `feriados_last_seen_at` only if `latestFeriadoDate` is not null
- [ ] 2.5 Implement useEffect that fetches `/api/feriados/latest` on mount
- [ ] 2.6 Implement first-visit logic: if no `lastSeen` in localStorage AND `latestFeriadoDate` exists, auto-save to localStorage and set `hasNew = false`
- [ ] 2.7 Implement returning-visitor logic: if both `lastSeen` and `latestFeriadoDate` exist, set `hasNew = latestFeriadoDate > lastSeen` (ISO string comparison)
- [ ] 2.8 Implement fail-safe: wrap all logic in try/catch, set `hasNew = false` on any error
- [ ] 2.9 Implement cleanup: use `cancelled` ref to avoid state updates after unmount

## Phase 3: Components

- [ ] 3.1 Create directory `src/components/feriados/` if not exists
- [ ] 3.2 Create `src/components/feriados/feriados-nav-button.tsx` as `"use client"` component
- [ ] 3.3 Import and use `useFeriadosNotification` hook and `Badge` from `@/components/ui/badge`
- [ ] 3.4 Implement `mounted` state with `useEffect` to avoid hydration mismatch
- [ ] 3.5 Return `null` when not mounted (SSR safe)
- [ ] 3.6 Render Link to `/feriados` with Calendar icon and "Feriados" text
- [ ] 3.7 Conditionally render destructive Badge only when `!isLoading && hasNew`
- [ ] 3.8 Create `src/components/feriados/mark-as-seen-wrapper.tsx` as `"use client"` component
- [ ] 3.9 Accept `children: React.ReactNode` prop and render them directly
- [ ] 3.10 Use `useFeriadosNotification` to get `markAsSeen`
- [ ] 3.11 Use `useRef` to track if `markAsSeen` was already called (prevent double invocation)
- [ ] 3.12 Call `markAsSeen()` in useEffect with empty dependency array

## Phase 4: Integration

- [ ] 4.1 Read `src/app/(public)/page.tsx` to find the existing Link to `/feriados` in mobile nav (around line 51-57)
- [ ] 4.2 Import `FeriadosNavButton` from `@/components/feriados/feriados-nav-button`
- [ ] 4.3 Replace the Link to `/feriados` in the mobile nav with `<FeriadosNavButton />`
- [ ] 4.4 Read `src/app/(public)/feriados/page.tsx` to understand the structure
- [ ] 4.5 Import `MarkAsSeenWrapper` from `@/components/feriados/mark-as-seen-wrapper`
- [ ] 4.6 Wrap the `<FeriadosWrapper>` component inside the page with `<MarkAsSeenWrapper>`
- [ ] 4.7 Verify homepage compiles without errors
- [ ] 4.8 Verify feriados page compiles without errors

## Phase 5: Testing

- [ ] 5.1 Write unit test for hook: verify `hasNew = false` when `latestFeriadoDate` equals `lastSeen` (same date)
- [ ] 5.2 Write unit test for hook: verify `hasNew = true` when `latestFeriadoDate > lastSeen` (newer date)
- [ ] 5.3 Write unit test for hook: verify `hasNew = false` on fetch error (fail-safe)
- [ ] 5.4 Write unit test for hook: verify `markAsSeen` does NOT write to localStorage when `latestFeriadoDate` is null
- [ ] 5.5 Write unit test for hook: verify first visit auto-saves baseline to localStorage
- [ ] 5.6 Write integration test for `GET /api/feriados/latest` when holidays exist
- [ ] 5.7 Write integration test for `GET /api/feriados/latest` when no holidays exist (returns null)
- [ ] 5.8 Manual test: verify badge does NOT appear on first visit
- [ ] 5.9 Manual test: verify badge appears after creating a new Feriado via admin panel
- [ ] 5.10 Manual test: verify badge disappears after visiting `/feriados` page

## Implementation Order

1. **Phase 1 (API)** → Foundation, no dependencies
2. **Phase 2 (Hook)** → Depends on API endpoint existing
3. **Phase 3 (Components)** → Depends on hook being implemented
4. **Phase 4 (Integration)** → Depends on all above being done
5. **Phase 5 (Testing)** → Depends on implementation complete

Rationale: Each phase builds on the previous one. API is the data source, hook consumes it, components use the hook, pages integrate components.
