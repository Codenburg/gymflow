import { AlertCircle } from "lucide-react"

interface PriceSectionProps {
  price: number | null
  error: boolean
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(price)
}

export function PriceSection({ price, error }: PriceSectionProps) {
  if (error || price === null) {
    return (
      <section className="bg-[var(--button-secondary-bg)] border border-[var(--card-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">
          Precio
        </h2>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold text-muted-foreground">
            No disponible
          </p>
          <AlertCircle className="w-4 h-4 text-destructive" />
        </div>
        <p className="text-[var(--muted-foreground)] mt-1 text-sm">
          Precio no disponible
        </p>
      </section>
    )
  }

  return (
    <section className="bg-[var(--button-secondary-bg)] border border-[var(--card-border)] rounded-xl p-5">
      <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">
        Precio
      </h2>
      <p className="text-4xl font-bold text-[var(--foreground)]">
        {formatPrice(price)}
      </p>
      <p className="text-[var(--muted-foreground)] mt-1">Abono mensual</p>
    </section>
  )
}