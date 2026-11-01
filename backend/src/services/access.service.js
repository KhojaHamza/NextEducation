import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

const forbidden = () => new AppError('You do not have permission to do this', 403);

const getTeacher = (db, userId) =>
  db.teacher.findFirst({ where: { userId, deletedAt: null } });

// Classes a teacher works with: homeroom teacher or assigned to a subject
export const getTeacherClassIds = async (userId) => {
  const teacher = await getTeacher(prisma, userId);
  if (!teacher) return [];
  const [homeroom, assigned] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { homeroomTeacherId: teacher.id, deletedAt: null }, select: { id: true },
    }),
    prisma.teachingAssignment.findMany({
      where: { teacherId: teacher.id, deletedAt: null }, select: { classId: true },
    }),
  ]);
  return [...new Set([...homeroom.map((c) => c.id), ...assigned.map((a) => a.classId)])];
};

// Value to use in a Prisma "where.classId": applies the teacher scope when needed
export const classFilterFor = async (user, requestedClassId) => {
  if (user.role !== 'TEACHER') return requestedClassId;
  const ids = await getTeacherClassIds(user.id);
  if (requestedClassId === undefined) return { in: ids };
  if (!ids.includes(requestedClassId)) throw forbidden();
  return requestedClassId;
};

export const assertCanAccessClass = async (user, classId) => {
  if (user.role === 'ADMIN') return;
  if (user.role === 'TEACHER' && (await getTeacherClassIds(user.id)).includes(classId)) return;
  throw forbidden();
};

// Writing grades: admin, the class homeroom teacher, or the teacher assigned to this subject
export const assertCanTeach = async (db, user, classId, subjectId) => {
  if (user.role === 'ADMIN') return;
  const teacher = user.role === 'TEACHER' ? await getTeacher(db, user.id) : null;
  if (!teacher) throw forbidden();

  const homeroom = await db.schoolClass.findFirst({
    where: { id: classId, homeroomTeacherId: teacher.id, deletedAt: null },
  });
  if (homeroom) return;

  const assignment = await db.teachingAssignment.findFirst({
    where: { teacherId: teacher.id, classId, subjectId, deletedAt: null },
  });
  if (!assignment) throw new AppError('You are not assigned to this class and subject', 403);
};

export const assertParentOfStudent = async (userId, studentId) => {
  const link = await prisma.studentParent.findFirst({
    where: {
      studentId,
      parent: { userId, deletedAt: null },
      student: { deletedAt: null },
    },
  });
  if (!link) throw forbidden();
};

export const assertCanViewStudent = async (user, studentId) => {
  if (user.role === 'ADMIN') return;
  if (user.role === 'PARENT') return assertParentOfStudent(user.id, studentId);
  if (user.role === 'TEACHER') {
    const ids = await getTeacherClassIds(user.id);
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, classId: { in: ids }, deletedAt: null },
    });
    if (enrollment) return;
  }
  throw forbidden();
};