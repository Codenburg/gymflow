# Proposal: User Soft Delete & Ownership Audit Trail

## Intent

Implement soft delete on the User model, add an ownership transfer audit trail, enforce unique routine names per user, and prevent implicit cascade deletions. This closes the data integrity model for the User-Rutina relationship.

**Why this matters**: Currently, deleting a user requires transferring their rutinas to another user, but there's no audit trail of ownership changes. Additionally, there's no enforcement that routine names must be unique per user (not globally). Soft delete preserves historical integrity while allowing user deactivation without data loss.

## Scope

### In Scope
- Prisma schema updates: `User.deletedAt`, `OwnershipTransfer` table, unique index on `(creadorId, nombre)`
- Migration scripts
- Update `deleteUser` action to perform soft delete instead of physical delete
- Create `transferRutinasOwnership` that logs transfers to the audit table
- Add application-level guard to prevent direct `creadorId` updates outside of `transferRutinasOwnership`
- Update all User queries to filter `deletedAt IS NULL` for active users only

### Out of Scope
- Admin UI for soft-deleted user recovery
- Historical views that include deleted users
- Better Auth session/account cleanup on soft delete (Better Auth handles this separately)
- Database triggers for `creadorId` protection (application-level only)

## Approach

### 1. Prisma Schema Changes

#### User Model — Add `deletedAt`
```prisma
model User {
  // ... existing fields ...
  deletedAt DateTime?  // NULL = active, timestamp = soft-deleted
  
  // Add relation for ownership transfers
  outgoingTransfers OwnershipTransfer[] @relation("FromUser")
  incomingTransfers OwnershipTransfer[] @relation("ToUser")
}
```

#### New `OwnershipTransfer` Audit Table
```prisma
model OwnershipTransfer {
  id          String   @id @default(uuid())
  rutinaId    String   @db.Uuid
  fromUserId  String?  @db.Uuid  // NULL for initial creation
  toUserId    String   @db.Uuid
  timestamp   DateTime @default(now())
  
  rutina     Rutina @relation(fields: [rutinaId], references: [id], onDelete: Cascade)
  fromUser   User?  @relation("FromUser", fields: [fromUserId], references: [id])
  toUser     User   @relation("ToUser", fields: [toUserId], references: [id])
}
```

#### Unique Index on `(creadorId, nombre)`
```prisma
model Rutina {
  // ... existing fields ...
  
  @@unique([creadorId, nombre], name: "Rutina_unique_nombre_por_user")
}
```

### 2. Modified `deleteUser` Action

**Current behavior**: Physical delete with optional pre-transfer
**New behavior**: Soft delete only

```typescript
export async function deleteUser(
  userIdToDelete: string,
  transferTargetId?: string
): Promise<{ success: boolean; message: string }> {
  // ... auth checks remain same ...
  
  // Check if user has rutinas
  const rutinasCount = await prisma.rutina.count({
    where: { creadorId: userIdToDelete },
  });

  if (rutinasCount > 0) {
    if (!transferTargetId) {
      return {
        success: false,
        message: `El usuario tiene ${rutinasCount} rutina(s). Proporciona transferTargetId.`,
      };
    }
    // Transfer with audit logging
    await transferRutinasOwnership(userIdToDelete, transferTargetId);
  }

  // SOFT DELETE instead of physical delete
  await prisma.user.update({
    where: { id: userIdToDelete },
    data: { deletedAt: new Date() },
  });
  
  return { success: true, message: "Usuario desactivado correctamente" };
}
```

### 3. Modified `transferRutinasOwnership` with Audit Logging

