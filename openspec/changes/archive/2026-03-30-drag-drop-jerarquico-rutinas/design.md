# Design: Drag and Drop Jerárquico para Crear Rutina

## Technical Approach

Este diseño implementa drag-and-drop jerárquico para el formulario de creación de rutinas (`rutina-completa-form.tsx`) utilizando:

- **Un único `DndContext`** como raíz que envuelve toda la estructura
- **`SortableContext` anidados**: uno para días (raíz) y uno por cada día para sus ejercicios
- **Sensores**: `PointerSensor` (arrastre con mouse/touch) y `KeyboardSensor` (accesibilidad con teclado)
- **Estrategia de colisión**: `closestCenter` para comportamiento predecible en listas
- **Sincronización unidireccional**: DnD actualiza → `useFieldArray` mutation → React re-render. NUNCA al revés
- **`DragOverlay` con Portal** para preview del ítem arrastrado sin flicker del DOM
- **`autoScroll`** habilitado con configuración de threshold y acceleration
- **Propiedad `orden` explícita** recalculada en cada operación, jamás dependiente del índice del array

---

## Architecture Decisions

### Decision: Unidirectional Sync DnD→RHF

**Choice**: DnD actualiza el estado de RHF (useFieldArray) únicamente, nunca al revés

**Alternatives considered**:
- Bidirectional sync (DESCARTADO: causa infinite re-render loops)
- External state en Zustand (DESCARTADO: over-engineering para este caso de uso)

**Rationale**: `@dnd-kit` mantiene su propio estado interno durante el drag (`active`, `over`). Si RHF también actualiza su estado durante el drag y esto dispara re-renders en los componentes que usan `useSortable`, se rompe el contrato de dnd-kit. La solución es que DnD sea el "driver" y RHF el "passenger" - solo recibe instrucciones de move en `onDragEnd`.

### Decision: Nested SortableContext Per Day

**Choice**: Cada día tiene su propio `SortableContext` para los ejercicios que contiene

**Alternatives considered**:
- Single `SortableContext` global para todos los ejercicios (DESCARTADO: permite cross-day movement involuntariamente)
- Sin SortableContext anidados (DESCARTADO: no hay detección de contenedor)

**Rationale**: Los `SortableContext` anidados permiten que `closestCenter` detecte correctamente cuándo un ejercicio está sobre otro del mismo día vs. sobre un día diferente. Esto facilita el bloqueo de movimientos cross-day en `handleDragOver`.

### Decision: Pure Handler Functions

**Choice**: `reorderDias`, `reorderEjerciciosSameDia`, `moveEjercicioToAnotherDia` como funciones puras separadas

**Alternatives considered**:
- Single `handleDragEnd` con if/else anidados (DESCARTADO: viola SRP, difícil de testear)

**Rationale**: Cada handler tiene responsabilidad única:
- `reorderDias`: reordena días usando `arrayMove` de @dnd-kit
- `reorderEjerciciosSameDia`: reordena ejercicios dentro de un día específico
- `moveEjercicioToAnotherDia`: **RETURNS EARLY** - cross-day no permitido

Esto facilita testing unitario y separa la lógica de negocio de los efectos secundarios.

### Decision: DragOverlay for Drag Preview

**Choice**: Usar `DragOverlay` con Portal para renderizar el ítem arrastrado

**Alternatives considered**:
- Clone element in place con `opacity-0` en original (DESCARTADO: causa layout reflow)
- CSS `will-change: transform` only (DESCARTADO: no elimina el placeholder visual)

**Rationale**: `DragOverlay` usa React Portal para renderizar el preview fuera del flujo normal del DOM. El original se oculta con `opacity-0` pero permanece en su posición, evitando que el layout se reorganice. El Portal sigue el cursor fluidamente.

### Decision: closestCenter Collision Strategy

**Choice**: `closestCenter` sobre `closestCorners` o `closestEdge`

**Alternatives considered**:
- `closestCorners` (DESCARTADO: behavior impredecible con listas de diferentes tamaños)
- `closestEdge` (DESCARTADO: diseñado para dock panels, no listas verticales)

**Rationale**: `closestCenter` encuentra el ítem más cercano al centro del cursor, lo cual es intuitivo para reordenar listas verticales donde cada ítem tiene altura fija.

### Decision: Stable ID Strategy with useCallback Factories

**Choice**: `createSortableEjercicios(diaId)` como factory useCallback por día

**Alternatives considered**:
- Inline arrow functions en render (DESCARTADO: causa re-renders innecesarios)
- useMemo simple sin callback factory (DESCARTADO: no permite pasar parámetros por día)

**Rationale**: Cada `DiaSection` necesita su propio `sortableEjercicios` para pasarlo a su `SortableContext` anidado. Un factory `useCallback` por día garantiza estabilidad referencial mientras permite código compartido.

### Decision: useMemo for SortableContext Items Arrays

**Choice**: `useMemo` para calcular `sortableDays` y cada `sortableEjercicios(diaId)`

