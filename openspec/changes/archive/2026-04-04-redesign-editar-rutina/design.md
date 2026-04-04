# Design: Rediseñar Formulario Editar Rutina

## Technical Approach

Copiar `rutina-completa-form.tsx` (que tiene drag-and-drop funcional) y adaptarlo para edición, cambiando:
- `createRutinaCompleta` → `updateRutinaCompleta`
- `defaultValues` para usar `initialData`
- Submit handler para incluir `id` de la rutina

## Architecture Decisions

### Decision: Copiar en lugar de modificar

**Choice**: Copiar `rutina-completa-form.tsx` como base
**Alternatives considered**: Continuar debugging del formulario existente
**Rationale**: El formulario de crear tiene DnD funcional conocido. Modificar el existente tomó mucho tiempo sin resolver el problema.

### Decision: Usar mismo hook useRutinaDnd

**Choice**: Usar `useRutinaDnd` del hook compartido
**Alternatives considered**: Sensores custom con closestCenter
**Rationale**: El formulario de crear usa `useRutinaDnd` y funciona correctamente. Los sensores custom pueden tener bugs.

## Data Flow

```
User drags day/ejercicio
    ↓
DndContext (useRutinaDnd hook)
    ↓
handleDragEnd extrae active/over
    ↓
Si es día → diasFields.findIndex + diasMove
Si es ejercicio → ejerciciosMoveRef.get(diaIndex) + move(from, to)
    ↓
React Hook Form actualiza estado
    ↓
Submit → updateRutinaCompleta(id, formData)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/admin/rutina-edit-form.tsx` | Replace | Copia de crear + adaptación para edición |
| `src/components/admin/rutina-completa-form.tsx` | Modify | Agregar `dayNumber` prop a DiaSection |

## Interfaces / Contracts

```typescript
// Props para el formulario de edición
interface RutinaEditFormProps {
  initialData: {
    id: string;
    nombre: string;
    tipo: "fuerza" | "cardio" | "flexibilidad" | "hipertrofia";
    descripcion?: string;
    dias: Array<{
      id?: string;
      nombre: string;
      musculosEnfocados: string;
      ejercicios: Array<{ id?: string; nombre: string; formato: string }>;
    }>;
  };
  onSuccess?: () => void;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| E2E | DnD de días reordena | Playwright: drag día, verificar orden en DOM |
| E2E | DnD de ejercicios reordena | Playwright: drag ejercicio, verificar orden |
| E2E | Submit actualiza datos | Playwright: modificar, submit, verificar en UI |

## Migration / Rollout

No migration requerida. El cambio es transparente:
- Mismo componente con mismo comportamiento
- Solo cambia la fuente de datos (initialData vs defaults vacíos)
