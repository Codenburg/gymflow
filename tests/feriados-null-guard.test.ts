/**
 * Unit tests for the formData.get("id") null-guard in feriados actions.
 *
 * Regression: before the null-guard, the cast `as string` masked a `null`
 * return from `FormData.get`. `idSchema.safeParse(null)` then failed with
 * the generic "ID de feriado inválido" message, indistinguishable from
 * a malformed UUID. The new null-guard returns a dedicated
 * "ID de feriado requerido" message when the field is absent.
 *
 * Covers the 2 sites in `src/app/actions/feriados.ts`:
 *   - updateFeriado (was line 156)
 *   - deleteFeriado (was line 274)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock heavy dependencies BEFORE importing the action module.
// The pre-check returns early on the null-guard, so prisma/auth are
// never reached — but their imports must still resolve, so we provide
// no-op stubs to keep the test hermetic.
vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

const mockGetSession = vi.fn()
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}))

vi.mock("@/lib/prisma", () => ({
  default: {
    feriado: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

// Import AFTER mocks are registered.
import { updateFeriado, deleteFeriado } from "@/app/actions/feriados"

describe("feriados actions - null-guard on formData.get(id)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN" },
    })
  })

  it("updateFeriado returns 'ID de feriado requerido' when the id field is missing", async () => {
    const formData = new FormData()
    // Deliberately do NOT append "id"
    formData.append("fecha", "2026-12-25")

    const result = await updateFeriado(
      {} as Parameters<typeof updateFeriado>[0],
      formData,
    )

    expect(result.success).toBe(false)
    expect(result.message).toBe("ID de feriado requerido")
  })

  it("deleteFeriado returns 'ID de feriado requerido' when the id field is missing", async () => {
    const formData = new FormData()
    // Deliberately do NOT append "id"

    const result = await deleteFeriado(
      {} as Parameters<typeof deleteFeriado>[0],
      formData,
    )

    expect(result.success).toBe(false)
    expect(result.message).toBe("ID de feriado requerido")
  })
})