```typescript
async function transferRutinasOwnership(
  fromUserId: string,
  toUserId: string
): Promise<number> {
  // Get all rutinas being transferred
  const rutinas = await prisma.rutina.findMany({
    where: { creadorId: fromUserId },
    select: { id: true, nombre: true },
  });

  // Use transaction to:
  // 1. Update creadorId
  // 2. Log each transfer to OwnershipTransfer
  return prisma.$transaction(async (tx) => {
    let transferred = 0;
    for (const rutina of rutinas) {
      await tx.rutina.update({
        where: { id: rutina.id },
        data: { creadorId: toUserId },
      });
      
      await tx.ownershipTransfer.create({
        data: {
          rutinaId: rutina.id,
          fromUserId: fromUserId,
          toUserId: toUserId,
          timestamp: new Date(),
        },
      });
      transferred++;
    }
    return transferred;
  });
}
```

### 4. Prevent Direct `creadorId` Updates

Since Prisma doesn't have built-in trigger support, we'll use an application-level guard:

```typescript
// In createRutina and updateRutina actions
async function validateCreadorIdChange(rutinaId: string, newCreadorId: string) {
  const rutina = await prisma.rutina.findUnique({
    where: { id: rutinaId },
    select: { creadorId: true },
  });
  
  // If creadorId is changing and it's NOT through transferRutinasOwnership, block it
  if (rutina && rutina.creadorId !== newCreadorId) {
    throw new Error("No se puede cambiar el creador de una rutina directamente. Usa transferRutinasOwnership.");
  }
}
```

### 5. Audit Log for Initial Routine Creation

The `OwnershipTransfer` table logs **all** ownership events, including initial creation:

```typescript
// In createRutina action, after creating the rutina:
await prisma.ownershipTransfer.create({
  data: {
    rutinaId: newRutina.id,
    fromUserId: null,  // null = initial creation
    toUserId: creadorId,
    timestamp: new Date(),
  },
});
```

### 6. Update All User Queries

All queries must filter `deletedAt IS NULL`:

```typescript
// Example: listUsers
prisma.user.findMany({
  where: { deletedAt: null },  // ADD THIS
  select: { id: true, name: true, ... },
});

// Example: getUserDetails
prisma.user.findUnique({
  where: { id: userId, deletedAt: null },  // ADD deletedAt filter
  select: { ... },
});
```

Files to audit and update:
- `src/app/actions/users.ts` — all functions
- Any API routes querying users
- Any server components/actions querying users

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add `deletedAt`, `OwnershipTransfer`, unique index |
| `prisma/migrations/` | New | Migration for schema changes |
| `src/app/actions/users.ts` | Modified | Soft delete, audit logging |
| All user query sites | Modified | Add `deletedAt: null` filter |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing queries not updated to filter `deletedAt` | **High** | Audit all query sites; add TODO comments as markers |
| Race condition on unique index | Low | PostgreSQL handles concurrent inserts; one will fail and return error |
| Application-level `creadorId` guard bypassed via direct DB access | Low | Acceptable for this project's scope; documented as limitation |
| Soft-deleted user still appears in dropdowns/selects | Medium | Ensure all user-listing functions include `deletedAt` filter |

## Rollback Plan

1. Revert migration to remove `deletedAt` column and `OwnershipTransfer` table
2. Restore physical delete in `deleteUser` action:
   ```typescript
   await prisma.user.delete({ where: { id: userIdToDelete } });
   ```
3. Remove `deletedAt` filter from queries
4. Remove audit logging from `transferRutinasOwnership`

**Estimated rollback time**: ~30 minutes (migration + code changes)

## Success Criteria

- [x] User with rutinas cannot be physically deleted (soft delete implemented)
- [x] All routines have unique `(creadorId, nombre)` combination (migration applied)
- [x] Ownership transfers are auditable via `OwnershipTransfer` table
- [x] Deleted users don't appear in any user listing or dropdown (queries updated)
- [x] No implicit cascade deletions possible (ON DELETE RESTRICT on FK)
- [x] TypeScript types updated to reflect `deletedAt?: DateTime` on User
- [x] Migration is idempotent (can run multiple times safely)
- [x] `transferRutinasOwnership` returns count and logs all transfers atomically
