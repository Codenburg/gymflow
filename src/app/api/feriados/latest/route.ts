import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// FORCE DYNAMIC: Never cache this endpoint - always fetch fresh data
export const dynamic = "force-dynamic";

/**
 * GET /api/feriados/latest
 * Returns the creation date of the most recently created Feriado.
 *
 * Response 200:
 * - { latestFeriadoDate: string | null }
 *   - string: ISO 8601 date of the most recently created Feriado
 *   - null: no feriados exist in the system
 *
 * Response 500:
 * - { latestFeriadoDate: null } with error logging
 */
export async function GET(): Promise<NextResponse> {
  try {
    const latest = await prisma.feriado.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    return NextResponse.json({
      latestFeriadoDate: latest?.createdAt.toISOString() ?? null,
    });
  } catch (error) {
    console.error("[GET /api/feriados/latest] Error:", error);
    return NextResponse.json({ latestFeriadoDate: null });
  }
}
