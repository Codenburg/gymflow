import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";

/**
 * Gym singleton response
 */
interface GymResponse {
  id: string;
  price: number;
  // Display fields — all nullable until an admin configures them.
  nombre: string | null;
  horario: string | null;
  direccion: string | null;
  mapsEmbedUrl: string | null;
  socialInstagram: string | null;
  socialWhatsapp: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Schema for updating the gym singleton via the REST endpoint.
 *
 * Accepts any subset of price + the 6 display fields. At least one
 * field MUST be present. URL fields use z.string().url(); nombre is
 * required non-empty when present; horario/direccion are free-text
 * (bounded length).
 *
 * Note: this REST PATCH exists for symmetry with the GET endpoint
 * and for any external tooling. The recommended write path for the
 * admin UI is the `updateGymField` server action in
 * src/app/actions/gym.ts (per-field, tagged revalidation).
 */
const gymUpdateSchema = z
  .object({
    price: z.number().positive({ message: "El precio debe ser un número positivo" }).optional(),
    nombre: z
      .string()
      .trim()
      .min(1, { message: "El nombre no puede estar vacío" })
      .max(80, { message: "El nombre no puede superar 80 caracteres" })
      .optional(),
    horario: z
      .string()
      .trim()
      .min(1, { message: "El horario no puede estar vacío" })
      .max(200, { message: "El horario no puede superar 200 caracteres" })
      .optional(),
    direccion: z
      .string()
      .trim()
      .min(1, { message: "La dirección no puede estar vacía" })
      .max(200, { message: "La dirección no puede superar 200 caracteres" })
      .optional(),
    mapsEmbedUrl: z
      .string()
      .trim()
      .url({ message: "URL de mapa inválida" })
      .max(2000, { message: "La URL de mapa es demasiado larga" })
      .optional(),
    socialInstagram: z
      .string()
      .trim()
      .url({ message: "URL de Instagram inválida" })
      .max(500, { message: "La URL de Instagram es demasiado larga" })
      .optional(),
    socialWhatsapp: z
      .string()
      .trim()
      .url({ message: "URL de WhatsApp inválida" })
      .max(500, { message: "La URL de WhatsApp es demasiado larga" })
      .optional(),
  })
  .refine(
    (data) =>
      data.price !== undefined ||
      data.nombre !== undefined ||
      data.horario !== undefined ||
      data.direccion !== undefined ||
      data.mapsEmbedUrl !== undefined ||
      data.socialInstagram !== undefined ||
      data.socialWhatsapp !== undefined,
    { message: "Se requiere al menos un campo para actualizar" }
  );

/**
 * Helper function to verify admin access
 */
async function verifyAdmin(
  headers: Headers
): Promise<{ authorized: boolean; message?: string }> {
  try {
    const session = await auth.api.getSession({ headers });
    if (!session) {
      return { authorized: false, message: "Debes iniciar sesión" };
    }
    if (session.user.role !== "ADMIN") {
      return { authorized: false, message: "No tienes permisos de administrador" };
    }
    return { authorized: true };
  } catch {
    return { authorized: false, message: "Error de autenticación" };
  }
}

/**
 * GET /api/gym
 * Returns the singleton gym configuration
 *
 * Response 200:
 * - Gym object with id, price, the 6 display fields (any may be null),
 *   createdAt, updatedAt
 *
 * Response 500:
 * - Error message indicating service unavailability
 */
export async function GET(): Promise<NextResponse> {
  try {
    let gym = await prisma.gym.findUnique({
      where: { id: "gym" },
    });

    // Auto-create gym if it doesn't exist
    if (!gym) {
      gym = await prisma.gym.create({
        data: { id: "gym", price: 45000 },
      });
    }

    // Convert Decimal to number for JSON response
    const response: GymResponse = {
      id: gym.id,
      price: Number(gym.price),
      nombre: gym.nombre ?? null,
      horario: gym.horario ?? null,
      direccion: gym.direccion ?? null,
      mapsEmbedUrl: gym.mapsEmbedUrl ?? null,
      socialInstagram: gym.socialInstagram ?? null,
      socialWhatsapp: gym.socialWhatsapp ?? null,
      createdAt: gym.createdAt.toISOString(),
      updatedAt: gym.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch gym config:", error);

    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again later." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/gym
 * Updates the singleton gym configuration (admin only)
 *
 * Request Body (at least one field required):
 * - price: number (optional, positive)
 * - nombre: string (optional, 1-80 chars)
 * - horario: string (optional, 1-200 chars)
 * - direccion: string (optional, 1-200 chars)
 * - mapsEmbedUrl: string (optional, valid URL, <=2000 chars)
 * - socialInstagram: string (optional, valid URL, <=500 chars)
 * - socialWhatsapp: string (optional, valid URL, <=500 chars)
 *
 * Response 200:
 * - Updated Gym object (full shape, matches GET)
 *
 * Response 400:
 * - Validation error
 *
 * Response 401:
 * - Unauthorized (not logged in)
 *
 * Response 403:
 * - Forbidden (not admin)
 *
 * Response 404:
 * - Gym configuration not found
 *
 * Response 500:
 * - Error message indicating service unavailability
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  // Verify admin access
  const authCheck = await verifyAdmin(request.headers);
  if (!authCheck.authorized) {
    const status = authCheck.message === "Debes iniciar sesión" ? 401 : 403;
    return NextResponse.json({ error: authCheck.message }, { status });
  }

  try {
    const body = await request.json();
    const parsed = gymUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check if gym exists
    const existing = await prisma.gym.findUnique({
      where: { id: "gym" },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Configuración del gym no encontrada" },
        { status: 404 }
      );
    }

    const gym = await prisma.gym.update({
      where: { id: "gym" },
      data: parsed.data,
    });

    // Revalidate pages that display gym config
    revalidatePath("/");
    revalidatePath("/informacion");
    revalidatePath("/admin");
    revalidatePath("/api/gym");

    const response: GymResponse = {
      id: gym.id,
      price: Number(gym.price),
      nombre: gym.nombre ?? null,
      horario: gym.horario ?? null,
      direccion: gym.direccion ?? null,
      mapsEmbedUrl: gym.mapsEmbedUrl ?? null,
      socialInstagram: gym.socialInstagram ?? null,
      socialWhatsapp: gym.socialWhatsapp ?? null,
      createdAt: gym.createdAt.toISOString(),
      updatedAt: gym.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to update gym config:", error);

    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again later." },
      { status: 500 }
    );
  }
}
