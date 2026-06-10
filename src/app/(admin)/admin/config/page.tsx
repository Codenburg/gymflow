import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth, isAdmin } from "@/lib/auth";
import { getGymConfigForServer } from "@/app/actions/gym";
import { GymConfigManager } from "@/components/admin/GymConfigManager";
import { PageHeader } from "@/components/admin/page-header";

// Force dynamic rendering — config writes are admin-only and must
// bypass the route-level cache.
export const dynamic = "force-dynamic";

/**
 * /admin/config
 *
 * Admin-only configuration page for the singleton Gym record.
 * - Unauthenticated: redirected to /admin/login by the parent layout.
 * - TRAINER: redirected to /admin/rutinas (mirrors the trainers page pattern).
 * - USER: redirected to "/" by the parent layout.
 *
 * Reads the current config through `getGymConfigForServer` (the cached
 * reader wired in Slice 1) and passes a serializable snapshot to the
 * client manager. The manager uses `updateGymField` per field, which
 * revalidates the `gym-config` tag and the public paths.
 */
export default async function AdminConfigPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  // Admin-only guard — TRAINER is redirected to /admin/rutinas.
  if (!isAdmin(session)) {
    redirect("/admin/rutinas");
  }

  const gym = await getGymConfigForServer();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración del Gimnasio"
        description="Editá los datos visibles del gimnasio (nombre, horarios, ubicación y redes)."
        backHref="/admin"
      />

      <GymConfigManager
        initial={{
          nombre: gym?.nombre ?? null,
          horario: gym?.horario ?? null,
          direccion: gym?.direccion ?? null,
          mapsEmbedUrl: gym?.mapsEmbedUrl ?? null,
          socialInstagram: gym?.socialInstagram ?? null,
          socialWhatsapp: gym?.socialWhatsapp ?? null,
        }}
      />
    </div>
  );
}
