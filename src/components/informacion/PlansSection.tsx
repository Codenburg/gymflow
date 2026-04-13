import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Promocion } from "@/app/(public)/informacion/page"

interface PlansSectionProps {
  promociones: Promocion[]
  error: boolean
}

export function PlansSection({ promociones, error }: PlansSectionProps) {
  if (error) {
    return (
      <p className="text-[var(--muted-foreground)]">
        No se pudieron cargar las promociones
      </p>
    )
  }

  if (promociones.length === 0) {
    return (
      <p className="text-[var(--muted-foreground)]">
        No hay promociones activas
      </p>
    )
  }

  return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {promociones.map((promocion) => (
          <Card
            key={promocion.id}
            className="bg-[var(--background)]"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">
                {promocion.titulo}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--muted-foreground)] mb-2">
                {promocion.descripcion}
              </p>
              <p className="text-lg font-bold text-[var(--foreground)]">
                {promocion.precio}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
  )
}