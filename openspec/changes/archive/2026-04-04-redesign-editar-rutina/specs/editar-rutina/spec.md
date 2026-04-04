# Delta for: Editar Rutina Form

## ADDED Requirements

### Requirement: Formulario Editar Rutina Debe Pre-popular Datos Existentes

El formulario de edición DEBE mostrar los datos actuales de la rutina seleccionada, incluyendo nombre, tipo, descripción, y todos los días con sus ejercicios.

#### Scenario: Carga de datos existentes

- GIVEN una rutina con id existente en la base de datos
- WHEN el usuario navega a `/admin/rutinas/[id]`
- THEN el formulario muestra todos los campos pre-populados con los datos reales
- AND los días aparecen en el mismo orden que fueron creados

#### Scenario: Visualización de días con número de orden

- GIVEN una rutina con múltiples días
- WHEN el formulario se renderiza
- THEN cada tarjeta de día muestra "Día N" donde N es su posición (1-indexed)

### Requirement: Drag-and-Drop de Días

El sistema DEBE permitir reordenar días mediante drag-and-drop dentro del formulario de edición.

#### Scenario: Reordenar día hacia abajo

- GIVEN una rutina con 3 días (Día 1, Día 2, Día 3)
- WHEN el usuario arrastra "Día 1" y lo suelta sobre "Día 3"
- THEN el orden becomes Día 2, Día 3, Día 1
- AND el estado persiste tras recargar la página

#### Scenario: Reordenar día hacia arriba

- GIVEN una rutina con 3 días (Día 1, Día 2, Día 3)
- WHEN el usuario arrastra "Día 3" y lo suelta sobre "Día 1"
- THEN el orden становится Día 3, Día 1, Día 2

### Requirement: Drag-and-Drop de Ejercicios

El sistema DEBE permitir reordenar ejercicios dentro de un mismo día mediante drag-and-drop.

#### Scenario: Reordenar ejercicio dentro del mismo día

- GIVEN un día con 3 ejercicios (Ejercicio A, B, C)
- WHEN el usuario arrastra "Ejercicio A" y lo suelta sobre "Ejercicio C"
- THEN el orden dentro de ese día становится B, C, A
- AND los ejercicios de otros días no son afectados

### Requirement: Submit Actualiza la Rutina

El formulario DEBE llamar a `updateRutinaCompleta` al enviar, enviando todos los datos actualizados incluyendo el id de la rutina.

#### Scenario: Guardar cambios exitosamente

- GIVEN un usuario modifica el nombre de la rutina
- WHEN hace click en "Actualizar Rutina"
- THEN se muestra toast de éxito
- AND la rutina se guarda en la base de datos

#### Scenario: Validación de campos requeridos

- GIVEN el campo "Nombre" está vacío
- WHEN el usuario intenta enviar
- THEN se muestra error de validación
- AND no se llama a `updateRutinaCompleta`

## MODIFIED Requirements

Ninguno.

## REMOVED Requirements

Ninguno.
