import { z } from "zod";

export const PUBLIC_LINK_NAME_FORM_FIELD = "publicLinkName";
export const PUBLIC_LINK_NAME_CONFIRM_FIELD = "confirmPublicLinkChange";

export const PUBLIC_LINK_NAME_REQUIRED_MESSAGE = "Ingresá un nombre para tu sitio público";
export const PUBLIC_LINK_NAME_RESERVED_MESSAGE =
  "Ese nombre no se puede usar. Elegí otro nombre para tu sitio público.";
export const PUBLIC_LINK_NAME_TAKEN_MESSAGE = "Este nombre ya está ocupado";
export const PUBLIC_LINK_NAME_TOO_LONG_MESSAGE =
  "Usá un nombre más corto para tu sitio público";
export const PUBLIC_LINK_NAME_CONFIRM_MESSAGE =
  "Marcá la casilla para confirmar el cambio del enlace público.";

const RESERVED_PUBLIC_LINK_NAMES = new Set([
  "admin",
  "api",
  "auth",
  "g",
  "login",
  "logout",
  "register",
  "signup",
  "www",
]);

export function normalizePublicLinkName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function isReservedPublicLinkName(value: string): boolean {
  return RESERVED_PUBLIC_LINK_NAMES.has(value);
}

export const publicLinkNameSchema = z
  .string({ error: PUBLIC_LINK_NAME_REQUIRED_MESSAGE })
  .transform(normalizePublicLinkName)
  .refine((value) => value.length > 0, { error: PUBLIC_LINK_NAME_REQUIRED_MESSAGE })
  .refine((value) => value.length <= 80, { error: PUBLIC_LINK_NAME_TOO_LONG_MESSAGE })
  .refine((value) => !isReservedPublicLinkName(value), {
    error: PUBLIC_LINK_NAME_RESERVED_MESSAGE,
  });
