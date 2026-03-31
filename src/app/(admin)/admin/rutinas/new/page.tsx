import { PageHeader } from "@/components/admin/page-header";
import RutinaFormClient from "./rutina-form-client";

export default function NewRutinaPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva Rutina"
        backHref="/admin/rutinas"
      />

      {/* Form - Client component isolated for DnD */}
      <RutinaFormClient />
    </div>
  );
}
