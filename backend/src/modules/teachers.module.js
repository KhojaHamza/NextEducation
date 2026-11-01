import { z } from 'zod';
import { createPersonRouter } from './people.factory.js';
import { AppError } from '../utils/AppError.js';

export default createPersonRouter({
  role: 'TEACHER',
  model: 'teacher',
  entity: 'Teacher',
  profileShape: {
    speciality: z.string().trim().max(100).optional(),
    hiredAt: z.coerce.date().optional(),
  },
  readRoles: ['ADMIN', 'ACCOUNTANT'],
  writeRoles: ['ADMIN'],

  async beforeDelete(tx, teacher) {
    const [homeroom, assignments] = await Promise.all([
      tx.schoolClass.count({ where: { homeroomTeacherId: teacher.id, deletedAt: null } }),
      tx.teachingAssignment.count({ where: { teacherId: teacher.id, deletedAt: null } }),
    ]);
    if (homeroom > 0) throw new AppError('This teacher is the homeroom teacher of a class', 409);
    if (assignments > 0) throw new AppError('This teacher still has subject assignments', 409);
  },
});