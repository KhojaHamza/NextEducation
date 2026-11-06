import { z } from 'zod';
import { createPersonRouter } from './people.factory.js';
import { AppError } from '../utils/AppError.js';

export default createPersonRouter({
  role: 'PARENT',
  model: 'parent',
  entity: 'Parent',
  profileShape: {
    address: z.string().trim().max(200).optional(),
  },
  readRoles: ['ADMIN', 'ACCOUNTANT'],
  writeRoles: ['ADMIN', 'ACCOUNTANT'], // the secretariat handles registrations

  async beforeDelete(tx, parent) {
    const children = await tx.studentParent.count({
      where: { parentId: parent.id, student: { deletedAt: null } },
    });
    if (children > 0) throw new AppError('This parent is still linked to students: unlink them first', 409);
  },
});