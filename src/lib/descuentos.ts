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
 * Note: uses `unstable_cache` (Next 15.x). The migration path to
 * `use cache` + `cacheTag` + `cacheLife` is documented in the design
 * and will be applied when `cacheComponents: true` is enabled in
 * next.config.ts.
 */
export const getDescuentos = unstable_cache(
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
);
