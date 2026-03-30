# Proposal: Drag and Drop Jerárquico para Crear Rutina

## Intent

El formulario de creación de rutinas (`rutina-completa-form.tsx`) actualmente solo permite agregar días y ejercicios en orden de creación (append-only). Los usuarios no pueden reordenar días ni ejercicios una vez creados. Este cambio introduce drag-and-drop jerárquico usando @dnd-kit para permitir reordenar tanto días como ejercicios dentro del formulario de creación.

**Problema**: Un usuario que crea "Día 1: Pecho", luego "Día 2: Espalda", luego "Día 3: Pierna" no puede cambiar el orden a Pierna→Pech→Espalda sin eliminar y recrear los días.

## Scope

### In Scope
- DndContext con SortableContext anidados (días y ejercicios)
- Detección de tipo de ítem (día vs ejercicio) mediante custom `data-type` attribute
- handleDragEnd con 3 casos: reorder días, reorder mismo día, mover entre días (bloqueado)
- Sensors (Pointer + Keyboard), closestCenter collision detection
- DragOverlay para preview del ítem arrastrado (evita flicker del DOM)
- Persistencia del orden mediante payload explícito con propiedad `orden`
- Optimistic UI updates vía move/swap en useFieldArray

### Out of Scope
- Edit Routine flow (será cambio separado)
- Mobile/touch optimization (futuro)
- Testing (no test infra configurado según config.yaml)
- Cross-day exercise movement (ejercicios solo se reordenan dentro de su día padre)

## Approach

### Integración @dnd-kit + react-hook-form useFieldArray

El desafío central es que tanto @dnd-kit como useFieldArray管理阵列orden. La estrategia es:

1. **useFieldArray es la fuente de verdad del orden** - DnD solo dispara `move` operations
2. **Sincronización unidireccional**: DnD actualiza → useFieldArray mutation → React re-render
3. **No escribir de vuelta en handleDragEnd** - solo calcular el nuevo índice y llamar a la función de reorder de useFieldArray

### Estrategia de reorder para arrays anidados

```
Estructura:
dias: [{ id: "dia-1", ejercicios: [{ id: "ej-1" }, { id: "ej-2" }] }, ...]

handleDragEnd:
1. Detectar si es drag de día o ejercicio (data.type)
2. Si es día:
   - arrayMove(diasFields, activeIndex, overIndex)
   - useFieldArray replace con nuevo array
3. Si es ejercicio dentro mismo día:
   - arrayMove(ejerciciosFields, activeIndex, overIndex)
   - useFieldArray replace del día específico
4. Si es ejercicio entre días:
   - IGNORAR (no permitido, UX consistente)
```

### Key Implementation Details

**Item detection via data attributes**:
```typescript
// En cada sortable item
data={{ type: "dia" | "ejercicio", diaIndex, ejercicioIndex? }}

// En handleDragEnd
const { active, over } = event;
const type = active.data.current?.type;
```

**Sync con useFieldArray**:
```typescript
// NO hacer esto (causa loop infinito):
// onDragEnd={(event) => { move(event); form.setValue(...) }}

// HACER esto (unidirectional):
const moveDia = useCallback((oldIndex: number, newIndex: number) => {
  const newDias = arrayMove(diasFields, oldIndex, newIndex);
  replace(newDias); // useFieldArray replace operation
}, [diasFields, replace]);
```

### DragOverlay

