import { getFeriados } from "@/app/actions/feriados";
import { FeriadoManager } from "@/components/admin/feriado-manager";
import { PageHeader } from "@/components/admin/page-header";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default async function AdminFeriadosPage() {
  const feriados = await getFeriados();

  // Transform dates for client component
  const serializableFeriados = feriados.map((f) => ({
    id: f.id,
    fecha: new Date(f.fecha),
    todo_dia: f.todo_dia,
    hora_inicio: f.hora_inicio,
    hora_fin: f.hora_fin,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feriados"
        description="Días no laborales"
        backHref="/admin"
      />

      {/* Feriado Manager */}
      <FeriadoManager initialFeriados={serializableFeriados} />
    </div>
  );
}
