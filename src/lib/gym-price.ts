import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";

/**
 * Cached read of the Gym singleton's price field for server-side
 * consumers (admin dashboard, public pages).
 *
 * - 60s TTL safety net
 * - tagged "gym-config" so `revalidateTag("gym-config")` in
 *   `actions/gym.ts:updateGymField` (and `updateGymPrice`) purges the
 *   cache immediately on save.
 *
 * Returns `null` (not `0`) when the gym row is missing, so callers can
 * distinguish "unconfigured" from "free". The admin dashboard's
 * `GymPriceEditor` treats `null` as "no initial price".
 *
 * Note: uses `unstable_cache` (Next 15.x). The migration path to
 * `use cache` + `cacheTag` + `cacheLife` is documented in the design
 * and will be applied when `cacheComponents: true` is enabled in
 * next.config.ts.
 */
export const getGymPrice = unstable_cache(
  async (): Promise<number | null> => {
    try {
      const gym = await prisma.gym.findUnique({
        where: { id: "gym" },
        select: { price: true },
      });
      return gym ? Number(gym.price) : null;
    } catch (error) {
      console.error("[getGymPrice] Failed to fetch gym price:", error);
      return null;
    }
  },
  ["gym-price"],
  { tags: ["gym-config"], revalidate: 60 }
);
