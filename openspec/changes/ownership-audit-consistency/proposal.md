# Proposal: Ownership Audit Consistency

## Intent

Complete the ownership audit trail model to ensure data consistency, query performance, and business logic integrity. The `OwnershipTransfer` table must reliably track every routine's creation and ownership changes, with proper database indexes for query performance.

**Why this matters**: Currently, routines created via `createRutina` and `createRutinaCompleta` do not log an `OwnershipTransfer` record, breaking the audit trail. Additionally, soft-delete queries on `User.deletedAt` lack index support, and the ownership history returns newest-first instead of creation-first.

## Scope

### In Scope
- Add `@@index([deletedAt])` to User model for soft-delete query performance
- Verify `@@index([rutinaId])` exists on OwnershipTransfer (confirmed: line 160 in schema.prisma)
- Update `createRutina` action to auto-log creation to OwnershipTransfer within same transaction
- Update `createRutinaCompleta` action to auto-log creation to OwnershipTransfer within same transaction
- Update `transferRutinasOwnership` to validate `toUserId.deletedAt = null` (already implemented, verify correctness)
- Change `getRutinaOwnershipHistory` ordering from `desc` to `asc`

### Out of Scope
- Database triggers (application-level only)
- Admin UI for ownership history
- `duplicateRutina` audit logging (separate concern)

## Approach

### 1. Prisma Schema Update

Add index on `User.deletedAt`:

```prisma
model User {
  // ... existing fields ...
  deletedAt DateTime? @db.Timestamp

  @@index([deletedAt])  // ADD THIS
}
```

### 2. Transaction-Based Audit Logging

Both `createRutina` and `createRutinaCompleta` must log initial ownership within the same transaction as routine creation:

```typescript
// In createRutina, replace simple create with:
const rutina = await prisma.$transaction(async (tx) => {
  const newRutina = await tx.rutina.create({
    data: {
      ...parsed.data,
      creadorId: user.id,
    },
  });

  // Log initial ownership (fromUserId = null means creation)
  await tx.ownershipTransfer.create({
    data: {
      rutinaId: newRutina.id,
      fromUserId: null,
      toUserId: user.id,
    },
  });

  return newRutina;
});
```

### 3. Ownership History Ordering Fix

```typescript
// In getRutinaOwnershipHistory, change:
orderBy: { createdAt: 'desc' }  // OLD
// to:
orderBy: { createdAt: 'asc' }   // NEW
```

First record will now be creation event.

### 4. Verify toUserId Validation

Confirm `transferRutinasOwnership` checks target user is not soft-deleted:

```typescript
const targetUser = await prisma.user.findFirst({
  where: { 
    id: toUserId,
    deletedAt: null,  // This check exists - verify it prevents transfers to deleted users
  },
});
```

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add `@@index([deletedAt])` to User model |
| `prisma/migrations/` | New | Migration for index on User.deletedAt |
| `src/app/actions/rutinas.ts` | Modified | Auto-log OwnershipTransfer in createRutina, createRutinaCompleta |
| `src/app/actions/users.ts` | Modified | Change getRutinaOwnershipHistory ordering to ASC |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing routines lack OwnershipTransfer record | **High** | Migration or seed script to backfill creation records |
| Race condition on concurrent routine creation | Low | PostgreSQL transaction isolation handles this |
| `duplicateRutina` not logging transfers | Medium | Acceptable - not in scope, can be addressed separately |

## Rollback Plan

1. Revert migration to remove `@@index([deletedAt])`
2. Remove OwnershipTransfer.create calls from createRutina and createRutinaCompleta
3. Revert getRutinaOwnershipHistory ordering to `desc`
4. Re-run migrations

**Estimated rollback time**: ~15 minutes (migration + code revert)

## Dependencies

- Prisma migration tooling (`npx prisma migrate dev`)
- Existing OwnershipTransfer table (from user-soft-delete-ownership-audit change)

## Success Criteria

- [x] User queries filtering `deletedAt` perform well with index (EXPLAIN ANALYZE)
- [x] Every new routine has at least one OwnershipTransfer record (fromUserId = null)
- [x] `getRutinaOwnershipHistory` returns creation record first (createdAt ASC)
- [x] Transfers to soft-deleted users are rejected with clear error message
- [x] Migration is reversible without data loss
