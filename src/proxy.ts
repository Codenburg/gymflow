import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const publicPaths = [
    "/admin/login", // Login de admin (público)
    "/api/auth/", // Better Auth API routes
    "/api/", // API routes públicas
    "/feriados", // Página de feriados
    "/informacion", // Página de información
    "/rutinas", // Rutinas públicas y detalle
  ];

  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path),
  );

  if (isPublicPath) {
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

      const role = (session.user as any)?.role;
      if (role !== "ADMIN" && role !== "TRAINER") {
        return NextResponse.redirect(new URL("/", request.url));
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