**Alternatives considered**:
- Recalcular en cada render (DESCARTADO:浪费 renders)
- useRef (DESCARTADO: no causa re-render, innecesario aquí)

**Rationale**: `SortableContext` compara arrays por referencia. Sin `useMemo`, cada render crearía un nuevo array, disparando el sorting logic innecesariamente. `useMemo` garantiza que solo se recalcula cuando cambian las fields de RHF.

---

## Data Flow

```
User drag start
         │
         ▼
DndContext.onDragStart ──→ Set active drag item (internal DnD state)
         │
         ▼
DndContext.onDragOver ──→ Validate cross-container detection
         │                    (same day? different day?)
         ▼
DndContext.onDragEnd ──→ handleDragEnd (useCallback estable)
         │
         ├──▶ CASE 1: active.type = "dia"
         │         │
         │         ▼
         │    reorderDias(diasFields, oldIndex, newIndex)
         │         │
         │         ▼
         │    RHF move(oldIndex, newIndex) [unidirectional]
         │         │
         │         ▼
         │    RHF trigger → re-render
         │
         ├──▶ CASE 2: active.type = "ejercicio" AND same day
         │         │
         │         ▼
         │    reorderEjerciciosSameDia(ejerciciosFields, oldIndex, newIndex)
         │         │
         │         ▼
         │    RHF move(oldIndex, newIndex) [unidirectional]
         │
         └──▶ CASE 3: active.type = "ejercicio" AND different day
                  │
                  ▼
             BLOCKED - console.warn + return early
             No state mutation, no re-render

User drop (optimistic) ──► RHF state update (immediate, synchronous)
         │
         ▼
    React re-render with new order
         │
         ▼
    (Future: useEffect trigger ──► Backend persist async)
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/admin/rutina-completa-form.tsx` | **Modify** | Wrap dias list with DndContext + SortableContext(days), add sensors, collision strategy, DragOverlay, moveDias handler |
| `src/components/admin/dia-section.tsx` | **Modify** | Add `useSortable` to header, receive `sortableEjercicios` array prop, add `isDragging` visual state |
| `src/components/admin/ejercicio-row.tsx` | **Modify** | Add `useSortable` to entire row, `useDragHandle` on indicator, add `isDragging` visual state |
| `src/hooks/use-rutina-dnd.ts` | **Create** | Custom hook encapsulating DnD logic: sensors, handlers, active state, sortable arrays |
| `src/lib/schemas.ts` | **No Change** | `orden` ya existe en Prisma schema, no se requiere validación adicional en frontend |

---

## Module Interaction

### DndContext Structure

```
DndContext (single instance in rutina-completa-form.tsx)
├── sensors: [PointerSensor, KeyboardSensor]
├── collisionDetection: closestCenter
├── autoScroll: { acceleration: 10, threshold: 50, layoutShift: true }
│
├── DragOverlay (Portal)
│   └── Renders: dia-overlay | ejercicio-overlay based on active.type
│
└── SortableContext (days) ──► items: diasFields.map(f => f.id)
        │
        └── [DiaSection, DiaSection, ...] (each with useSortable)
                │
                └── Each DiaSection contains:
                        SortableContext (ejercicios) ──► items: sortableEjercicios(diaId)
                                │
                                └── [EjercicioRow, EjercicioRow, ...] (each with useSortable)
```

### Handler Signatures

```typescript
// Pure function - reorders days array
function reorderDias(dias: Field[], oldIndex: number, newIndex: number): Field[]

// Pure function - reorders ejercicios within same day
function reorderEjerciciosSameDia(
  ejercicios: Field[],
  oldIndex: number,
  newIndex: number
): Field[]

// BLOCKED operation - cross-day not allowed
function moveEjercicioToAnotherDia(
  sourceDiaId: string,
  targetDiaId: string,
  ejercicioId: string
): void // RETURNS EARLY with warning
```

### Type Definitions

```typescript
import type { DragEndEvent, DragStartEvent, DragOverEvent } from "@dnd-kit/core";
import type { SortingStrategy } from "@dnd-kit/sortable";

interface DiaSortableProps {
  id: string;
  data: {
    type: "dia";
    diaIndex: number;
  };
}

interface EjercicioSortableProps {
  id: string;
  data: {
    type: "ejercicio";
    diaIndex: number;
    ejercicioIndex: number;
  };
}

type SortableItem = DiaSortableProps | EjercicioSortableProps;

interface DragItem {
  type: "dia" | "ejercicio";
  id: string;
  diaIndex: number;
  ejercicioIndex?: number;
}

interface RutinaDNDActions {
  // Day reorder
  moveDias: (oldIndex: number, newIndex: number) => void;
  // Exercise reorder within same day
  moveEjercicios: (diaIndex: number, oldIndex: number, newIndex: number) => void;
}
```

---

## useMemo / useCallback Strategy

