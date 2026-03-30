"use client";

import { memo } from "react";
import { Controller } from "react-hook-form";
import { GripVertical, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { Control, FieldErrors } from "react-hook-form";

interface EjercicioRowProps {
  control: Control<any>;
  diaIndex: number;
  ejercicioIndex: number;
  diaId: string;
  onRemove: () => void;
  errors?: FieldErrors<any>;
}

export const EjercicioRow = memo(function EjercicioRow({
  control,
  diaIndex,
  ejercicioIndex,
  diaId,
  onRemove,
  errors,
}: EjercicioRowProps) {
  const baseName = `dias[${diaIndex}].ejercicios[${ejercicioIndex}]`;
  const ejerciciosArrayErrors = errors as any;
  const ejercicioErrors = ejerciciosArrayErrors?.[ejercicioIndex];
  const hasError = ejercicioErrors?.nombre;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: baseName,
    data: {
      type: "ejercicio",
      diaId,
      diaIndex,
      ejercicioIndex,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 py-1 px-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group",
        isDragging && "opacity-50 z-50 pointer-events-none shadow-lg",
        isOver && "border-primary ring-2 ring-primary/20 bg-primary/5"
      )}
    >
      {/* Drag handle button - listeners ONLY on this */}
      <button
        type="button"
        className={cn(
          "cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded transition-colors",
          isDragging && "cursor-grabbing"
        )}
        {...attributes}
        {...listeners}
        aria-label="Arrastrar ejercicio para reordenar"
        title="Arrastrar para reordenar"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Nombre */}
      <div className="flex-1 min-w-0">
        <Controller
          name={`${baseName}.nombre`}
          control={control}
          rules={{ required: "El nombre del ejercicio es requerido" }}
          render={({ field }) => (
            <Input
              {...field}
              type="text"
              placeholder="Ej: Sentadillas con barra"
              className={cn(
                "seamless-input h-9 placeholder:text-[#d1d5db] dark:placeholder:text-[#6b7280]",
                hasError && "border-[#ef4444]/50"
              )}
            />
          )}
        />
        {hasError && (
          <p className="text-[#ef4444] dark:text-[#ef4444] text-xs mt-1">
            {typeof hasError === "object" ? hasError.message : hasError}
          </p>
        )}
      </div>

      {/* Formato 4x12 */}
      <div className="w-20 flex-shrink-0">
        <Controller
          name={`${baseName}.formato`}
          control={control}
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <Input
              ref={ref}
              onChange={onChange}
              onBlur={onBlur}
              value={value || ""}
              type="text"
              inputMode="numeric"
              placeholder="4x12"
              className="seamless-input w-full h-9 text-center placeholder:text-[#d1d5db] dark:placeholder:text-[#6b7280]"
            />
          )}
        />
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="p-2 text-[#d1d5db] dark:text-[#3a3a3a] hover:text-[#dc2626] transition-colors shrink-0"
        title="Eliminar ejercicio"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
});
