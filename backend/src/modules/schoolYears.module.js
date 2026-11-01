import { z } from 'zod';
import { createCrudService } from '../core/crud.service.js';
import { createCrudController } from '../core/crud.controller.js';
import { createCrudRouter } from '../core/crud.router.js';
import { AppError } from '../utils/AppError.js';

const createSchema = z.object({
  label: z.string().regex(/^\d{4}-\d{4}$/, 'Format must be YYYY-YYYY'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().optional(),
});
const updateSchema = createSchema.partial();

const service = createCrudService({
  model: 'schoolYear',
  entity: 'SchoolYear',
  orderBy: { startDate: 'desc' },
  searchFields: ['label'],

  async beforeSave(tx, data, existing) {
    const start = data.startDate ?? existing?.startDate;
    const end = data.endDate ?? existing?.endDate;
    if (start && end && start >= end) {
      throw new AppError('startDate must be before endDate', 400);
    }

    if (existing?.isCurrent && data.isCurrent === false) {
      throw new AppError('Set another year as current instead', 400);
    }

    // Only one current year at a time
    if (data.isCurrent === true) {
      await tx.schoolYear.updateMany({
        where: { isCurrent: true, deletedAt: null, ...(existing && { id: { not: existing.id } }) },
        data: { isCurrent: false },
      });
    }
  },

  async beforeDelete(tx, year) {
    if (year.isCurrent) throw new AppError('Cannot delete the current school year', 409);

    const [classes, students] = await Promise.all([
      tx.schoolClass.count({ where: { schoolYearId: year.id, deletedAt: null } }),
      tx.student.count({ where: { entryYearId: year.id, deletedAt: null } }),
    ]);
    if (classes > 0 || students > 0) {
      throw new AppError('This school year still has classes or students', 409);
    }
  },
});

export default createCrudRouter({
  controller: createCrudController(service),
  createSchema,
  updateSchema,
});