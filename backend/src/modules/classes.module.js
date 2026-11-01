import { z } from 'zod';
import { createCrudService } from '../core/crud.service.js';
import { createCrudController } from '../core/crud.controller.js';
import { createCrudRouter } from '../core/crud.router.js';
import { AppError } from '../utils/AppError.js';

const createSchema = z.object({
  level: z.string().trim().min(1).max(20),
  section: z.string().trim().min(1).max(10),
  capacity: z.number().int().positive().max(60),
  schoolYearId: z.number().int().positive(),
  homeroomTeacherId: z.number().int().positive().nullable().optional(),
});
const updateSchema = createSchema.partial();

const service = createCrudService({
  model: 'schoolClass',
  entity: 'SchoolClass',
  include: { schoolYear: true, homeroomTeacher: true },
  orderBy: [{ level: 'asc' }, { section: 'asc' }],
  searchFields: ['level', 'section'],
  filters: { schoolYearId: Number, level: String },

  async beforeSave(tx, data, existing) {
    if (data.schoolYearId !== undefined) {
      const year = await tx.schoolYear.findFirst({ where: { id: data.schoolYearId, deletedAt: null } });
      if (!year) throw new AppError('School year not found', 400);
    }

    if (data.homeroomTeacherId) {
      const teacher = await tx.teacher.findFirst({ where: { id: data.homeroomTeacherId, deletedAt: null } });
      if (!teacher) throw new AppError('Teacher not found', 400);
    }

    // Capacity can't go below the current number of students
    if (existing && data.capacity !== undefined) {
      const enrolled = await tx.enrollment.count({ where: { classId: existing.id, deletedAt: null } });
      if (data.capacity < enrolled) {
        throw new AppError(`Capacity cannot be lower than the ${enrolled} enrolled students`, 409);
      }
    }
  },

  async beforeDelete(tx, cls) {
    const [students, assignments] = await Promise.all([
      tx.enrollment.count({ where: { classId: cls.id, deletedAt: null } }),
      tx.teachingAssignment.count({ where: { classId: cls.id, deletedAt: null } }),
    ]);
    if (students > 0) throw new AppError('This class still has students: reassign them first', 409);
    if (assignments > 0) throw new AppError('This class still has teacher assignments', 409);
        const evaluations = await tx.evaluation.count({ where: { classId: cls.id, deletedAt: null } });
    if (evaluations > 0) throw new AppError('This class still has evaluations', 409);
  },
});

export default createCrudRouter({
  controller: createCrudController(service),
  createSchema,
  updateSchema,
  readRoles: ['ADMIN', 'TEACHER', 'ACCOUNTANT'],
});