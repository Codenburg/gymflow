import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";

/**
 * Cached read of all DescuentosDuracion for server-side consumers
 * (admin panel, public informacion page).
 *
 * - 60s TTL safety net
 * - tagged "descuentos-duracion". A companion commit
 *   (revalidateTag for descuentos-duracion mutations) wires the
 *   `actions/descuentos-duracion.ts` mutations to call
 *   `revalidateTag("descuentos-duracion")` alongside the existing
 *   `revalidatePath` calls, so saves purge the cache immediately.
 *
 * The admin panel and the public informacion page both consume the same
 * unfiltered list (no active/inactive flag on this entity). Order is
 * `meses: "asc"` so shorter durations come first.
 *
 * Migrated to Next.js 16 `use cache` + `cacheTag` + `cacheLife`.
 */
// Migrated from `use cache` to `unstable_cache` — see openspec/changes/fix-use-cache-prisma-rsc-errors/.
export async function getDescuentos() {
  return unstable_cache(
    async () => {
      try {
        return await prisma.descuentoDuracion.findMany({
          orderBy: { meses: "asc" },
        });
      } catch (error) {
        console.error("[getDescuentos] Failed to fetch descuentos:", error);
        return [];
      }
    },
    ["descuentos-duracion"],
    { tags: ["descuentos-duracion"], revalidate: 60 }
  )();
}