| Hook/Variable | Scope | Reason |
|---------------|-------|--------|
| `sortableDays` | rutina-completa-form | `useMemo`: Memoize `diasFields.map(f => f.id)` para evitar recalcular en cada render. Pass to root `SortableContext` |
| `sortableEjercicios(diaId)` | DiaSection | `useMemo`: Memoize ejercicios array per day. Pass to nested `SortableContext` |
| `handleDragStart` | rutina-completa-form | `useCallback`: Establece `activeDrag` state. Referencia estable para `DndContext` |
| `handleDragOver` | rutina-completa-form | `useCallback`: Cross-container validation (same day check). Retorna early si cross-day |
| `handleDragEnd` | rutina-completa-form | `useCallback`: Main handler - detecta tipo, calcula índices, llama a `moveDias` o `moveEjercicios` |
| `createSortableEjercicios(diaId)` | rutina-completa-form | `useCallback factory`: Retorna `useMemo`-ed array de IDs para el SortableContext anidado de cada día |

### Dependency Array Guidelines

```typescript
// handleDragEnd dependencies
const handleDragEnd = useCallback((event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  
  const activeData = active.data.current as SortableItem;
  const overData = over.data.current as SortableItem;
  
  if (activeData.type !== overData.type) return;
  
  // ... reorder logic
}, [
  diasFields,        // RHF field array - provides move function
  move,              // RHF useFieldArray move function
]);
```

---

## autoScroll Configuration

```typescript
// In DndContext props - enables automatic scroll when dragging near edges
autoScroll={{
  acceleration: 10,     // Speed multiplier for scroll
  threshold: 50,       // Pixels from edge before scrolling starts
  layoutShift: true    // Account for layout shifts during scroll
}}

// Applied automatically to scrollable containers within DndContext
// Works with PointerSensor input (mouse/touch)
```

---

## Edge Case Handling

| Case | Detection | Handling |
|------|-----------|----------|
| `over = null` on drag end | `!over` | `return` early - no state change |
| `over.id = active.id` (same position) | `active.id === over.id` | `return` early - no state change |
| `over.type !== active.type` | `activeData.type !== overData.type` | `return` early - cannot drop dia on ejercicio |
| Cross-day ejercicio drag | `activeData.diaIndex !== overData.diaIndex` | `console.warn` + `return` early - blocked |
| RHF field not found | Exception in `move()` | No-op, error logged (RHF handles gracefully) |
| Empty day exercises | `ejerciciosFields.length === 0` | `return` early - nothing to reorder |
| Drag cancelled (Escape) | `event.cancel` | DndContext resets `active` automatically |
| Drag outside window | Browser behavior | DndContext resets `active` on `pointerup` outside |

### Cross-Day Block Implementation

```typescript
function handleDragOver(event: DragOverEvent) {
  const { active, over } = event;
  if (!over) return;

  const activeData = active.data.current as SortableItem;
  const overData = over.data.current as SortableItem;

  // Block cross-day ejercicio movement
  if (activeData.type === "ejercicio" && activeData.diaIndex !== overData.diaIndex) {
    // Could set a "blocked" state here for UI feedback
    console.warn(`[DnD] Cross-day ejercicio drag blocked: ${activeData.diaIndex} -> ${overData.diaIndex}`);
  }
}
```

---

## Open Questions

**None**. Todas las decisiones técnicas han sido resueltas en este diseño basándose en:

1. **Propuesta** (`proposal.md`): Define intent, scope, risks, y approach
2. **Specs** (`specs/rutinas/spec.md`): Define requirements funcionales y acceptance criteria
3. **Código existente**: Analizado para garantizar compatibilidad con `useFieldArray` y esquemas actuales

---

## Implementation Notes

### React Hook Form Integration

El integration con `useFieldArray` requiere特别注意:

```typescript
// ❌ WRONG - causa infinite loop
<DndContext onDragEnd={(e) => {
  const newOrder = arrayMove(fields, oldIdx, newIdx);
  replace(newOrder);  // Esto dispara re-render
  // Que a su vez recalcula sortableDays
  // Que a su vez causa DndContext to re-render
}}>

// ✅ CORRECT - unidirectional
const moveDay = useCallback((oldIndex: number, newIndex: number) => {
  move(oldIndex, newIndex);  // Solo le dice a RHF que mueva
  // No hay efecto colateral, RHF maneja el re-render
}, [move]);

<DndContext onDragEnd={(e) => handleDragEnd(e, moveDay)}>
```

### DragOverlay Content

El contenido del DragOverlay debe ser una versión simplificada del componente real para evitar:
- Dependency on RHF `control` prop
- Large DOM footprint
- Complex event handlers

```typescript
// En DragOverlay
<DragOverlay>
  {activeDrag.type === "dia" ? (
    <div className="dia-overlay">Día {activeDrag.diaIndex + 1}</div>
  ) : (
    <div className="ejercicio-overlay">{activeDrag.nombre || "Ejercicio"}</div>
  )}
</DragOverlay>
```

### Keyboard Accessibility

El `KeyboardSensor` permite drag con teclado:
- **Space/Enter**: Inicia drag del ítem enfocado
- **Arrow keys**: Movimenta ítem
- **Space/Enter**: Drop
- **Escape**: Cancela drag

El focus se mantiene en el ítem original durante todo el drag operation.