Para evitar que el DOM se "rompa" visualmente durante el drag:
- Usar `<DragOverlay>` con `item` renderizando una copia simplificada del componente
- El item original se oculta con `opacity-0` durante el drag via `isDragging` prop

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/admin/rutina-completa-form.tsx` | **Modified** | DndContext wrapper, move/swap functions para días |
| `src/components/admin/dia-section.tsx` | **Modified** | useSortable para días, receive move handler |
| `src/components/admin/ejercicio-row.tsx` | **Modified** | useSortable para ejercicios, visual feedback on drag |
| `src/lib/schemas.ts` | **Modified** | Validación de payload con `orden` explícito (number) |

### No Changes Required
- `src/app/actions/dias.ts` - reorderDias ya existe (para edit flow)
- `src/app/actions/reorder.ts` - reorderEjercicios ya existe (para edit flow)
- Schema de Prisma - tiene `orden` Int (para edit flow)

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| RHF + DnD state sync infinite loop | **High** | Unidirectional sync: DnD → useFieldArray only. useCallback para handlers. Compare indices before updating. |
| Cross-day exercise drag (should be blocked) | Low | Validación en handleDragEnd: `if (active.diaIndex !== over.diaIndex) return;` |
| DragOverlay causa layout shift | Medium | DragOverlay es `position: fixed`, usar same dimensions que original |
| form.clear() en persistencia entra en conflicto con DnD | Low | DnD opera sobre fields[], no sobre persisted draft state |
| Accesibilidad: keyboard navigation | Medium | Sensors include keyboard, focus management post-drag |

## Rollback Plan

1. **Revertir cambios en archivos**:
   ```bash
   git checkout HEAD -- \
     src/components/admin/rutina-completa-form.tsx \
     src/components/admin/dia-section.tsx \
     src/components/admin/ejercicio-row.tsx
   ```

2. **Descartar cambios en schema** (si se modificó validación):
   ```bash
   git checkout HEAD -- src/lib/schemas.ts
   ```

3. **No hay cambios en BD ni API** - solo frontend

4. **Verificar rollback**:
   - `npm run build` debe pasar
   - ESLint sin errores
   - UI de creación de rutinas vuelve a estado anterior

**Tiempo estimado de rollback**: 5-10 minutos

## Dependencies

- `@dnd-kit/core@^6.3.1` - **ya instalado**
- `@dnd-kit/sortable@^10.0.0` - **ya instalado**
- `@dnd-kit/utilities@^3.2.2` - **ya instalado**
- `react-hook-form@7.71.2` - ya instalado (useFieldArray)

### No Nuevas Dependencias

No se requiere instalar nuevos paquetes. Los packages de dnd-kit ya están presentes en package.json.

## Performance Impact

| Metric | Impact | Notes |
|--------|--------|-------|
| Bundle size | Negligible | @dnd-kit ya instalado, tree-shaking起作用 |
| Initial load | +0ms | DnD solo carga cuando usuario interactúa |
| Re-renders during drag | Moderate | useFieldArray ya causa re-renders; DnD agrega ~1 extra por drag event |
| Memory | +~2KB | DragOverlay instance |

## Breaking Changes

**None**. Este change:
- No modifica APIs existentes
- No cambia interfaces de componentes (solo agrega props opcionales)
- No requiere migración de datos
- Es 100% aditivo para el flujo de creación

## Success Criteria

- [ ] Drag handle visible en días y ejercicios (usar handle existente en ejercicio-row)
- [ ] Drag vertical de días reordena correctamente
- [ ] Drag de ejercicios dentro mismo día reordena
- [ ] Ejercicios NO pueden moverse entre días (mismo SortableContext por día)
- [ ] DragOverlay muestra preview durante drag
- [ ] Orden persistido en backend con propiedad `orden` (explícito, no rely on index)
- [ ] UI y estado persistido son consistentes (no depender de índice array)
- [ ] TypeScript compile sin errores
- [ ] ESLint pasa
- [ ] Build succeed

## Files to Modify

1. `src/components/admin/rutina-completa-form.tsx` (~50-80 LOC added)
   - Import DndContext, DragOverlay, sensors
   - Add DndContext wrapper around dias list
   - Add `moveDia` callback using arrayMove + replace
   - Add DragOverlay for day preview

2. `src/components/admin/dia-section.tsx` (~30-50 LOC added)
   - Import useSortable from @dnd-kit
   - Wrap header with useSortable
   - Pass `moveEjercicio` callback from parent
   - Add `isDragging` visual state

3. `src/components/admin/ejercicio-row.tsx` (~20-30 LOC added)
   - Import useSortable from @dnd-kit
   - Wrap row with useSortable
   - Add `isDragging` visual feedback
   - Make drag handle functional (not decorative)

4. `src/lib/schemas.ts` (~5-10 LOC modified)
   - Add `orden?: number` validation to RutinaCompletaInput if needed
