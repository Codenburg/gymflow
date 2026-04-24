"use server";

import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Transfer ownership of all rutinas from one user to another.
 * Logs each transfer to the OwnershipTransfer audit table.
 * 
 * @param fromUserId - The user whose rutinas will be transferred
 * @param toUserId - The user who will become the new owner
 * @returns Object with count of transferred rutinas
 */
export async function transferRutinasOwnership(
  fromUserId: string,
  toUserId: string
): Promise<{ success: boolean; message: string; transferredCount?: number }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { success: false, message: "Debes iniciar sesión" };
  }
  if (session.user.role !== "ADMIN") {
    return { success: false, message: "No tienes permisos de administrador" };
  }

  // Validate target user exists and is not deleted
  const targetUser = await prisma.user.findFirst({
    where: { 
      id: toUserId,
      deletedAt: null,
    },
  });
  if (!targetUser) {
    return { success: false, message: "Usuario destino no encontrado o eliminado" };
  }

  // Get all rutinas owned by fromUserId
  const rutinas = await prisma.rutina.findMany({
    where: { creadorId: fromUserId },
    select: { id: true, nombre: true },
  });

  if (rutinas.length === 0) {
    return { success: true, message: "No había rutinas para transferir", transferredCount: 0 };
  }

  // Transfer ownership within a transaction and log each transfer
  await prisma.$transaction(async (tx) => {
    for (const rutina of rutinas) {
      // Update the rutina's creadorId
      await tx.rutina.update({
        where: { id: rutina.id },
        data: { creadorId: toUserId },
      });

      // Log the transfer to audit table
      await tx.ownershipTransfer.create({
        data: {
          rutinaId: rutina.id,
          fromUserId: fromUserId,
          toUserId: toUserId,
        },
      });
    }
  });

  return {
    success: true,
    message: `Transferidas ${rutinas.length} rutina(s) a ${targetUser.name}`,
    transferredCount: rutinas.length,
  };
}

/**
 * Soft delete a user by setting deletedAt timestamp.
 * 
 * If the user has rutinas:
 * - Requires transferTargetId parameter
 * - Transfers all rutinas to the target user before soft delete
 * 
 * If the user has no rutinas:
 * - Soft deletes directly
 * 
 * If user is already soft-deleted:
 * - Returns error
 * 
 * Requires admin privileges.
 */
export async function deleteUser(
  userIdToDelete: string,
  transferTargetId?: string
): Promise<{ success: boolean; message: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { success: false, message: "Debes iniciar sesión" };
  }
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, message: "No tienes permisos de administrador" };
  }

  // Cannot delete yourself
  if (session.user.id === userIdToDelete) {
    return { success: false, message: "No puedes eliminarte a ti mismo" };
  }

  // Check if user exists and is not already deleted
  const userToDelete = await prisma.user.findFirst({
    where: { id: userIdToDelete },
  });

  if (!userToDelete) {
    return { success: false, message: "Usuario no encontrado" };
  }

  if (userToDelete.deletedAt !== null) {
    return { success: false, message: "El usuario ya está eliminado" };
  }

  // Verify target user exists and is not deleted (if transfer is specified)
  if (transferTargetId) {
    const targetUser = await prisma.user.findFirst({
      where: {
        id: transferTargetId,
        deletedAt: null,
      },
    });
    if (!targetUser) {
      return { success: false, message: "Usuario destino no encontrado o eliminado" };
    }
  }

  // Check if user has rutinas
  const rutinasCount = await prisma.rutina.count({
    where: { creadorId: userIdToDelete },
  });

  if (rutinasCount > 0) {
    // User has rutinas - transfer is required
    if (!transferTargetId) {
      return {
        success: false,
        message: `El usuario tiene ${rutinasCount} rutina(s). Proporciona transferTargetId para transferir la propiedad antes de eliminar.`,
      };
    }

    // Transfer ownership
    const transferResult = await transferRutinasOwnership(userIdToDelete, transferTargetId);
    if (!transferResult.success) {
      return transferResult;
    }
  }

  // Soft delete the user by setting deletedAt
  try {
    await prisma.user.update({
      where: { id: userIdToDelete },
      data: { deletedAt: new Date() },
    });
    return { success: true, message: "Usuario eliminado correctamente" };
  } catch (error: unknown) {
    console.error("[deleteUser] Error soft-deleting user:", error);
    return { success: false, message: "Error al eliminar el usuario" };
  }
}

/**
 * Get user details including their rutinas count.
 * Does NOT return soft-deleted users.
 * Admin only.
 */
export async function getUserDetails(userId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return null;
  }
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null, // Only active users
    },
    select: {
      id: true,
      name: true,
      dni: true,
      email: true,
      role: true,
      banned: true,
      createdAt: true,
      _count: {
        select: {
          rutinas: true,
        },
      },
    },
  });

  return user;
}

/**
 * List all users with their rutinas count.
 * Does NOT include soft-deleted users.
 * Admin only.
 */
export async function listUsers() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return [];
  }
  if (!session || session.user.role !== "ADMIN") {
    return [];
  }

  return prisma.user.findMany({
    where: {
      deletedAt: null, // Only active users
    },
    select: {
      id: true,
      name: true,
      dni: true,
      email: true,
      role: true,
      banned: true,
      createdAt: true,
      _count: {
        select: {
          rutinas: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Get ownership transfer history for a specific rutina.
 * Admin only.
 */
export async function getRutinaOwnershipHistory(rutinaId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return [];
  }
  if (!session || session.user.role !== "ADMIN") {
    return [];
  }

  return prisma.ownershipTransfer.findMany({
    where: { rutinaId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      fromUserId: true,
      toUserId: true,
      createdAt: true,
      fromUser: {
        select: { id: true, name: true },
      },
      toUser: {
        select: { id: true, name: true },
      },
    },
  });
}
