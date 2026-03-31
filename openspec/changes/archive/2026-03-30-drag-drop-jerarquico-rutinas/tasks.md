# Tasks: Drag and Drop Jerárquico para Crear Rutina

## Overview

**Change**: `drag-drop-jerarquico-rutinas`  
**Design**: `openspec/changes/drag-drop-jerarquico-rutinas/design.md`  
**Total Tasks**: 32  
**Phases**: 6  

---

## Phase 1: Types & Pure Functions

- [x] 1.1 Define `DragItem` type with `type: 'dia' | 'ejercicio'`, `id`, `diaIndex` and optional `ejercicioIndex`
- [x] 1.2 Define `DragEndResult` type for DndContext `onDragEnd` return value
- [x] 1.3 Define `SortableItem` union type: `DiaSortableProps | EjercicioSortableProps`
- [x] 1.4 Define `RutinaDNDActions` interface with `moveDias` and `moveEjercicios` methods
- [x] 1.5 Create `src/lib/dnd-utils.ts` with `reorderDias(dias[], oldIndex, newIndex)` pure function using `arrayMove`
- [x] 1.6 Create `reorderEjerciciosSameDia(ejercicios[], oldIndex, newIndex)` pure function
- [x] 1.7 Create `moveEjercicioToAnotherDia()` that returns early with `console.warn` — cross-day blocked

---

## Phase 2: use-rutina-dnd Hook

- [x] 2.1 Create `src/hooks/use-rutina-dnd.tsx` exporting `useRutinaDnd(customization?)` hook
- [x] 2.2 Configure `PointerSensor` with `activationConstraint: { distance: 8 }` to prevent accidental drags
- [x] 2.3 Configure `KeyboardSensor` with `coordinateGetter: sortableKeyboardCoordinates`
- [x] 2.4 Set `closestCenter` as collision detection strategy
- [x] 2.5 Implement `handleDragStart` callback with `useCallback` — sets `activeItem` state from `event.active`
- [x] 2.6 Implement `handleDragOver` callback with `useCallback` — validates same-day for ejercicios, warns on cross-day
- [x] 2.7 Implement `handleDragEnd` callback with `useCallback` — detects type, calculates indices, invokes pure handlers
- [x] 2.8 Configure `DragOverlay` with Portal rendering and conditional content (dia-overlay vs ejercicio-overlay)
- [x] 2.9 Configure `autoScroll` with `acceleration: 10`, `threshold: { x: 50, y: 50 }`, `layoutShift: true`
- [x] 2.10 Export `activeItem`, `activeOver` state, sensors, collisionDetection, handlers, and renderDragOverlay

---

## Phase 3: rutina-completa-form Integration

- [x] 3.1 Import and wrap form content with `DndContext` in `rutina-completa-form.tsx`
- [x] 3.2 Create root `SortableContext` for days with `verticalListSortingStrategy` and `sortableDays` items
- [x] 3.3 Memoize `sortableDays` array with `useMemo`: `diasFields.map(f => f.id)`
- [x] 3.4 Create `handleRutinaDragEnd` callback that calls RHF `diasMove(oldIndex, newIndex)`
- [x] 3.5 Wire `useRutinaDnd` hook with `onDragEnd: handleRutinaDragEnd`
- [x] 3.6 Wrap `DragOverlay` outside the form structure using portal (inside DndContext)
- [x] 3.7 Verify TypeScript compilation and build succeeds

---

## Phase 4: dia-section Modifications

- [x] 4.1 Add `useSortable` to `dia-section.tsx` with `id: field.id` and `data: { type: 'dia', diaId }`
- [x] 4.2 Wrap day content in `CSS.Transform` wrapper with `transform: CSS.Transform.toString(transform)`
- [x] 4.3 Add `transition` CSS property for smooth animation: `transition: transition` (from useSortable)
- [x] 4.4 Add drag handle button with `GripVertical` icon positioned at left of day header
- [x] 4.5 Add `isDragging` visual state: `opacity-50 z-50 pointer-events-none bg-muted` when dragging
- [x] 4.6 Add `aria-label` and `title` for keyboard accessibility on drag handle
- [x] 4.7 Wrap ejercicios with `SortableContext` for nested sortable exercises

