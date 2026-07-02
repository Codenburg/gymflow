import { DumbbellSpinner } from "@/components/ui/dumbbell-spinner";

export default function PublicGymNotFound() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
      <section className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <DumbbellSpinner size={32} className="text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Gimnasio no encontrado
          </h1>
          <p className="text-sm text-muted-foreground leading-6">
            El enlace puede haber cambiado o ya no estar disponible.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Revisá que el enlace esté escrito correctamente.
        </p>
      </section>
    </main>
  );
}
