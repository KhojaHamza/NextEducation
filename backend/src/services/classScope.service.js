import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { getTeacherClassIds } from './access.service.js';

// null = no restriction (admin). Otherwise: ids of the classes this user may see.
export const visibleClassIds = async (user) => {
  if (user.role === 'ADMIN') return null;
  if (user.role === 'TEACHER') return getTeacherClassIds(user.id);

  let student = null;
  if (user.role === 'STUDENT') {
    student = { userId: user.id, deletedAt: null };
  } else if (user.role === 'PARENT') {
    student = { deletedAt: null, parents: { some: { parent: { userId: user.id, deletedAt: null } } } };
  }
  if (!student) return [];

  const rows = await prisma.enrollment.findMany({
    where: { deletedAt: null, schoolYear: { isCurrent: true }, student },
    select: { classId: true },
  });
  return [...new Set(rows.map((r) => r.classId))];
};

// Prisma "where" fragment limiting classId to what the user may see
export const classScope = async (user, requestedClassId) => {
  const ids = await visibleClassIds(user);
  if (ids === null) return requestedClassId === undefined ? {} : { classId: requestedClassId };
  if (requestedClassId === undefined) return { classId: { in: ids } };
  if (!ids.includes(requestedClassId)) throw new AppError('You do not have permission to do this', 403);
  return { classId: requestedClassId };
};