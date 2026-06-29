import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getActiveMemberAuthContext } from "@/lib/auth";
import { getRutinas } from "@/lib/rutinas";
import { RutinasListClient } from "@/components/admin/rutinas-list-client";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function AdminRutinasPage() {
  const authContext = await getActiveMemberAuthContext(await headers());
  if (!authContext || (authContext.role !== "admin" && authContext.role !== "trainer")) {
    notFound();
  }

  // ADMIN: get all active-org rutinas. TRAINER: get only their own active-org rutinas.
  const ownerId = authContext.role === "trainer" ? authContext.session.user.id : undefined;
  const rutinas = await getRutinas(authContext.activeOrganizationId, ownerId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rutinas"
        description="Administra las rutinas de entrenamiento"
        backHref="/admin"
        actions={
          <Link href="/admin/rutinas/new">
            <Button>
              <Plus className="w-5 h-5 mr-2" />
              Nueva Rutina
            </Button>
          </Link>
        }
      />

      {/* Rutinas List - Client Component handles search, filter, and actions */}
      <RutinasListClient rutinas={rutinas} />
    </div>
  );
}
