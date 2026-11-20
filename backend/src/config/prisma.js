import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaClient } from '@prisma/client';

// Per-request tenant context. Populated by `authenticate` (middlewares/auth.js).
export const schoolContext = new AsyncLocalStorage();

// Models that are NOT tenant-scoped.
const UNSCOPED_MODELS = new Set(['School']);

// Operations that require a unique `where` and cannot be injected with `schoolId`.
// We reject them so any callsite that would leak across schools fails loudly.
const FORBIDDEN_OPS = new Set(['findUnique', 'findUniqueOrThrow', 'upsert']);

// Operations that accept a `where` clause.
const WHERE_OPS = new Set([
  'findFirst', 'findFirstOrThrow', 'findMany',
  'update', 'updateMany', 'delete', 'deleteMany',
  'aggregate', 'count', 'groupBy',
]);

const rawClient = new PrismaClient();

export const prisma = rawClient.$extends({
  name: 'schoolIsolation',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || UNSCOPED_MODELS.has(model)) {
          return query(args);
        }

        if (FORBIDDEN_OPS.has(operation)) {
          throw new Error(
            `[tenancy] ${model}.${operation} is forbidden: use findFirst with a school filter ` +
            `(schoolId is injected automatically by the extension).`,
          );
        }

        const ctx = schoolContext.getStore();
        if (!ctx) {
          throw new Error(
            `[tenancy] Refusing ${model}.${operation}: no request context. ` +
            `Wrap the call in schoolContext.run({ schoolId, ... }, ...) or use platformPrisma.`,
          );
        }

        // SUPER_ADMIN has no school: must use platformPrisma for any scoped model.
        if (ctx.role === 'SUPER_ADMIN' && ctx.schoolId === null) {
          throw new Error(
            `[tenancy] SUPER_ADMIN cannot access ${model}.${operation} through the scoped client. ` +
            `Use platformPrisma for platform-level operations.`,
          );
        }

        const schoolId = ctx.schoolId;
        if (!schoolId) {
          throw new Error(
            `[tenancy] Refusing ${model}.${operation}: no schoolId in request context.`,
          );
        }

        const scoped = { ...(args ?? {}) };

        if (WHERE_OPS.has(operation)) {
          scoped.where = { ...(scoped.where ?? {}), schoolId };
        }
        if (operation === 'create') {
          scoped.data = { ...(scoped.data ?? {}), schoolId };
        }
        if (operation === 'createMany') {
          scoped.data = (scoped.data ?? []).map((row) => ({ ...row, schoolId }));
        }

        return query(scoped);
      },
    },
  },
});

// Raw client that bypasses tenant isolation. Only for:
//   - platform login (SUPER_ADMIN)
//   - changePassword (userId comes from the verified JWT)
//   - seed scripts
// Any other use is a bug and must be flagged in code review.
export const platformPrisma = rawClient;