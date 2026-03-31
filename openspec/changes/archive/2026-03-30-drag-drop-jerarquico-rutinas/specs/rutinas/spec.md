# Rutinas Drag and Drop Specification

## Purpose

This spec defines the behavior for hierarchical drag-and-drop reordering of days and exercises within the routine creation form.

## ADDED Requirements

### Requirement: Día Reordering

The system MUST allow users to reorder days within a routine via drag-and-drop using a visible drag handle. The new order MUST be persisted to the backend with explicit `orden` property, not derived from array index.

#### Scenario: Reorder days by dragging

- GIVEN a routine creation form with 3 days displayed in order [Day1, Day2, Day3]
- WHEN the user drags Day2 via its drag handle to position between Day1 and Day3
- THEN the visual order updates immediately to [Day1, Day2, Day3] (Day2 moved)
- AND the backend persists `orden: 0, orden: 1, orden: 2` for the new arrangement
- AND the render order matches the persisted order exactly

#### Scenario: Reorder days by dragging to first position

- GIVEN a routine creation form with 3 days displayed in order [Day1, Day2, Day3]
- WHEN the user drags Day3 to the first position
- THEN the visual order updates immediately to [Day3, Day1, Day2]
- AND the backend persists `orden: 0, orden: 1, orden: 2` for the new arrangement

### Requirement: Exercise Reordering Within Same Day

The system MUST allow users to reorder exercises within the same day via drag-and-drop. The system MUST NOT allow exercises to be moved between different days.

#### Scenario: Reorder exercises within same day

- GIVEN a day with 3 exercises displayed in order [Ex1, Ex2, Ex3]
- WHEN the user drags Ex2 to position between Ex1 and Ex3
- THEN the visual order updates immediately to [Ex1, Ex2, Ex3] within that day
- AND the backend persists `orden: 0, orden: 1, orden: 2` for exercises in that day
- AND exercises in other days remain unchanged

### Requirement: Exercise Cross-Day Movement

The system MUST NOT allow exercises to be moved between different days via drag-and-drop. Cross-day movement MUST be prevented at the handleDragEnd level.

#### Scenario: Attempt to drag exercise to different day (blocked)

- GIVEN a routine with Day1 containing [Ex1, Ex2] and Day2 containing [Ex3, Ex4]
- WHEN the user attempts to drag Ex1 toward Day2
- THEN the exercise MUST remain in Day1
- AND no visual change occurs
- AND no backend call is made

### Requirement: Drag Cancellation

The system MUST NOT modify state when a drag operation is cancelled (e.g., pressing Escape or dropping outside valid zones).

#### Scenario: Cancel drag with Escape key

- GIVEN a routine with days in order [Day1, Day2, Day3]
- WHEN the user starts dragging Day2 and presses Escape
- THEN the days remain in original order [Day1, Day2, Day3]
- AND no backend call is made

#### Scenario: Cancel drag by dropping outside zone

- GIVEN a routine with days in order [Day1, Day2, Day3]
- WHEN the user starts dragging Day2 and drops it outside any valid drop zone
- THEN the days remain in original order [Day1, Day2, Day3]
- AND no backend call is made

### Requirement: Handle Over-Null Drop Zone

The system MUST handle gracefully when the drag overlay hovers over a null or undefined container.

#### Scenario: Hover over null container during drag

- GIVEN a drag operation is in progress
- WHEN the overlay hovers over a null container (over=null)
- THEN the system MUST NOT crash
- AND the drag operation can continue or be cancelled safely

### Requirement: Optimistic UI Update

The system MUST update the visual order IMMEDIATELY upon drop (optimistic update) before the backend call completes.

#### Scenario: Immediate visual feedback on drop

- GIVEN a routine with days in order [Day1, Day2, Day3]
- WHEN the user drops Day2 in new position
- THEN the UI updates to [Day1, Day2, Day3] within the same frame as the drop
- AND the backend reorder call happens asynchronously

### Requirement: No Infinite Loops Between DnD and RHF State

The system MUST implement unidirectional synchronization from DnD state to react-hook-form state to prevent infinite re-render loops.

#### Scenario: DnD state updates RHF but not vice versa

- GIVEN a drag operation completes
- WHEN handleDragEnd updates the useFieldArray state
- THEN the DndContext MUST NOT re-render based on RHF state changes
- AND only one re-render cycle occurs per drag interaction

### Requirement: Stable IDs During Drag

The system MUST use stable, unique identifiers for drag items that do not change during the drag operation.

#### Scenario: ID stability during drag

- GIVEN a day with id="dia-abc123" and ejercicio with id="ej-xyz789"
- WHEN the user initiates a drag on either item
- THEN the id MUST remain "dia-abc123" and "ej-xyz789" throughout the drag operation
- AND no new IDs are generated during drag

### Requirement: DragOverlay Flicker Prevention

The system MUST use DragOverlay to render the dragged item as a portal, preventing DOM reflow that causes flicker.

#### Scenario: DragOverlay renders dragged item

- GIVEN a drag operation is in progress
- WHEN the user moves the mouse
- THEN the dragged item renders in a DragOverlay portal
- AND the original position shows a placeholder
- AND movement is smooth at 60fps

### Requirement: Persistent Order Field

The system MUST persist the `orden` field explicitly for each item, recalculated after every reorder operation. The system MUST NOT rely on array index for ordering.

#### Scenario: Order field persisted correctly

- GIVEN a day at position index 2 with current orden=2
- WHEN the day is moved to position index 0
- THEN the backend persists orden=0 for that day
- AND all other days have orden values updated accordingly
- AND the UI never uses array index as the source of truth

## Acceptance Criteria

| Criterion | Measurement |
|-----------|-------------|
| Visual order matches persisted order | Manual verification: drag item, check database `orden` values, verify render order |
| No unnecessary re-renders | Performance profiler shows ≤1 re-render of list components per drag interaction |
| 60fps drag performance | No frame drops during drag animation |
| Stable IDs | IDs remain constant before, during, and after drag |
| Optimistic update | UI updates within same frame as drop event |

## Error States

### Requirement: Graceful Degradation on Network Failure

If the backend reorder call fails, the system SHOULD:
- Log the error server-side
- Return an error state to the UI
- Allow the user to retry the operation
- NOT leave the UI in an inconsistent state

### Requirement: Concurrent Modification Handling

If the routine is modified by another user during drag:
- The system MUST detect stale data
- The system SHOULD notify the user
- The operation SHOULD fail gracefully
