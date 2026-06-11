"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { reorderSchema, type FormState } from "@/lib/schemas";

/**
 * Helper function to verify admin access
 */
async function verifyAdmin(hdrs: Headers): Promise<{ authorized: boolean; message?: string }> {
  try {
    const session = await auth.api.getSession({ headers: hdrs });
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
 * Reorder Ejercicios within a Dia
 * Uses Prisma transaction for atomic update
 */
export async function reorderEjercicios(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // Verify admin access
  const authCheck = await verifyAdmin(await headers());
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }

  const diaId = formData.get("diaId") as string;
  const ejercicioIdsRaw = formData.get("ejercicioIds");

  // Validate JSON parse with try-catch
  let ejercicioIds: string[];
  try {
    ejercicioIds = JSON.parse(ejercicioIdsRaw as string) as string[];
  } catch {
    return {
      success: false,
      message: "Formato de IDs inválido",
    };
  }

  // Validate input
  const parsed = reorderSchema.safeParse({ diaId, ejercicioIds });

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "Datos de reorder inválidos",
    };
  }

  try {
    // Get the rutinaId for revalidation
    const dia = await prisma.dia.findUnique({
      where: { id: parsed.data.diaId },
      select: { rutinaId: true },
    });

    if (!dia) {
      return {
        success: false,
        message: "Día no encontrado",
      };
    }

    // Use transaction for atomic update - all exercises get new orden values
    await prisma.$transaction(
      parsed.data.ejercicioIds.map((id, index) =>
        prisma.ejercicio.update({
          where: { id },
          data: { orden: index },
        })
      )
    );

    revalidatePath(`/admin/rutinas/${dia.rutinaId}`);

    // Invalidate the rutinas cache tag — reordering exercises can
    // change the orderBy-driven list shown on the public home page
    // (getRoutinesPaginated subscribes to it) and the trainer counts
    // (getTrainerCounts subscribes to it).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)("rutinas");

    return {
      success: true,
      message: "Ejercicios reordenados exitosamente",
    };
  } catch (error) {
    console.error("Error reordering ejercicios:", error);
    return {
      success: false,
      message: "Error al reordenar los ejercicios",
    };
  }
}
