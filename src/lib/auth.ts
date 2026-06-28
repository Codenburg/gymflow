import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username, organization } from "better-auth/plugins";
import bcrypt from "bcrypt";
import prisma from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    // Validar DNI como username (7-8 dígitos)
    emailValidator: (email: string) => {
      // Por ahora aceptamos cualquier email válido
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
    password: {
      hash: async (password) => {
        return await bcrypt.hash(password, 12);
      },
      verify: async ({ hash, password }) => {
        return await bcrypt.compare(password, hash);
      },
    },
  },
  // Plugins: username + organization (multi-tenant)
  plugins: [
    username(),
    organization({
      // Only super-admins (isSuperAdmin) can create organizations
      allowUserToCreateOrganization: async (user) => {
        return (user as any)?.isSuperAdmin === true;
      },
    }),
  ],
  user: {
    // isSuperAdmin is already defined in the Prisma schema @default(false)
    // No additional fields needed — Better Auth infers all User columns
    // from the Prisma model via the adapter.
  },
  // Disable public sign-up - only admins can create users via internal APIs
  disabledPaths: ["/sign-up/email"],
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

// ============================================================
//  LEGACY ROLE HELPERS — will be rewritten in Step 3
//  These check user.role via `as any` because the `role` column
//  has been REMOVED from the DB schema. They always return false
//  at runtime (fail-closed), which is acceptable temporarily.
//  In Step 3 they become async and use Member.role instead.
// ============================================================

export function isAdmin(session: Session | null): boolean {
  return (session?.user as any)?.role === "ADMIN";
}

export function isTrainer(session: Session | null): boolean {
  return (session?.user as any)?.role === "TRAINER";
}

export function isAdminOrTrainer(session: Session | null): boolean {
  return (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "TRAINER";
}

export function hasRole(session: Session | null, role: string): boolean {
  return (session?.user as any)?.role === role;
}

export function verifyAdmin(session: Session | null): void {
  if (!isAdmin(session)) {
    throw new Error("Unauthorized: Admin access required");
  }
}

export function verifyTrainer(session: Session | null): void {
  if (!isTrainer(session)) {
    throw new Error("Unauthorized: Trainer access required");
  }
}

export function verifyAdminOrTrainer(session: Session | null): void {
  if (!isAdminOrTrainer(session)) {
    throw new Error("Unauthorized: Admin or Trainer access required");
  }
}
