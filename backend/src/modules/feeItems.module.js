import { z } from 'zod';
import { createCrudService } from '../core/crud.service.js';
import { createCrudController } from '../core/crud.controller.js';
import { createCrudRouter } from '../core/crud.router.js';
import { AppError } from '../utils/AppError.js';
import { amountSchema } from '../utils/format.js';

const fields = {
  name: z.string().trim().min(1).max(100),
  type: z.enum(['REGISTRATION', 'TUITION', 'OTHER']),
  level: z.string().trim().min(1).max(20).nullable().optional(), // empty = every level
  amount: amountSchema,
  dueDate: z.coerce.date(),
  schoolYearId: z.number().int().positive(),
};
const createSchema = z.object(fields);
const updateSchema = z.object(fields).partial();

const validPayments = (tx, schoolYearId) =>
  tx.payment.count({ where: { schoolYearId, cancelledAt: null } });

const service = createCrudService({
  model: 'feeItem',
  entity: 'FeeItem',
  include: { schoolYear: true },
  orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
  searchFields: ['name'],
  filters: { schoolYearId: Number, level: String },

  async beforeSave(tx, data, existing) {
    if (data.schoolYearId !== undefined) {
      const year = await tx.schoolYear.findFirst({ where: { id: data.schoolYearId, deletedAt: null } });
      if (!year) throw new AppError('School year not found', 400);
    }
    // Once money was collected, the amounts behind the balances are frozen
    if (existing) {
      const touchesMoney = ['amount', 'level', 'type', 'schoolYearId'].some((k) => data[k] !== undefined);
      if (touchesMoney && (await validPayments(tx, existing.schoolYearId)) > 0) {
        throw new AppError('Payments exist for this school year: only the name and due date can be changed', 409);
      }
    }
  },

  async beforeDelete(tx, item) {
    if ((await validPayments(tx, item.schoolYearId)) > 0) {
      throw new AppError('Payments exist for this school year: fee items can no longer be deleted', 409);
    }
  },
});

export default createCrudRouter({
  controller: createCrudController(service),
  createSchema,
  updateSchema,
  readRoles: ['ADMIN', 'ACCOUNTANT'],
  writeRoles: ['ADMIN'],
});