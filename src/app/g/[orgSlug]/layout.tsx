import type { Metadata } from "next";
import { getGymNameForServerForTenant } from "@/app/actions/gym";
import { resolvePublicTenant } from "@/lib/tenants/resolve";
import { resolveGymNameForTenant } from "@/lib/gym-display";

interface PublicTenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}

/**
 * Generates tenant route metadata after resolving the canonical slug.
 *
 * @param props - Next.js layout props with async route params.
 * @returns Metadata for the resolved public tenant route.
 */
export async function generateMetadata({ params }: PublicTenantLayoutProps): Promise<Metadata> {
  const { orgSlug } = await params;
  const tenant = await resolvePublicTenant({ orgSlug });

  if (!tenant) {
    return {
      title: "Gimnasio no encontrado",
      description: "El enlace puede haber cambiado o ya no estar disponible.",
    };
  }

  const dbName = await getGymNameForServerForTenant(tenant.organizationId);

  const name = resolveGymNameForTenant(dbName);

  return {
    title: name,
    description: `Explore ${name} routines`,
  };
}

export default async function PublicTenantLayout({
  children,
}: PublicTenantLayoutProps) {
  return children;
}
