/**
 * Unit tests for the gym display-field Zod schema.
 *
 * Covers:
 * - Each valid field variant
 * - Rejection of empty `nombre` (min 1)
 * - Rejection of non-URL strings for URL-shaped fields
 *   (mapsEmbedUrl, socialInstagram, socialWhatsapp)
 * - The structured `horarioJson` variant:
 *     - Valid HorarioSemanal object (stringified)
 *     - Valid null payload (stringified "null")
 *     - Rejection of malformed time format
 *     - Rejection of missing day keys
 *     - Rejection of non-JSON strings
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
  horarioDiaSchema,
  horarioSemanalSchema,
  type GymField,
  type GymFieldInput,
  type HorarioSemanal,
} from "@/lib/schemas";

const validUrl = "https://www.google.com/maps/embed?pb=abc123";
const anotherValidUrl = "https://wa.me/5491112345678";
const instagramUrl = "https://instagram.com/titanium";

const allDaysOpen: HorarioSemanal = {
  lun: { abierto: true, apertura: "08:00", cierre: "22:00" },
  mar: { abierto: true, apertura: "08:00", cierre: "22:00" },
  mie: { abierto: true, apertura: "08:00", cierre: "22:00" },
  jue: { abierto: true, apertura: "08:00", cierre: "22:00" },
  vie: { abierto: true, apertura: "08:00", cierre: "22:00" },
  sab: { abierto: true, apertura: "08:00", cierre: "22:00" },
  dom: { abierto: true, apertura: "08:00", cierre: "22:00" },
};

describe("gymFieldSchema — accepted fields", () => {
  it.each(GYM_FIELD_NAMES)("accepts a valid value for field=%s", (field) => {
    const value: Record<GymField, string> = {
      nombre: "Titanium Gym",
      horarioJson: JSON.stringify(allDaysOpen),
      direccion: "Av. Siempre Viva 742",
      mapsEmbedUrl: validUrl,
      socialInstagram: instagramUrl,
      socialWhatsapp: anotherValidUrl,
    };
    const result = gymFieldSchema.safeParse({ field, value: value[field] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.field).toBe(field);
      // horarioJson is the only field whose value is transformed
      // (JSON-parsed into an object). Other fields round-trip the
      // string verbatim.
      if (field === "horarioJson") {
        expect(result.data.value).toEqual(allDaysOpen);
      } else {
        expect(result.data.value).toBe(value[field]);
      }
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

describe("gymFieldSchema — empty direccion rejected", () => {
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

describe("horarioDiaSchema — per-day validation", () => {
  it("accepts an open day with valid times", () => {
    const result = horarioDiaSchema.safeParse({
      abierto: true,
      apertura: "08:00",
      cierre: "22:00",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a closed day with null times", () => {
    const result = horarioDiaSchema.safeParse({
      abierto: false,
      apertura: null,
      cierre: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid time format (HH:MM)", () => {
    const result = horarioDiaSchema.safeParse({
      abierto: true,
      apertura: "25:99",
      cierre: "22:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-24h time (e.g. 8:00 without leading zero)", () => {
    const result = horarioDiaSchema.safeParse({
      abierto: true,
      apertura: "8:00",
      cierre: "22:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing abierto field", () => {
    const result = horarioDiaSchema.safeParse({
      apertura: "08:00",
      cierre: "22:00",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a nullish apertura/cierre (permissive — form is the source of consistency)", () => {
    // The Zod schema is intentionally permissive: it does not enforce
    // "abierto=true → times present" because the WeeklyScheduleEditor
    // hides the time pickers when abierto=false (so the form always
    // emits consistent data). The schema accepts the shape, the form
    // is the consistency guarantee.
    const result = horarioDiaSchema.safeParse({ abierto: true });
    expect(result.success).toBe(true);
  });
});

describe("horarioSemanalSchema — weekly validation", () => {
  it("accepts a full 7-day schedule", () => {
    const result = horarioSemanalSchema.safeParse(allDaysOpen);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lun.abierto).toBe(true);
      expect(result.data.dom.apertura).toBe("08:00");
    }
  });

  it("rejects a schedule missing a required day key", () => {
    const partial = { ...allDaysOpen };
    delete (partial as Partial<HorarioSemanal>).mie;
    const result = horarioSemanalSchema.safeParse(partial);
    expect(result.success).toBe(false);
  });

  it("rejects a schedule with a malformed day entry", () => {
    const result = horarioSemanalSchema.safeParse({
      ...allDaysOpen,
      lun: { abierto: true, apertura: "25:99", cierre: "22:00" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty object (all 7 day keys required)", () => {
    const result = horarioSemanalSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("gymFieldSchema — horarioJson variant", () => {
  it("accepts a valid HorarioSemanal JSON string", () => {
    const result = gymFieldSchema.safeParse({
      field: "horarioJson",
      value: JSON.stringify(allDaysOpen),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // After Zod parse, the value is the parsed object (pipe to nullable schema).
      expect(result.data.value).toEqual(allDaysOpen);
    }
  });

  it("accepts a JSON-stringified null (clear schedule)", () => {
    const result = gymFieldSchema.safeParse({
      field: "horarioJson",
      value: "null",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBeNull();
    }
  });

  it("rejects malformed JSON", () => {
    const result = gymFieldSchema.safeParse({
      field: "horarioJson",
      value: "{not valid json",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("horarioJson debe ser JSON válido");
    }
  });

  it("rejects a JSON object that fails horarioSemanalSchema (missing days)", () => {
    const result = gymFieldSchema.safeParse({
      field: "horarioJson",
      value: JSON.stringify({ lun: { abierto: true, apertura: "08:00", cierre: "22:00" } }),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a JSON object with invalid time format", () => {
    const invalid = {
      ...allDaysOpen,
      lun: { abierto: true, apertura: "25:99", cierre: "22:00" },
    };
    const result = gymFieldSchema.safeParse({
      field: "horarioJson",
      value: JSON.stringify(invalid),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-object JSON value (e.g. a number)", () => {
    const result = gymFieldSchema.safeParse({
      field: "horarioJson",
      value: "42",
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
