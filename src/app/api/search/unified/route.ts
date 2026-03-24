import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const MAX_AUTOCOMPLETE_RESULTS = 5;

interface RutinaSearchResult {
  id: string;
  nombre: string;
  creadorUser: { id: string; name: string } | null;
}

interface TrainerResult {
  nombre: string;
  count: number;
}

/**
 * GET /api/search/unified
 * Returns unified search results for autocomplete
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  // Validate query
  if (!query.trim()) {
    return NextResponse.json({
      rutinas: [],
      trainers: [],
    });
  }

  try {
    // Fetch all routines with creator info (lightweight query for autocomplete)
    const rutinas: RutinaSearchResult[] = await prisma.rutina.findMany({
      select: {
        id: true,
        nombre: true,
        creadorUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        nombre: "asc",
      },
    });

    // Filter by query (match against nombre or creadorUser.name)
    const lowerQuery = query.toLowerCase().trim();
    const filteredRutinas = rutinas.filter(
      (r) =>
        r.nombre.toLowerCase().includes(lowerQuery) ||
        r.creadorUser?.name.toLowerCase().includes(lowerQuery)
    );

    // Get top results
    const topRutinas = filteredRutinas.slice(0, MAX_AUTOCOMPLETE_RESULTS).map((r) => ({
      id: r.id,
      nombre: r.nombre,
    }));

    // Group by trainer (using creadorUser.name)
    const trainerMap = new Map<string, number>();
    for (const rutina of rutinas) {
      if (rutina.creadorUser?.name) {
        const current = trainerMap.get(rutina.creadorUser.name) || 0;
        trainerMap.set(rutina.creadorUser.name, current + 1);
      }
    }
    const allTrainers: TrainerResult[] = Array.from(trainerMap.entries())
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count || a.nombre.localeCompare(b.nombre));
    const topTrainers = allTrainers.slice(0, MAX_AUTOCOMPLETE_RESULTS);

    // Check if no results
    const hasResults = topRutinas.length > 0 || topTrainers.length > 0;

    return NextResponse.json({
      rutinas: topRutinas,
      trainers: topTrainers,
      ...(!hasResults && {
        message: `No se encontraron resultados para '${query}'. Prueba con términos más cortos o diferentes.`,
      }),
    });
  } catch (error) {
    console.error("Failed to fetch unified search results:", error);

    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again later." },
      { status: 500 }
    );
  }
}
