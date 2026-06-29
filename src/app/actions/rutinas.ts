"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getActiveMemberAuthContext, type ActiveMemberAuthContext } from "@/lib/auth";
import { revalidateRutinasCache } from "@/lib/rutinas";
import {
  rutinaSchema,
  rutinaUpdateSchema,
  rutinaCompletaSchema,
  idSchema,
  parseFormato,
  type FormState,
} from "@/lib/schemas";
import type { RutinaCompletaInput } from "@/lib/schemas";

/**
 * Helper function to verify admin or trainer access
 */
type AuthCheck =
  | { authorized: true; session: ActiveMemberAuthContext["session"]; role: "admin" | "trainer"; activeOrganizationId: string }
  | { authorized: false; message: string };

async function verifyAdminOrTrainer(headers: Headers): Promise<AuthCheck> {
  try {
    const authContext = await getActiveMemberAuthContext(headers);
    if (!authContext || (authContext.role !== "admin" && authContext.role !== "trainer")) {
      return { authorized: false, message: "No tienes permisos de administrador o entrenador" };
    }
    return {
      authorized: true,
      session: authContext.session,
      role: authContext.role,
      activeOrganizationId: authContext.activeOrganizationId,
    };
  } catch {
    return { authorized: false, message: "Error de autenticación" };
  }
}

/**
 * Helper function to verify admin access
 */
async function verifyAdmin(headers: Headers): Promise<
  | { authorized: true; activeOrganizationId: string }
  | { authorized: false; message: string }
> {
  try {
    const authContext = await getActiveMemberAuthContext(headers);
    if (!authContext || authContext.role !== "admin") {
      return { authorized: false, message: "No tienes permisos de administrador" };
    }
    return { authorized: true, activeOrganizationId: authContext.activeOrganizationId };
  } catch {
    return { authorized: false, message: "Error de autenticación" };
  }
}

/**
 * Create a new Rutina
 */
export async function createRutina(
  prevState: FormState,
  formData: FormData
): Promise<FormState<{ id: string }>> {
  // Verify admin or trainer access
  const authCheck = await verifyAdminOrTrainer(await headers());
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }
  const session = authCheck.session!;
  const { activeOrganizationId } = authCheck;
  if (!session.user.id) {
    return { success: false, message: "Error: ID de usuario no encontrado" };
  }
  const creadorId = session.user.id;

  // Validate form data
  const rawData = Object.fromEntries(formData.entries());
  const parsed = rutinaSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      errors: z.flattenError(parsed.error).fieldErrors,
      message: "Error de validación",
    };
  }

  try {
    // Create routine and log ownership transfer in a transaction
    const rutina = await prisma.$transaction(async (tx) => {
      const newRutina = await tx.rutina.create({
        data: {
          ...parsed.data,
          // Required FK to User.id
          creadorId: creadorId,
          // Multi-tenant org from session
          organizationId: activeOrganizationId,
        },
      });

      // Log creation in ownership transfer audit (fromUserId = null means initial creation)
      await tx.ownershipTransfer.create({
        data: {
          rutinaId: newRutina.id,
          fromUserId: null,
          toUserId: creadorId,
          // Denormalized org for audit query efficiency
          organizationId: activeOrganizationId,
        },
      });

      return newRutina;
    });

    // Invalidate rutinas cache so homepage reflects changes immediately
    await revalidateRutinasCache();

    return {
      success: true,
      data: { id: rutina.id },
      message: "Rutina creada exitosamente",
    };
  } catch (error) {
    console.error("Error creating rutina:", error);
    return {
      success: false,
      message: "Error al crear la rutina",
    };
  }
}

/**
 * Update an existing Rutina
 * 
 * NOTE: creadorId CANNOT be changed via this function.
 * To change ownership, use transferRutinasOwnership() instead.
 * This prevents accidental or malicious transfers of routine ownership.
 * 
 * TRAINER can only update their own rutinas (creadorId === user.id).
 */
