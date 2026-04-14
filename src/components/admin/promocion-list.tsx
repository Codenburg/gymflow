"use client"

import { Tag, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PromocionCard } from "./promocion-card"
import type { Promocion } from "@/lib/schemas"

interface PromocionListProps {
  promociones: Promocion[]
  editingPromocionId: string | null
  onEdit: (p: Promocion) => void
  onDelete: (id: string) => void
  onToggle: (id: string, activo: boolean) => void
  onCreateNew: () => void
}

export function PromocionList({
  promociones,
  editingPromocionId,
  onEdit,
  onDelete,
  onToggle,
  onCreateNew,
}: PromocionListProps) {
  if (promociones.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <Tag className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
        <p className="text-muted-foreground text-lg">No hay promociones aún</p>
        <p className="text-muted-foreground text-sm mt-2 opacity-60">
          Crea tu primera promoción para comenzar
        </p>
        <Button onClick={onCreateNew} className="mt-4">
          <Plus className="w-4 h-4 mr-2" />
          Crear primera promoción
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {promociones.map((promocion) => (
        <PromocionCard
          key={promocion.id}
          promocion={promocion}
          isEditing={editingPromocionId === promocion.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}
