# Proposal: Rediseñar Formulario Editar Rutina

## Intent

El formulario `rutina-edit-form.tsx` actual tiene drag-and-drop roto y no sigue los mismos patrones que `rutina-completa-form.tsx` (crear). El objetivo es copiar el formulario de crear y adaptarlo para edición, garantizando DnD funcional.

## Scope

### In Scope
- Copiar `rutina-completa-form.tsx` como base
- Adaptar para usar `updateRutinaCompleta` en lugar de `createRutinaCompleta`
- Pre-populate form con datos existentes de la rutina
- Mantener `dayNumber` en tarjetas de días
- Mantener todos los cambios CSS/estéticos ya aplicados

### Out of Scope
- Cambios en el schema de BD
- Nuevas features o cambios de UX
- Modificaciones a `rutina-completa-form.tsx`

## Approach

1. Crear nuevo archivo `rutina-edit-form-v2.tsx` copiando `rutina-completa-form.tsx`
2. Cambiar imports de `createRutinaCompleta` a `updateRutinaCompleta`
3. Agregar props `initialData` para pre-populate
4. Cambiar submit handler para llamar `updateRutinaCompleta`
5. Reemplazar archivo existente `rutina-edit-form.tsx`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/admin/rutina-edit-form.tsx` | Replaced | Copia de crear + adaptación |
| `src/app/actions/rutinas.ts` | No change | Ya tiene `updateRutinaCompleta` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Perder cambios estéticos previos | Low | Ya están en globals.css y DiaSection |

## Rollback Plan

- Git revert del commit que reemplace el archivo
- Restaurar archivo anterior desde git history

## Success Criteria

- [ ] Drag-and-drop de días funciona correctamente
- [ ] Drag-and-drop de ejercicios funciona correctamente
- [ ] Formulario pre-popula datos existentes
- [ ] Submit llama `updateRutinaCompleta` correctamente
