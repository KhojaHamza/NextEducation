import { z } from 'zod';
import { createCrudService } from '../core/crud.service.js';
import { createCrudController } from '../core/crud.controller.js';
import { createCrudRouter } from '../core/crud.router.js';
import { AppError } from '../utils/AppError.js';

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  coefficient: z.number().positive().max(99),
  level: z.string().trim().min(1).max(20),
});
const updateSchema = createSchema.partial();

const service = createCrudService({
  model: 'subject',
  entity: 'Subject',
  orderBy: [{ level: 'asc' }, { name: 'asc' }],
  searchFields: ['name'],
  filters: { level: String },

  async beforeDelete(tx, subject) {
    const assignments = await tx.teachingAssignment.count({
      where: { subjectId: subject.id, deletedAt: null },
    });
    if (assignments > 0) throw new AppError('This subject is assigned to teachers', 409);
    // When grades exist (step 6), we'll add a check for them here
  },
});

export default createCrudRouter({
  controller: createCrudController(service),
  createSchema,
  updateSchema,
  readRoles: ['ADMIN', 'TEACHER', 'ACCOUNTANT'],
});