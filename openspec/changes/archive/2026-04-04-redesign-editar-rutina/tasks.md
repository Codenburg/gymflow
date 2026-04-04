# Tasks: Rediseñar Formulario Editar Rutina

## Phase 1: Implementación

- [x] 1.1 Copiar `rutina-completa-form.tsx` a `rutina-edit-form-v2.tsx`
- [x] 1.2 Cambiar imports de `createRutinaCompleta` a `updateRutinaCompleta`
- [x] 1.3 Agregar interface `RutinaEditFormProps` con `initialData`
- [x] 1.4 Adaptar `defaultValues` del form para usar `initialData`
- [x] 1.5 Cambiar submit handler para llamar `updateRutinaCompleta`
- [x] 1.6 Agregar `dayNumber` prop a DiaSection en crear form
- [x] 1.7 Agregar `dayNumber` prop a DiaSection en edit form
- [x] 1.8 Reemplazar `rutina-edit-form.tsx` con la nueva versión
- [x] 1.9 Testear drag-and-drop de días
- [x] 1.10 Testear drag-and-drop de ejercicios

## Phase 2: Verificación

- [x] 2.1 Verificar TypeScript compile
- [x] 2.2 Verificar ESLint
- [x] 2.3 Probar edit en browser
