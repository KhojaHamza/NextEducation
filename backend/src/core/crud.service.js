import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { logAudit } from './audit.service.js';

/**
 * Generic CRUD service with soft delete and audit log.
 * Each write runs in a transaction: if the audit entry fails, the change is rolled back.
 */
export const createCrudService = ({
  model,            // Prisma model name, e.g. 'schoolClass'
  entity,           // Name used in messages and the audit log
  include,          // Prisma include for responses
  orderBy = { id: 'asc' },
  searchFields = [],
  filters = {},     // allowed query filters: { schoolYearId: Number, level: String }
  beforeSave,       // async (tx, data, existing) => validates business rules
  beforeDelete,     // async (tx, existing) => throws if deletion is not allowed
}) => {
  const findActive = async (db, id) => {
    const record = await db[model].findFirst({ where: { id, deletedAt: null }, include });
    if (!record) throw new AppError(`${entity} not found`, 404);
    return record;
  };

  return {
    async list(query = {}) {
      const page = Math.max(Number(query.page) || 1, 1);
      const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
      const where = { deletedAt: null };

      for (const [field, cast] of Object.entries(filters)) {
        const raw = query[field];
        if (raw === undefined || raw === '') continue;
        const value = cast(raw);
        if (Number.isNaN(value)) throw new AppError(`Invalid filter: ${field}`, 400);
        where[field] = value;
      }

      if (query.search && searchFields.length) {
        where.OR = searchFields.map((f) => ({
          [f]: { contains: String(query.search), mode: 'insensitive' },
        }));
      }

      const [items, total] = await Promise.all([
        prisma[model].findMany({ where, include, orderBy, skip: (page - 1) * limit, take: limit }),
        prisma[model].count({ where }),
      ]);

      return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },

    getById: (id) => findActive(prisma, id),

    create: (data, userId) =>
      prisma.$transaction(async (tx) => {
        if (beforeSave) await beforeSave(tx, data, null);
        const record = await tx[model].create({ data, include });
        await logAudit(tx, { userId, action: 'CREATE', entity, entityId: record.id, newValues: record });
        return record;
      }),

    update: (id, data, userId) =>
      prisma.$transaction(async (tx) => {
        const before = await findActive(tx, id);
        if (beforeSave) await beforeSave(tx, data, before);
        const record = await tx[model].update({ where: { id }, data, include });
        await logAudit(tx, {
          userId, action: 'UPDATE', entity, entityId: id, oldValues: before, newValues: record,
        });
        return record;
      }),

    remove: (id, userId) =>
      prisma.$transaction(async (tx) => {
        const before = await findActive(tx, id);
        if (beforeDelete) await beforeDelete(tx, before);
        await tx[model].update({ where: { id }, data: { deletedAt: new Date() } });
        await logAudit(tx, { userId, action: 'DELETE', entity, entityId: id, oldValues: before });
      }),
  };
};