export async function updateRutina(
  prevState: FormState,
  formData: FormData
): Promise<FormState<{ id: string }>> {
  // Verify admin or trainer access
  const authCheck = await verifyAdminOrTrainer(await headers());
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }
  const session = authCheck.session!;
  const { activeOrganizationId, role } = authCheck;

  const id = formData.get("id") as string;

  // Validate UUID format
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) {
    return {
      success: false,
      message: "ID de rutina inválido",
    };
  }

  const rutinaWhere = role === "trainer"
    ? { id: idParsed.data, organizationId: activeOrganizationId, creadorId: session.user.id }
    : { id: idParsed.data, organizationId: activeOrganizationId };

  const existing = await prisma.rutina.findFirst({ where: rutinaWhere, select: { id: true } });
  if (!existing) {
    return { success: false, message: "Rutina no encontrada" };
  }

  // Validate form data
  const rawData = Object.fromEntries(formData.entries());
  const parsed = rutinaUpdateSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      errors: z.flattenError(parsed.error).fieldErrors,
      message: "Error de validación",
    };
  }

  try {
    // SECURITY NOTE: creadorId cannot be changed via this function
    // The schema does not include creadorId, and updateRutina should only
    // modify nombre, tipo, descripcion. Ownership transfers are handled
    // exclusively by transferRutinasOwnership()

    const result = await prisma.rutina.updateMany({
      where: rutinaWhere,
      data: parsed.data,
    });
    if (result.count === 0) {
      return { success: false, message: "Rutina no encontrada" };
    }

    // Invalidate rutinas cache so homepage reflects changes immediately
    await revalidateRutinasCache();

    return {
      success: true,
      data: { id: existing.id },
      message: "Rutina actualizada exitosamente",
    };
  } catch (error) {
    console.error("Error updating rutina:", error);
    return {
      success: false,
      message: "Error al actualizar la rutina",
    };
  }
}

/**
 * Duplicate a Rutina with all its Dias and Ejercicios
 * 
 * TRAINER can only duplicate their own rutinas.
 */
export async function duplicateRutina(
  prevState: FormState,
  formData: FormData
): Promise<FormState<{ id: string }>> {
  // Verify admin or trainer access
  const authCheck = await verifyAdminOrTrainer(await headers());
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }
  const session = authCheck.session!;
  const { activeOrganizationId, role } = authCheck;

  const id = formData.get("id") as string;

  // Validate UUID format
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return {
      success: false,
      message: "ID de rutina inválido",
    };
  }

  try {
    // Fetch the original rutina with all related data
    const original = await prisma.rutina.findFirst({
      where: role === "trainer"
        ? { id: parsed.data, organizationId: activeOrganizationId, creadorId: session.user.id }
        : { id: parsed.data, organizationId: activeOrganizationId },
      include: {
        dias: {
          include: {
            ejercicios: true,
          },
          orderBy: { orden: "asc" },
        },
      },
    });

    if (!original) {
      return {
        success: false,
        message: "Rutina no encontrada",
      };
    }

    // Duplicate within a transaction
    const duplicated = await prisma.$transaction(async (tx) => {
      // Create the duplicated Rutina with " (Copia)" suffix
      // The duplicated routine belongs to whoever owns the original (creadorId stays the same)
      const newRutina = await tx.rutina.create({
        data: {
          nombre: `${original.nombre} (Copia)`,
          tipo: original.tipo,
          descripcion: original.descripcion,
          // Required FK to User.id - keep original creador
          creadorId: original.creadorId,
          // Same org as the original routine
          organizationId: original.organizationId,
        },
      });

      // Deep-copy each Dia with new UUID and copy of ejercicios
      for (const dia of original.dias) {
        const newDia = await tx.dia.create({
          data: {
            rutinaId: newRutina.id,
            musculosEnfocados: dia.musculosEnfocados,
            orden: dia.orden,
          },
        });

        // Copy all ejercicios for this dia
        for (const ejercicio of dia.ejercicios) {
          await tx.ejercicio.create({
            data: {
              diaId: newDia.id,
              nombre: ejercicio.nombre,
              series: ejercicio.series,
              repes: ejercicio.repes,
              orden: ejercicio.orden,
            },
          });
        }
      }

      return newRutina;
    });

    // Invalidate rutinas cache so homepage reflects changes immediately
    await revalidateRutinasCache();

    return {
      success: true,
      data: { id: duplicated.id },
      message: "Rutina creada exitosamente",
    };
  } catch (error) {
    console.error("Error duplicating rutina:", error);
    return {
      success: false,
      message: "Error al duplicar la rutina",
    };
  }
}

/**
 * Delete a Rutina
 * 
 * TRAINER can only delete their own rutinas.
 */
