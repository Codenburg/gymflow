import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";
import bcrypt from "bcrypt";
import prisma from "./prisma";
import type { Role } from "../../generated/client";

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
  // Plugin de username para iniciar sesión con DNI
  plugins: [
    username(),
  ],
  // Disable public sign-up - only admins can create users via internal APIs
  disabledPaths: ["/sign-up/email"],
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "USER",
      },
    },
  },
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

// Session user type with role
export interface SessionUser {
  id: string;
  name: string;
  email: string | null;
  emailVerified: boolean;
  image: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

// Role helper functions
export function isAdmin(session: Session | null): boolean {
  return session?.user?.role === "ADMIN";
}

export function isTrainer(session: Session | null): boolean {
  return session?.user?.role === "TRAINER";
}

export function isAdminOrTrainer(session: Session | null): boolean {
  const role = session?.user?.role;
  return role === "ADMIN" || role === "TRAINER";
}

export function hasRole(session: Session | null, role: Role): boolean {
  return session?.user?.role === role;
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
