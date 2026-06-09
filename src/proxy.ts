import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Proxy de autenticación - Validación SERVER-SIDE
 *
 * Este proxy valida la sesión REAL del usuario ANTES de cualquier renderizado.
 * No confía solo en la existencia de la cookie - verifica con la base de datos.
 * 
 * Flujo:
 * 1. Rutas públicas (login, api) → se permiten sin validación
 * 2. Rutas admin/* → se valida sesión y rol de admin
 * 3. Si no hay sesión válida → redirect a /admin/login
 * 4. Si el usuario no es admin → redirect a /
 */

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Rutas públicas que NO requieren autenticación
  // Las rutas que no están acá ni son /admin/* pasan igual por el fallthrough.
  // Este listado es explícito para documentación y cortocircuito rápido.
  const publicPaths = [
    "/admin/login",      // Login de admin (público)
    "/api/auth/",        // Better Auth API routes
    "/api/",             // API routes públicas
    "/feriados",         // Página de feriados
    "/informacion",      // Página de información
    "/rutinas",          // Rutinas públicas y detalle
  ];

  // Verificar si es una ruta pública
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path)
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Para rutas admin/*, validar sesión REAL
  if (pathname.startsWith("/admin")) {
    try {
      // Obtener sesión desde el servidor usando las cookies de la request
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      // Si no hay sesión → redirigir a login
      if (!session) {
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Verificar si el usuario es admin
      if (!session.user || session.user.role !== "ADMIN") {
        // Si no es admin, redirigir al home (no a /admin/login para no revelar que existe admin)
        return NextResponse.redirect(new URL("/", request.url));
      }

      return NextResponse.next();
    } catch (error) {
      // Error de conexión o sesión inválida → redirigir a login
      console.error("[Auth Proxy] Session validation error:", error);
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // Otras rutas → permitir (pueden ser rutas públicas adicionales)
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
