import { arrayMove } from "@dnd-kit/sortable";

/**
 * Represents an item being dragged in the DnD context.
 * Used to identify whether we're dragging a day or an ejercicio.
 */
export interface DragItem {
  type: "dia" | "ejercicio";
  id: string;
  /** diaId is optional because ejercicios may be dragged before being assigned to a day */
  diaId?: string;
}

/**
 * Result of a drag operation from DndContext's onDragEnd.
 * Contains the active (dragged) item and the over (drop target) item.
 */
export interface DragEndResult {
  active: DragItem;
  over: DragItem | null;
}

/**
 * Result when a cross-day move is attempted.
 * Cross-day ejercicio moves are blocked, not allowed.
 */
export interface MoveBlockedResult {
  blocked: true;
}

/**
 * Reorders a days array using arrayMove and recalculates the orden field.
 *
 * @param dias - Array of day objects with id and orden fields
 * @param oldIndex - Current position index
 * @param newIndex - Target position index
 * @returns New reordered array with updated orden values
 *
 * @example
 * const reordered = reorderDias(dias, 0, 2);
 * // Returns array with items moved and orden recalculated from 0
 */
export function reorderDias<T extends { id: string; orden: number }>(
  dias: T[],
  oldIndex: number,
  newIndex: number
): T[] {
  if (oldIndex === newIndex) {
    return dias;
  }

  const reordered = arrayMove(dias, oldIndex, newIndex);

  // Recalculate orden field - this is the source of truth, NOT the array index
  return reordered.map((dia, index) => ({
    ...dia,
    orden: index,
  }));
}

/**
 * Reorders ejercicios within the same day using arrayMove and recalculates orden.
 *
 * @param ejercicios - Array of ejercicio objects with id and orden fields
 * @param oldIndex - Current position index within the day
 * @param newIndex - Target position index within the day
 * @returns New reordered array with updated orden values
 *
 * @example
 * const reordered = reorderEjerciciosSameDia(ejercicios, 1, 3);
 * // Returns array with item moved from index 1 to 3, orden recalculated
 */
export function reorderEjerciciosSameDia<T extends { id: string; orden: number }>(
  ejercicios: T[],
  oldIndex: number,
  newIndex: number
): T[] {
  if (oldIndex === newIndex) {
    return ejercicios;
  }

  const reordered = arrayMove(ejercicios, oldIndex, newIndex);

  // Recalculate orden field - array index is NOT the source of truth
  return reordered.map((ejercicio, index) => ({
    ...ejercicio,
    orden: index,
  }));
}

/**
 * Blocks cross-day ejercicio movement since this is not allowed.
 * Logs a warning and returns a blocked result.
 *
 * @param _sourceDiaId - The source day ID (ignored, operation blocked)
 * @param _targetDiaId - The target day ID (ignored, operation blocked)
 * @param _ejercicioId - The ejercicio ID being moved (ignored, operation blocked)
 * @returns { blocked: true } - Indicates the operation was blocked
 *
 * @example
 * const result = moveEjercicioToAnotherDia('dia-1', 'dia-2', 'ej-123');
 * // Returns { blocked: true } and logs warning
 */
export function moveEjercicioToAnotherDia(
  _sourceDiaId: string,
  _targetDiaId: string,
  _ejercicioId: string
): MoveBlockedResult {
  console.warn(
    `[DnD] Cross-day ejercicio move blocked. ` +
      `Source: ${_sourceDiaId}, Target: ${_targetDiaId}, Ejercicio: ${_ejercicioId}. ` +
      `Ejercicios can only be reordered within the same day.`
  );
  return { blocked: true };
}
