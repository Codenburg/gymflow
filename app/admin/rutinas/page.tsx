import Link from "next/link";
import { getRutinas, deleteRutina } from "@/app/actions/rutinas";
import { AuthGuard } from "@/components/auth-guard";
import { DeleteRutinaButton } from "@/components/admin/delete-rutina-button";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default async function AdminRutinasPage() {
  const rutinas = await getRutinas();

  return (
    <AuthGuard>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="p-2 hover:bg-[var(--button-secondary-bg)] rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Rutinas</h1>
          <p className="text-[var(--muted)] mt-1">Administra todas las rutinas</p>
        </div>
        <Link
          href="/admin/rutinas/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--button-primary-bg)] hover:opacity-90 text-[var(--button-primary-foreground)] rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Rutina
        </Link>
      </div>

      {/* Rutinas List */}
      {rutinas.length > 0 ? (
        <div className="bg-[var(--button-secondary-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="text-left px-6 py-4 text-[var(--muted)] font-medium text-sm">Nombre</th>
                <th className="text-left px-6 py-4 text-[var(--muted)] font-medium text-sm">Tipo</th>
                <th className="text-left px-6 py-4 text-[var(--muted)] font-medium text-sm">Días</th>
                <th className="text-left px-6 py-4 text-[var(--muted)] font-medium text-sm">Descripción</th>
                <th className="text-right px-6 py-4 text-[var(--muted)] font-medium text-sm">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rutinas.map((rutina) => (
                <tr key={rutina.id} className="border-b border-[var(--card-border)] hover:bg-[var(--background)] transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-[var(--foreground)] font-medium">{rutina.nombre}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-[var(--button-secondary-bg)] rounded text-xs text-[var(--muted)] capitalize">
                      {rutina.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[var(--muted)]">
                    {rutina.diasCount || 0} día{(rutina.diasCount || 0) !== 1 ? "s" : ""}
                  </td>
                  <td className="px-6 py-4 text-[var(--muted)] text-sm max-w-xs truncate">
                    {rutina.descripcion || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/rutinas/${rutina.id}`}
                        className="p-2 hover:bg-[var(--button-secondary-bg)] rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                        title="Editar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </Link>
                      <DeleteRutinaButton rutinaId={rutina.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 bg-[var(--button-secondary-bg)]/50 rounded-xl border border-[var(--card-border)]">
          <svg className="w-16 h-16 text-[var(--muted)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-[var(--muted)] text-lg">No hay rutinas creadas</p>
          <p className="text-[var(--muted)] text-sm mt-2 mb-6">Crea tu primera rutina para comenzar</p>
          <Link
            href="/admin/rutinas/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--button-primary-bg)] hover:opacity-90 text-[var(--button-primary-foreground)] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear Rutina
          </Link>
        </div>
      )}
    </div>
    </AuthGuard>
  );
}
