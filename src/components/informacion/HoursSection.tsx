import { Clock } from "lucide-react"

export function HoursSection() {
  return (
    <section className="bg-[var(--button-secondary-bg)] border border-[var(--card-border)] rounded-xl p-5">
      <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">
        Horarios
      </h2>
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-[var(--foreground)]" />
        <p className="text-lg text-[var(--foreground)]">8:00 a 22:00</p>
      </div>
      <p className="text-[var(--muted-foreground)] mt-1">Lunes a viernes</p>
    </section>
  )
}