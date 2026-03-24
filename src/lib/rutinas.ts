import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { DataResult, ok, err } from "@/lib/data-result";

/**
 * Creator user (from FK relation)
 * Only includes id and name - minimal payload
 */
export interface CreadorUser {
  id: string;
  name: string;
}

export interface Rutina {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string | null;
  // Required FK to User.id
  creadorId: string;
  creadorUser: CreadorUser;
  diasCount: number;
  dias?: Dia[];
}

export interface Dia {
  id: string;
  nombre: string;
  musculosEnfocados: string | null;
  ejercicios: Ejercicio[];
}

export interface Ejercicio {
  id: string;
  nombre: string;
  series: string | null;
  repes: string | null;
}

export interface RutinaDetail {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string | null;
  // Required FK to User.id
  creadorId: string;
  creadorUser: CreadorUser;
  createdAt: Date;
  updatedAt: Date;
  dias: DiaDetail[];
}

export interface DiaDetail {
  id: string;
  nombre: string;
  musculosEnfocados: string | null;
  orden: number;
  ejercicios: EjercicioDetail[];
}

export interface EjercicioDetail {
  id: string;
  nombre: string;
  series: string | null;
  repes: string | null;
  orden: number;
}

export interface Trainer {
  nombre: string;
  count: number;
}

/**
 * Extract trainers with their routine counts from ALL rutinas (unfiltered).
 * Uses creadorUser.name for reliable creator identification.
 */
function extractTrainers(rutinas: { creadorUser: CreadorUser | null }[]): Trainer[] {
  const trainerMap = new Map<string, number>();

  for (const rutina of rutinas) {
    if (rutina.creadorUser?.name) {
      const current = trainerMap.get(rutina.creadorUser.name) || 0;
      trainerMap.set(rutina.creadorUser.name, current + 1);
    }
  }

  return Array.from(trainerMap.entries())
    .map(([nombre, count]) => ({ nombre, count }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * Result structure that separates filtered rutinas from stable trainer list.
 */
interface RutinasYTrainersResult {
  rutinas: Rutina[];
  trainers: Trainer[];
}

/**
 * Fetch rutinas from database with caching.
 * Uses unstable_cache to avoid repeated DB queries within revalidation period.
 */
async function fetchRutinasFromDb(
  search?: string,
  trainers?: string
): Promise<RutinasYTrainersResult> {
  try {
    // Build WHERE clause for rutinas (filters apply here)
    const where: Record<string, unknown> = {};

    if (search && search.trim().length > 0) {
      where.nombre = {
        contains: search.trim(),
        mode: "insensitive",
      };
    }

    // Parse trainer filter (used in where clause for rutinas only)
    let trainersList: string[] = [];
    if (trainers && trainers.trim().length > 0) {
      trainersList = trainers
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    }

    // CRITICAL: First query for ALL trainers (unfiltered) - this is the stable source
    // We need this BEFORE applying trainer filter so chips never disappear
    const allRutinasForTrainers = await prisma.rutina.findMany({
      select: { creadorUser: { select: { id: true, name: true } } },
    });
    const trainersData = extractTrainers(allRutinasForTrainers);

    // Apply trainer filter to WHERE clause for rutinas query
    // Filter by creadorUser.name since that's now the identity field
    if (trainersList.length > 0) {
      where.creadorUser = {
        name: {
          in: trainersList,
          mode: "insensitive",
        },
      };
    }

    // Second query: fetch filtered rutinas with dias and ejercicios
    const rutinas = await prisma.rutina.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        tipo: true,
        descripcion: true,
        creadorId: true,
        creadorUser: {
          select: {
            id: true,
            name: true,
          },
        },
        dias: {
          include: {
            ejercicios: {
              select: {
                id: true,
                nombre: true,
                series: true,
                repes: true,
              },
              orderBy: { orden: "asc" },
            },
          },
          orderBy: { orden: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      rutinas: rutinas.map((rutina) => ({
        id: rutina.id,
        nombre: rutina.nombre,
        tipo: rutina.tipo,
        descripcion: rutina.descripcion,
        creadorId: rutina.creadorId,
        creadorUser: rutina.creadorUser,
        diasCount: rutina.dias.length,
        dias: rutina.dias.map((dia) => ({
          id: dia.id,
          nombre: dia.nombre,
          musculosEnfocados: dia.musculosEnfocados,
          ejercicios: dia.ejercicios,
        })),
      })),
      trainers: trainersData,
    };
  } catch (error) {
    console.error("[fetchRutinasFromDb] DB query failed:", error);
    throw error;
  }
}

// Cache tag for manual revalidation
const RUTINAS_CACHE_TAG = "rutinas";

/**
 * Get cached rutinas with optional filters.
 */
export async function getCachedRutinas(search?: string, trainers?: string) {
  return unstable_cache(
    () => fetchRutinasFromDb(search, trainers),
    ["rutinas", search ?? "", trainers ?? ""],
    {
      revalidate: 60,
      tags: [RUTINAS_CACHE_TAG],
    }
  )();
}

async function fetchRutinaById(id: string): Promise<RutinaDetail | null> {
  try {
    const rutina = await prisma.rutina.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        tipo: true,
        descripcion: true,
        creadorId: true,
        creadorUser: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        dias: {
          include: {
            ejercicios: {
              orderBy: { orden: "asc" },
            },
          },
          orderBy: { orden: "asc" },
        },
      },
    });

    if (!rutina) {
      return null;
    }

    return {
      id: rutina.id,
      nombre: rutina.nombre,
      tipo: rutina.tipo,
      descripcion: rutina.descripcion,
      creadorId: rutina.creadorId,
      creadorUser: rutina.creadorUser,
      createdAt: rutina.createdAt,
      updatedAt: rutina.updatedAt,
      dias: rutina.dias.map((dia) => ({
        id: dia.id,
        nombre: dia.nombre,
        musculosEnfocados: dia.musculosEnfocados,
        orden: dia.orden,
        ejercicios: dia.ejercicios.map((ej) => ({
          id: ej.id,
          nombre: ej.nombre,
          series: ej.series,
          repes: ej.repes,
          orden: ej.orden,
        })),
      })),
    };
  } catch (error) {
    console.error("[fetchRutinaById] DB query failed:", error);
    throw error;
  }
}

export async function getCachedRutinaById(id: string): Promise<RutinaDetail | null> {
  return unstable_cache(
    () => fetchRutinaById(id),
    ["rutina", id],
    {
      revalidate: 60,
      tags: [RUTINAS_CACHE_TAG],
    }
  )();
}

/**
 * Revalidate rutinas cache. Call this after creating/updating/deleting routines.
 */
export async function revalidateRutinasCache(): Promise<void> {
  const { revalidateTag } = await import("next/cache");
  revalidateTag(RUTINAS_CACHE_TAG, "max");
}
