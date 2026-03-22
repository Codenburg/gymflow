import { RutinaCompletaForm } from "@/components/admin/rutina-completa-form";
import { PageHeader } from "@/components/admin/page-header";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default function NewRutinaPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva Rutina"
        backHref="/admin/rutinas"
      />

      {/* Form - ocupa todo el ancho disponible */}
      <RutinaCompletaForm />
    </div>
  );
}
