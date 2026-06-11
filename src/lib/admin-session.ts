import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Per-request memoized `auth.api.getSession` for admin pages.
 *
 * `React.cache()` dedupes calls within a single request: if the parent
 * layout AND a child page both call `getAdminSession()` in the same render
 * pass, only one DB hit happens. The parent layout keeps its own
 * `auth.api.getSession` call (different layer; `React.cache` shares the
 * cache within a request, but the layout validates the auth boundary
 * first and would short-circuit the page render on failure).
 *
 * The wrapper is a no-op for callers that previously called
 * `auth.api.getSession({ headers: headersList })` directly — identical
 * signature, identical return type, just memoized.
 */
export const getAdminSession = cache(async () => {
  const headersList = await headers();
  return auth.api.getSession({ headers: headersList });
});