---

## Phase 5: ejercicio-row Modifications

- [x] 5.1 Add `useSortable` to `ejercicio-row.tsx` with stable id and data
- [x] 5.2 Add `CSS.Transform` wrapper for drag styling
- [x] 5.3 Add drag handle button with `GripVertical` icon
- [x] 5.4 Add `isDragging` and `isOver` visual states
- [x] 5.5 Memoize the component
- [x] 5.6 Ensure cross-day blocking works

---

## Phase 6: Validation & Polish

- [x] 6.1 Execute TypeScript check: `npx tsc --noEmit` — detected schema inconsistencies
- [x] 6.2 Search residuals: found `series`/`repes` in 8+ files (types, components, actions)
- [x] 6.3 Fix `src/app/actions/rutinas.ts`: import `parseFormato`, parse `formato` to `series`/`repes` for Prisma
- [x] 6.4 Fix `src/lib/rutinas.ts`: update `Ejercicio`, `EjercicioDetail` interfaces to `number | null`
- [x] 6.5 Fix `src/app/api/rutinas/route.ts`: update `RutinaQueryResult.ejercicios` to `number | null`
- [x] 6.6 Fix `src/components/admin/ejercicio-list.tsx`: interface `Ejercicio` with `number | null`
- [x] 6.7 Fix `src/components/admin/dia-manager.tsx`: interface `Dia.ejercicios` with `number | null`
- [x] 6.8 Fix `src/components/admin/dia-card.tsx`: interface `Ejercicio` with `number | null`
- [x] 6.9 Production build: `npm run build` — SUCCESS

### Additional Fixes (Schema Migration)

- [x] Export `parseFormato` from `src/lib/schemas.ts`
- [x] Update `ejercicioNestedSchema` in `schemas.ts` to use `formato` instead of `series`/`repes`
- [x] Update `rutinaCompletaForm` default values: `{ nombre: "", formato: "" }`
- [x] Update `convertToFormData` to send `formato` instead of `series`/`repes`

---

## Task Dependencies

```
Phase 1 (Types) ──────────────────────────────────────────────────────────────┐
  └──────► Phase 2 (Hook: uses types from Phase 1) ──────────────────────────┐  │
    └──────► Phase 3 (Form Integration: uses hook from Phase 2) ────────────┐  │  │
      └──────► Phase 4 (dia-section: needs SortableContext items from Phase 3)  │  │
        └──────► Phase 5 (ejercicio-row: needs sortable props from Phase 4)     │  │
          └──────► Phase 6 (Validation: needs all components working) ──────────┘  │
```

## Focus Areas

| Phase | Focus | Risk Level |
|-------|-------|------------|
| 1 | Type safety and pure functions | Low |
| 2 | DnD core logic and state management | Medium |
| 3 | React Hook Form integration | High |
| 4 | Visual feedback and accessibility | Medium |
| 5 | Cross-day blocking logic | High |
| 6 | End-to-end verification | Medium |

## Critical Constraints

1. **Unidirectional sync**: DnD → RHF only. Never update DnD state from RHF re-renders
2. **Cross-day blocked**: Ejercicios must NOT move between days — return early with warning
3. **Stable IDs**: Use `field.id` from RHF, never array index as key
4. **Activation distance**: PointerSensor must require 8px minimum distance to prevent accidental drags
5. **Portal for DragOverlay**: Render outside form to avoid z-index/context issues

## Next Step

Run `/sdd-apply drag-drop-jerarquico-rutinas` to begin Phase 3 implementation (rutina-completa-form Integration).