export async function deleteRutina(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // Verify admin or trainer access
  const authCheck = await verifyAdminOrTrainer(await headers());
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }
  const session = authCheck.session!;
  const { activeOrganizationId, role } = authCheck;

  const id = formData.get("id") as string;

  // Validate UUID format
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return {
      success: false,
      message: "ID de rutina inválido",
    };
  }

  const existing = await prisma.rutina.findFirst({
    where: role === "trainer"
      ? { id: parsed.data, organizationId: activeOrganizationId, creadorId: session.user.id }
      : { id: parsed.data, organizationId: activeOrganizationId },
    select: { id: true },
  });
  if (!existing) {
    return { success: false, message: "Rutina no encontrada" };
  }

  try {
    await prisma.rutina.deleteMany({
      where: role === "trainer"
        ? { id: existing.id, organizationId: activeOrganizationId, creadorId: session.user.id }
        : { id: existing.id, organizationId: activeOrganizationId },
    });

    // Invalidate rutinas cache so homepage reflects changes immediately
    await revalidateRutinasCache();
    revalidatePath("/admin/rutinas");

    return {
      success: true,
      message: "Rutina eliminada exitosamente",
    };
  } catch (error) {
    console.error("Error deleting rutina:", error);
    return {
      success: false,
      message: "Error al eliminar la rutina",
    };
  }
}

/**
 * Delete multiple Rutinas (bulk delete)
 * 
 * ADMIN only - bulk delete is an admin-level operation.
 */
export async function deleteRutinas(
  prevState: FormState,
  formData: FormData
): Promise<FormState<{ deletedCount: number }>> {
  // Verify admin access (bulk delete is admin-only)
  const authCheck = await verifyAdmin(await headers());
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }
  const { activeOrganizationId } = authCheck;

  const idsJson = formData.get("ids");
  if (!idsJson || typeof idsJson !== "string") {
    return { success: false, message: "IDs inválidos" };
  }

  let ids: string[];
  try {
    ids = JSON.parse(idsJson) as string[];
  } catch {
    return { success: false, message: "Formato de IDs inválido" };
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return { success: false, message: "No hay rutinas seleccionadas" };
  }

  try {
    // SINGLE atomic operation - NO loops, NO forEach
    const result = await prisma.rutina.deleteMany({
      where: { id: { in: ids }, organizationId: activeOrganizationId },
    });

    // Invalidate rutinas cache so homepage reflects changes immediately
    await revalidateRutinasCache();
    revalidatePath("/admin/rutinas");

    return {
      success: true,
      data: { deletedCount: result.count },
    };
  } catch (error) {
    console.error("Error bulk deleting rutinas:", error);
    return {
      success: false,
      message: "Error al eliminar las rutinas",
    };
  }
}

/**
 * Parse indexed FormData (dias[0].nombre, dias[0].ejercicios[0].nombre) into nested object
 * Handles musculosEnfocados as arrays via getAll()
 */
