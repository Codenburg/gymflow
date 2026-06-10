/**
 * Unit tests for the gym display-field Zod schema.
 *
 * Covers:
 * - Each valid field variant
 * - Rejection of empty `nombre` (min 1)
 * - Rejection of non-URL strings for URL-shaped fields
 *   (mapsEmbedUrl, socialInstagram, socialWhatsapp)
 * - Rejection of unknown `field` discriminant (discriminated-union
 *   contract guarantees a single error per miss)
 * - Length caps on string fields
 *
 * Mirrors the test style of tests/promocion-schemas.test.ts.
 */

import { describe, it, expect } from "vitest";
import {
  gymFieldSchema,
  GYM_FIELD_NAMES,
  type GymField,
  type GymFieldInput,
} from "@/lib/schemas";

const validUrl = "https://www.google.com/maps/embed?pb=abc123";
const anotherValidUrl = "https://wa.me/5491112345678";
const instagramUrl = "https://instagram.com/titanium";

describe("gymFieldSchema — accepted fields", () => {
  it.each(GYM_FIELD_NAMES)("accepts a valid value for field=%s", (field) => {
    const value: Record<GymField, string> = {
      nombre: "Titanium Gym",
      horario: "Lun-Vie 7:00-22:00",
      direccion: "Av. Siempre Viva 742",
      mapsEmbedUrl: validUrl,
      socialInstagram: instagramUrl,
      socialWhatsapp: anotherValidUrl,
    };
    const result = gymFieldSchema.safeParse({ field, value: value[field] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.field).toBe(field);
      expect(result.data.value).toBe(value[field]);
    }
  });
});

describe("gymFieldSchema — trims whitespace on string fields", () => {
  it("trims leading/trailing whitespace for nombre", () => {
    const result = gymFieldSchema.safeParse({
      field: "nombre",
      value: "  Titanium Gym  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe("Titanium Gym");
    }
  });

  it("trims whitespace for direccion", () => {
    const result = gymFieldSchema.safeParse({
      field: "direccion",
      value: "  Av. Siempre Viva 742  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe("Av. Siempre Viva 742");
    }
  });
});

describe("gymFieldSchema — empty nombre rejected", () => {
  it("rejects an empty string for nombre", () => {
    const result = gymFieldSchema.safeParse({ field: "nombre", value: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("El nombre no puede estar vacío");
    }
  });

  it("rejects a whitespace-only string for nombre (trim then empty)", () => {
    const result = gymFieldSchema.safeParse({ field: "nombre", value: "   " });
    expect(result.success).toBe(false);
  });
});

describe("gymFieldSchema — empty values for OTHER string fields are rejected", () => {
  it("rejects empty horario", () => {
    const result = gymFieldSchema.safeParse({ field: "horario", value: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty direccion", () => {
    const result = gymFieldSchema.safeParse({ field: "direccion", value: "" });
    expect(result.success).toBe(false);
  });
});

describe("gymFieldSchema — non-URL rejected for URL fields", () => {
  it("rejects a non-URL string for mapsEmbedUrl", () => {
    const result = gymFieldSchema.safeParse({
      field: "mapsEmbedUrl",
      value: "not-a-url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("URL de mapa inválida");
    }
  });

  it("rejects a non-URL string for socialInstagram", () => {
    const result = gymFieldSchema.safeParse({
      field: "socialInstagram",
      value: "instagram/titanium",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("URL de Instagram inválida");
    }
  });

  it("rejects a non-URL string for socialWhatsapp", () => {
    const result = gymFieldSchema.safeParse({
      field: "socialWhatsapp",
      value: "5491112345678",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("URL de WhatsApp inválida");
    }
  });

  it("accepts a valid URL for mapsEmbedUrl", () => {
    const result = gymFieldSchema.safeParse({
      field: "mapsEmbedUrl",
      value: validUrl,
    });
    expect(result.success).toBe(true);
  });
});

describe("gymFieldSchema — length caps", () => {
  it("rejects nombre longer than 80 chars", () => {
    const result = gymFieldSchema.safeParse({
      field: "nombre",
      value: "a".repeat(81),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("El nombre no puede superar 80 caracteres");
    }
  });

  it("accepts nombre exactly 80 chars", () => {
    const result = gymFieldSchema.safeParse({
      field: "nombre",
      value: "a".repeat(80),
    });
    expect(result.success).toBe(true);
  });

  it("rejects mapsEmbedUrl longer than 2000 chars", () => {
    // Build a URL whose total length exceeds 2000 chars.
    const longUrl = `https://example.com/${"a".repeat(1990)}`;
    const result = gymFieldSchema.safeParse({
      field: "mapsEmbedUrl",
      value: longUrl,
    });
    expect(result.success).toBe(false);
  });
});

describe("gymFieldSchema — unknown discriminant rejected", () => {
  it("rejects an unknown field discriminant", () => {
    const result = gymFieldSchema.safeParse({
      field: "notARealField",
      value: "anything",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing field key", () => {
    const result = gymFieldSchema.safeParse({ value: "anything" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing value key", () => {
    const result = gymFieldSchema.safeParse({ field: "nombre" });
    expect(result.success).toBe(false);
  });
});

describe("gymFieldSchema — non-string value rejected", () => {
  it("rejects a number value for nombre", () => {
    const result = gymFieldSchema.safeParse({
      field: "nombre",
      value: 123 as unknown as string,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a null value for mapsEmbedUrl", () => {
    const result = gymFieldSchema.safeParse({
      field: "mapsEmbedUrl",
      value: null as unknown as string,
    });
    expect(result.success).toBe(false);
  });
});

describe("GymFieldInput type contract", () => {
  it("narrows the discriminant correctly for valid input", () => {
    const result = gymFieldSchema.safeParse({
      field: "nombre",
      value: "Titanium",
    });
    if (result.success) {
      // Type-level check: discriminant is one of the literal field names.
      const input: GymFieldInput = result.data;
      expect(input.field).toBe("nombre");
      expect(input.value).toBe("Titanium");
    }
  });
});
