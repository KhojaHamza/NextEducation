import { AppError } from '../utils/AppError.js';

const lockClass = (tx, classId) =>
  tx.$queryRaw`SELECT id FROM classes WHERE id = ${classId} FOR UPDATE`;

export const enrollStudent = async (tx, { studentId, classId }) => {
  await lockClass(tx, classId);

  const cls = await tx.schoolClass.findFirst({ where: { id: classId, deletedAt: null } });
  if (!cls) throw new AppError('Class not found', 400);

  const student = await tx.student.findFirst({ where: { id: studentId, deletedAt: null } });
  if (!student) throw new AppError('Student not found', 404);

  const existing = await tx.enrollment.findUnique({
    where: { studentId_schoolYearId: { studentId, schoolYearId: cls.schoolYearId } },
  });
  if (existing && !existing.deletedAt) {
    throw new AppError('Student is already enrolled for this school year: use a transfer', 409);
  }

  const taken = await tx.enrollment.count({ where: { classId, deletedAt: null } });
  if (taken >= cls.capacity) throw new AppError('Class is full', 409);

  // A previously removed enrollment is restored instead of duplicated
  if (existing) {
    return tx.enrollment.update({
      where: { id: existing.id },
      data: { classId, deletedAt: null, enrolledAt: new Date() },
    });
  }
  return tx.enrollment.create({
    data: { studentId, classId, schoolYearId: cls.schoolYearId },
  });
};

export const transferEnrollment = async (tx, { enrollmentId, classId }) => {
  const enrollment = await tx.enrollment.findFirst({ where: { id: enrollmentId, deletedAt: null } });
  if (!enrollment) throw new AppError('Enrollment not found', 404);
  if (enrollment.classId === classId) throw new AppError('Student is already in this class', 409);

  await lockClass(tx, classId);
  const cls = await tx.schoolClass.findFirst({ where: { id: classId, deletedAt: null } });
  if (!cls) throw new AppError('Class not found', 400);
  if (cls.schoolYearId !== enrollment.schoolYearId) {
    throw new AppError('A transfer must stay within the same school year', 400);
  }

  const taken = await tx.enrollment.count({ where: { classId, deletedAt: null } });
  if (taken >= cls.capacity) throw new AppError('Class is full', 409);

  return tx.enrollment.update({ where: { id: enrollmentId }, data: { classId } });
};