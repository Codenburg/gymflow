"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { Controller, useFieldArray } from "react-hook-form";
import { ChevronRight, GripVertical, Trash2 } from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { EjercicioRow } from "./ejercicio-row";
import { cn } from "@/lib/utils";
import type { Control, FieldErrors } from "react-hook-form";

interface DiaSectionProps {
  field: { id: string };
  diaIndex: number;
  control: Control<any>;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  errors?: FieldErrors<any>;
  /** Callback to register this day's ejercicios move function with the parent form */
  onRegisterEjerciciosMove?: (moveFn: (from: number, to: number) => void) => void;
}

function DiaSectionComponent({
  field,
  diaIndex,
  control,
  isExpanded,
  onToggle,
  onRemove,
  errors,
  onRegisterEjerciciosMove,
}: DiaSectionProps) {
  const baseName = `dias[${diaIndex}]`;
  const diasErrors = errors?.dias as any;
  const diaErrors = diasErrors?.[diaIndex];

  // useSortable for the entire day
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
    data: {
      type: "dia",
      diaId: field.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Field array for ejercicios within this day
  const {
    fields: ejercicioFields,
    append: appendEjercicio,
    remove: removeEjercicio,
    move: moveEjercicio,
  } = useFieldArray({
    control,
    name: `${baseName}.ejercicios`,
  });

  // Ref to track move function — updated whenever useFieldArray's move changes
  const moveEjercicioRef = useRef(moveEjercicio);
  useEffect(() => {
    moveEjercicioRef.current = moveEjercicio;
  }, [moveEjercicio]);

  // Register this day's ejercicios move function with parent form
  // Cleanup: unregister on unmount or when diaIndex changes
  useEffect(() => {
    if (!onRegisterEjerciciosMove) return;

    onRegisterEjerciciosMove(moveEjercicioRef.current);

    return () => {
      // Unregister by setting to null (handled by parent)
    };
  }, [onRegisterEjerciciosMove, diaIndex]);

  // Memoized ejercicio IDs for SortableContext
  const sortableEjercicioIds = useCallback(
    () => ejercicioFields.map((e) => e.id),
    [ejercicioFields]
  );

  // Add new exercise to this day
  const addExercise = useCallback(() => {
    appendEjercicio({ nombre: "", formato: "" });
  }, [appendEjercicio]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white dark:bg-[#121212] rounded-2xl shadow-sm dark:shadow-black/30 overflow-hidden border transition-all duration-200",
        isDragging && "opacity-50 z-50 pointer-events-none bg-muted"
      )}
    >
      {/* Header with collapse toggle, drag handle, and delete button */}
      <div
        className={cn(
          "flex items-center justify-between gap-4 px-4 py-3 transition-colors rounded-t-2xl",
          !isDragging && "hover:bg-gray-100 dark:hover:bg-white/5",
          isExpanded && "border-b border-[#e5e7eb] dark:border-[#2a2a2a]"
        )}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          {/* Drag handle for the day - ONLY this gets the listeners */}
          <button
            type="button"
            data-testid={`dia-drag-handle-${diaIndex}`}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors"
            {...attributes}
            {...listeners}
            aria-label="Arrastrar para reordenar día"
            title="Arrastrar para reordenar día"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>

          <ChevronRight
            className={cn(
              "h-5 w-5 text-[#6b7280] transition-transform duration-200",
              isExpanded && "rotate-90"
            )}
          />
          <h3 className="text-[#111827] dark:text-white font-semibold text-base" data-testid={`dia-title-${diaIndex}`}>Día {diaIndex + 1}</h3>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-[#9ca3af] dark:text-[#6b7280] hover:text-[#ef4444] transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-white/10"
            title="Eliminar día"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Collapsible content - hidden instead of unmounting to preserve input values */}
      <div className={cn("px-4 pt-5 pb-4 space-y-4", !isExpanded && "hidden")}>
        {/* Nombre del día - full width */}
        <div className="space-y-2">
          <label className="text-[#6b7280] dark:text-[#9ca3af] text-sm font-medium block">Nombre del día</label>
          <Controller
            name={`${baseName}.nombre`}
            control={control}
            rules={{ required: "El nombre del día es requerido" }}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                placeholder="Ej: Pierna, Espalda, Pecho..."
                className="seamless-input w-full placeholder:text-[#d1d5db] dark:placeholder:text-[#6b7280]"
              />
            )}
          />
          {diaErrors?.nombre && (
            <p className="text-[#ef4444] dark:text-[#ef4444] text-xs mt-1">
              {typeof diaErrors.nombre === "object" ? diaErrors.nombre.message : diaErrors.nombre}
            </p>
          )}
        </div>

        {/* Músculos enfocados - full width */}
        <div className="space-y-2">
          <label className="text-[#6b7280] dark:text-[#9ca3af] text-sm font-medium block">Músculos enfocados</label>
          <Controller
            name={`${baseName}.musculosEnfocados`}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                placeholder="Ej: Cuádriceps, isquiotibiales, glúteos..."
                className="seamless-input w-full placeholder:text-[#d1d5db] dark:placeholder:text-[#6b7280]"
              />
            )}
          />
        </div>

        {/* Ejercicios with nested SortableContext */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-[#6b7280] dark:text-[#9ca3af] text-sm font-medium">Ejercicios</label>
            <span className="text-[#9ca3af] dark:text-[#6b7280] text-xs">Al menos 1 ejercicio</span>
          </div>

          {/* SortableContext for ejercicios - enables cross-ejercicio drag within same day */}
          <SortableContext
            items={sortableEjercicioIds()}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {ejercicioFields.map((ejercicioField, ejercicioIndex) => (
                <EjercicioRow
                  key={ejercicioField.id}
                  control={control}
                  diaIndex={diaIndex}
                  ejercicioIndex={ejercicioIndex}
                  diaId={field.id}
                  onRemove={() => removeEjercicio(ejercicioIndex)}
                  errors={diaErrors?.ejercicios}
                />
              ))}
            </div>
          </SortableContext>

          {/* Error for empty ejercicios */}
          {diaErrors?.ejercicios?.root && (
            <p className="text-[#ef4444] dark:text-[#ef4444] text-xs">
              {typeof diaErrors.ejercicios.root === "object"
                ? diaErrors.ejercicios.root.message
                : diaErrors.ejercicios.root}
            </p>
          )}

          {/* Add exercise button */}
          <button
            type="button"
            onClick={addExercise}
            className="text-[#6b7280] dark:text-[#6b7280] hover:text-[#48b8c9] transition-colors flex items-center gap-1 text-sm mt-3"
          >
            <span className="h-4 w-4">+</span>
            <span>Agregar Ejercicio</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const DiaSection = memo(DiaSectionComponent);
