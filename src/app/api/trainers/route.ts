import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/trainers
 * Returns a list of trainers with their routine counts
 */
export async function GET(
  _request: NextRequest
): Promise<NextResponse> {
  try {
    // Get all unique creators with their routine counts using Prisma
    const trainers = await prisma.rutina.groupBy({
      by: ['creadorId'],
      _count: {
        id: true,
      },
    });

    // Fetch user names for the creator IDs
    const creadorIds = trainers.map(t => t.creadorId);
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: creadorIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u.name]));

    // Transform to the expected format
    const response = trainers
      .map((t) => ({
        nombre: userMap.get(t.creadorId) || 'Unknown',
        count: t._count.id,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch trainers:", error);

    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again later." },
      { status: 500 }
    );
  }
}