function parseNestedFormData(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Collect all musculosEnfocados arrays first (they appear as dias[0].musculosEnfocados, dias[1].musculosEnfocados, etc.)
  const musculosMap: Record<string, string[]> = {};
  for (const [key, value] of formData.entries()) {
    // Match dias[0].musculosEnfocados pattern
    const match = key.match(/^dias\[(\d+)\]\.musculosEnfocados$/);
    if (match) {
      const index = match[1];
      if (!musculosMap[index]) {
        musculosMap[index] = [];
      }
      if (value !== "") {
        musculosMap[index].push(value as string);
      }
    }
  }

  for (const [key, value] of formData.entries()) {
    // Skip musculosEnfocados entries - handled separately above
    if (key.includes("musculosEnfocados")) {
      continue;
    }

    // Match patterns like: dias[0].nombre, dias[0].ejercicios[1].series
    const match = key.match(/^([a-zA-Z_]+)\[(\d+)\](.*)$/);

    if (!match) {
      // Simple key-value (e.g., nombre, tipo)
      result[key] = value;
      continue;
    }

    const [, arrayName, indexStr, rest] = match;
    const index = parseInt(indexStr, 10);

    // Initialize array if it doesn't exist
    if (!result[arrayName]) {
      result[arrayName] = [];
    }
    const array = result[arrayName] as unknown[];

    // Initialize the object at this index if it doesn't exist
    if (!array[index]) {
      array[index] = {};
    }
    const current = array[index] as Record<string, unknown>;

    if (rest.startsWith(".")) {
      // Nested property: dias[0].ejercicios[0].nombre
      const nestedMatch = rest.match(/^\.([a-zA-Z_]+)\[(\d+)\](.*)$/);

      if (nestedMatch) {
        const [, nestedArrayName, nestedIndexStr, nestedRest] = nestedMatch;
        const nestedIndex = parseInt(nestedIndexStr, 10);

        // Initialize nested array if it doesn't exist
        if (!current[nestedArrayName]) {
          current[nestedArrayName] = [];
        }
        const nestedArray = current[nestedArrayName] as unknown[];

        if (!nestedArray[nestedIndex]) {
          nestedArray[nestedIndex] = {};
        }
        const nestedObject = nestedArray[nestedIndex] as Record<string, unknown>;

        if (nestedRest.startsWith(".")) {
          // Direct property: dias[0].ejercicios[0].nombre
          const propName = nestedRest.substring(1);
          nestedObject[propName] = value;
        }
      } else {
        // Simple property after array: dias[0].nombre
        const propName = rest.substring(1);
        current[propName] = value;
      }
    } else {
      // Direct value at array index: dias[0]
      array[index] = value;
    }
  }

  // Inject musculosEnfocados arrays into the parsed result
  for (const [index, musculos] of Object.entries(musculosMap)) {
    const idx = parseInt(index, 10);
    const array = result["dias"] as unknown[];
    if (array && array[idx] && typeof array[idx] === "object") {
      (array[idx] as Record<string, unknown>)["musculosEnfocados"] = musculos;
    }
  }

  // Clean up empty objects from arrays
  for (const key of Object.keys(result)) {
    const array = result[key] as unknown[];
    if (Array.isArray(array)) {
      result[key] = array.filter(
        (item) =>
          item !== undefined && (typeof item !== "object" || (item !== null && Object.keys(item).length > 0))
      );
    }
  }

  return result;
}

/**
 * Create a complete Rutina with nested Dias and Ejercicios
 * 
 * Both ADMIN and TRAINER can create rutinas. The routine is assigned
 * to the session user's id (creadorId = session.user.id).
 */
export async function createRutinaCompleta(
  prevState: FormState,
  formData: FormData
): Promise<FormState<{ id: string }>> {
  // Verify admin or trainer access
  const authCheck = await verifyAdminOrTrainer(await headers());
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }
  const session = authCheck.session!;
  const { activeOrganizationId } = authCheck;
  if (!session.user.id) {
    return { success: false, message: "Error: ID de usuario no encontrado" };
  }
  const creadorId = session.user.id;

  // Parse nested FormData
  const rawData = parseNestedFormData(formData);

  // Validate with schema
  const parsed = rutinaCompletaSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      errors: z.flattenError(parsed.error).fieldErrors,
      message: "Error de validación",
    };
  }

  const data = parsed.data as RutinaCompletaInput;

  try {
    const rutina = await prisma.$transaction(async (tx) => {
      // Create the Rutina
      const createdRutina = await tx.rutina.create({
        data: {
          nombre: data.nombre,
          tipo: data.tipo,
          descripcion: data.descripcion,
          // Required FK to User.id
          creadorId: creadorId,
          // Multi-tenant org from session
          organizationId: activeOrganizationId,
        },
      });

      // Log creation in ownership transfer audit (fromUserId = null means initial creation)
      await tx.ownershipTransfer.create({
        data: {
          rutinaId: createdRutina.id,
          fromUserId: null,
          toUserId: creadorId,
          // Denormalized org for audit query efficiency
          organizationId: activeOrganizationId,
        },
      });

      // Create Dias and Ejercicios with sequential orden
      for (let diaIndex = 0; diaIndex < data.dias.length; diaIndex++) {
        const diaData = data.dias[diaIndex];

        const createdDia = await tx.dia.create({
          data: {
            rutinaId: createdRutina.id,
            musculosEnfocados: diaData.musculosEnfocados,
            orden: diaIndex,
          },
        });

        // Create Ejercicios for this Dia
        for (let ejercicioIndex = 0; ejercicioIndex < diaData.ejercicios.length; ejercicioIndex++) {
          const ejercicioData = diaData.ejercicios[ejercicioIndex];
          const parsedFormato = parseFormato(ejercicioData.formato);

          await tx.ejercicio.create({
            data: {
              diaId: createdDia.id,
              nombre: ejercicioData.nombre,
              series: parsedFormato?.series,
              repes: parsedFormato?.repes,
              orden: ejercicioIndex,
            },
          });
        }
      }

      return createdRutina;
    });

    // Invalidate rutinas cache so homepage reflects changes immediately
    await revalidateRutinasCache();

    return {
      success: true,
      data: { id: rutina.id },
      message: "Rutina creada exitosamente",
    };
  } catch (error) {
    console.error("Error creating rutina completa:", error);
    return {
      success: false,
      message: "Error al crear la rutina",
    };
  }
}

