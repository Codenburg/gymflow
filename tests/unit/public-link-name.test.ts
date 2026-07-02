import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizePublicLinkName,
  PUBLIC_LINK_NAME_CONFIRM_FIELD,
  PUBLIC_LINK_NAME_CONFIRM_MESSAGE,
  PUBLIC_LINK_NAME_FORM_FIELD,
  PUBLIC_LINK_NAME_RESERVED_MESSAGE,
  PUBLIC_LINK_NAME_TAKEN_MESSAGE,
  PUBLIC_LINK_NAME_REQUIRED_MESSAGE,
  publicLinkNameSchema,
} from "@/lib/tenants/slug";

const mockGetSession = vi.fn();
const mockIsAdmin = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockGymUpdate = vi.fn();
const mockRevalidateTag = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
  unstable_cache: (callback: () => unknown) => callback,
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
  isAdmin: (...args: unknown[]) => mockIsAdmin(...args),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    gym: {
      update: (...args: unknown[]) => mockGymUpdate(...args),
    },
    organization: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ session: { activeOrganizationId: "org-1" }, user: { id: "u-1" } });
  mockIsAdmin.mockResolvedValue(true);
  mockFindUnique.mockResolvedValue({ id: "org-1", slug: "gymflow-default" });
});

describe("public link name helpers", () => {
  it("normalizes friendly names into canonical path segments", () => {
    expect(normalizePublicLinkName(" Mi Gimnasio! ")).toBe("mi-gimnasio");
    expect(normalizePublicLinkName("Élite + Fit")).toBe("elite-fit");
    expect(normalizePublicLinkName("___")).toBe("");
  });

  it("rejects reserved and empty names with friendly copy", () => {
    expect(publicLinkNameSchema.safeParse("admin").success).toBe(false);
    const reserved = publicLinkNameSchema.safeParse("admin");
    expect(reserved.success).toBe(false);
    if (!reserved.success) {
      expect(reserved.error.issues[0]?.message).toBe(PUBLIC_LINK_NAME_RESERVED_MESSAGE);
    }

    const empty = publicLinkNameSchema.safeParse("!!!");
    expect(empty.success).toBe(false);
    if (!empty.success) {
      expect(empty.error.issues[0]?.message).toBe(PUBLIC_LINK_NAME_REQUIRED_MESSAGE);
    }
  });
});

describe("updateOrganizationSlug", () => {
  it("updates the active organization slug and invalidates tenant tags", async () => {
    mockUpdate.mockResolvedValue({ id: "org-1", slug: "mi-gimnasio" });

    const { updateOrganizationSlug } = await import("@/app/actions/gym");
    const formData = new FormData();
    formData.set(PUBLIC_LINK_NAME_FORM_FIELD, "Mi Gimnasio");
    formData.set(PUBLIC_LINK_NAME_CONFIRM_FIELD, "true");

    const result = await updateOrganizationSlug({ success: false }, formData);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { slug: "mi-gimnasio" },
    });
    expect(mockRevalidateTag).toHaveBeenCalledWith("tenant:gymflow-default", "max");
    expect(mockRevalidateTag).toHaveBeenCalledWith("tenant:mi-gimnasio", "max");
    expect(mockRevalidateTag).toHaveBeenCalledWith("tenant-org:org-1", "max");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/g/gymflow-default");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/g/mi-gimnasio");
    expect(mockGymUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ oldSlug: "gymflow-default", newSlug: "mi-gimnasio" });
  });

  it("rejects unauthenticated users before any public-link write", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const { updateOrganizationSlug } = await import("@/app/actions/gym");
    const formData = new FormData();
    formData.set(PUBLIC_LINK_NAME_FORM_FIELD, "Mi Gimnasio");
    formData.set(PUBLIC_LINK_NAME_CONFIRM_FIELD, "true");

    const result = await updateOrganizationSlug({ success: false }, formData);

    expect(mockIsAdmin).not.toHaveBeenCalled();
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockGymUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.message).toBe("Debes iniciar sesión");
  });

  it("rejects non-admin users before any public-link write", async () => {
    mockIsAdmin.mockResolvedValueOnce(false);

    const { updateOrganizationSlug } = await import("@/app/actions/gym");
    const formData = new FormData();
    formData.set(PUBLIC_LINK_NAME_FORM_FIELD, "Mi Gimnasio");
    formData.set(PUBLIC_LINK_NAME_CONFIRM_FIELD, "true");

    const result = await updateOrganizationSlug({ success: false }, formData);

    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockGymUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.message).toBe("No tienes permisos de administrador");
  });

  it("rejects users without an active organization before any public-link write", async () => {
    mockGetSession.mockResolvedValueOnce({
      session: { activeOrganizationId: undefined },
      user: { id: "u-1" },
    });

    const { updateOrganizationSlug } = await import("@/app/actions/gym");
    const formData = new FormData();
    formData.set(PUBLIC_LINK_NAME_FORM_FIELD, "Mi Gimnasio");
    formData.set(PUBLIC_LINK_NAME_CONFIRM_FIELD, "true");

    const result = await updateOrganizationSlug({ success: false }, formData);

    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockGymUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.message).toBe("No hay organización activa");
  });

  it("rejects reserved names before hitting the database", async () => {
    const { updateOrganizationSlug } = await import("@/app/actions/gym");
    const formData = new FormData();
    formData.set(PUBLIC_LINK_NAME_FORM_FIELD, "admin");
    formData.set(PUBLIC_LINK_NAME_CONFIRM_FIELD, "true");

    const result = await updateOrganizationSlug({ success: false }, formData);

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.errors?.[PUBLIC_LINK_NAME_FORM_FIELD]?.[0]).toBe(PUBLIC_LINK_NAME_RESERVED_MESSAGE);
  });

  it("requires confirmation when the normalized name changes", async () => {
    const { updateOrganizationSlug } = await import("@/app/actions/gym");
    const formData = new FormData();
    formData.set(PUBLIC_LINK_NAME_FORM_FIELD, "Mi Gimnasio");

    const result = await updateOrganizationSlug({ success: false }, formData);

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.errors?.[PUBLIC_LINK_NAME_CONFIRM_FIELD]?.[0]).toBe(PUBLIC_LINK_NAME_CONFIRM_MESSAGE);
  });

  it("maps duplicate names to friendly copy", async () => {
    mockUpdate.mockRejectedValue({ code: "P2002" });
    const { updateOrganizationSlug } = await import("@/app/actions/gym");
    const formData = new FormData();
    formData.set(PUBLIC_LINK_NAME_FORM_FIELD, "Mi Gimnasio");
    formData.set(PUBLIC_LINK_NAME_CONFIRM_FIELD, "true");

    const result = await updateOrganizationSlug({ success: false }, formData);

    expect(result.success).toBe(false);
    expect(result.errors?.[PUBLIC_LINK_NAME_FORM_FIELD]?.[0]).toBe(PUBLIC_LINK_NAME_TAKEN_MESSAGE);
  });
});
