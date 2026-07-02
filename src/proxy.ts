import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth, isAdminOrTrainer } from "@/lib/auth";
import { resolvePublicTenant } from "@/lib/tenants/resolve";

function getPublicTenantSlug(pathname: string): string | null {
  if (!pathname.startsWith("/g/")) {
    return null;
  }

  const [, publicSegment, orgSlug] = pathname.split("/");
  return publicSegment === "g" && orgSlug ? orgSlug : null;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const publicPaths = [
    "/admin/login", // Login de admin (público)
    "/api/auth/", // Better Auth API routes
    "/g", // Canonical public tenant routes
  ];

  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path),
  );

  if (isPublicPath) {
    const publicTenantSlug = getPublicTenantSlug(pathname);
    if (publicTenantSlug) {
      const tenant = await resolvePublicTenant({ orgSlug: publicTenantSlug });
      if (!tenant) {
        return new NextResponse("Not Found", { status: 404 });
      }
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      if (!(await isAdminOrTrainer(request.headers))) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }

      return NextResponse.next();
    } catch (error) {
      console.error("[Auth Proxy] Session validation error:", error);
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Matchear todas las rutas EXCEPTO:
   * - _next/static (archivos estáticos)
   * - _next/image (optimización de imágenes)
   * - favicon.ico
   * - archivos públicos (images, fonts, etc.)
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