/**
 * Update a complete Rutina with nested Dias and Ejercicios
 * This replaces all days and ejercicios with the new data provided.
 * 
 * TRAINER can only update their own rutinas.
 */
export async function updateRutinaCompleta(
  prevState: FormState,
  formData: FormData
): Promise<FormState<{ id: string }>> {
  // Verify admin or trainer access
  const authCheck = await verifyAdminOrTrainer(await headers());
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }
  const session = authCheck.session!;
  const { activeOrganizationId, role } = authCheck;

  const id = formData.get("id") as string;
  if (!id) {
    return { success: false, message: "ID de rutina requerido" };
  }

  // Validate UUID format
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) {
    return {
      success: false,
      message: "ID de rutina inválido",
    };
  }

  const existing = await prisma.rutina.findFirst({
    where: role === "trainer"
      ? { id: idParsed.data, organizationId: activeOrganizationId, creadorId: session.user.id }
      : { id: idParsed.data, organizationId: activeOrganizationId },
    select: { id: true },
  });
  if (!existing) {
    return { success: false, message: "Rutina no encontrada" };
  }

  // Parse nested FormData
  const rawData = parseNestedFormData(formData);

  // Validate with schema
  const parsed = rutinaCompletaSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      errors: z.flattenError(parsed.error).fieldErrors,
      message: "Error de validación",
    };
  }

  const data = parsed.data as RutinaCompletaInput;

  try {
    await prisma.$transaction(async (tx) => {
      // Update the Rutina basic info
      const result = await tx.rutina.updateMany({
        where: role === "trainer"
          ? { id: existing.id, organizationId: activeOrganizationId, creadorId: session.user.id }
          : { id: existing.id, organizationId: activeOrganizationId },
        data: {
          nombre: data.nombre,
          tipo: data.tipo,
          descripcion: data.descripcion,
        },
      });
      if (result.count === 0) {
        throw new Error("Rutina not found");
      }

      // Get existing days for this rutina
      const existingDias = await tx.dia.findMany({
        where: { rutinaId: existing.id },
        include: { ejercicios: true },
      });

      // Delete all existing ejercicios first
      for (const dia of existingDias) {
        await tx.ejercicio.deleteMany({
          where: { diaId: dia.id },
        });
      }

      // Delete all existing days
      await tx.dia.deleteMany({
        where: { rutinaId: existing.id },
      });

      // Create new Dias and Ejercicios with sequential orden
      for (let diaIndex = 0; diaIndex < data.dias.length; diaIndex++) {
        const diaData = data.dias[diaIndex];

        const createdDia = await tx.dia.create({
          data: {
            rutinaId: existing.id,
            musculosEnfocados: diaData.musculosEnfocados,
            orden: diaIndex,
          },
        });

        // Create Ejercicios for this Dia
        for (let ejercicioIndex = 0; ejercicioIndex < diaData.ejercicios.length; ejercicioIndex++) {
          const ejercicioData = diaData.ejercicios[ejercicioIndex];
          const parsedFormato = parseFormato(ejercicioData.formato);

          await tx.ejercicio.create({
            data: {
              diaId: createdDia.id,
              nombre: ejercicioData.nombre,
              series: parsedFormato?.series,
              repes: parsedFormato?.repes,
              orden: ejercicioIndex,
            },
          });
        }
      }
    });

    // Invalidate rutinas cache so homepage reflects changes immediately
    await revalidateRutinasCache();

    return {
      success: true,
      data: { id: idParsed.data },
      message: "Rutina actualizada exitosamente",
    };
  } catch (error) {
    console.error("Error updating rutina completa:", error);
    return {
      success: false,
      message: "Error al actualizar la rutina",
    };
  }
}
