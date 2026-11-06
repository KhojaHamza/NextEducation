import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { assertParentOfStudent, getTeacherClassIds } from './access.service.js';

// The administration side of the school: it can talk to parents and students
export const ADMIN_SIDE = ['ADMIN', 'ACCOUNTANT'];

const userBrief = { id: true, role: true, email: true, firstName: true, lastName: true };
const activeUser = { deletedAt: null, isActive: true };
const fullName = (u) => `${u.firstName} ${u.lastName}`;
const forbidden = (msg = 'You are not allowed to message these recipients') => new AppError(msg, 403);

const studentClassIds = async (db, studentId) => {
  const rows = await db.enrollment.findMany({
    where: { studentId, deletedAt: null }, select: { classId: true },
  });
  return rows.map((r) => r.classId);
};

const userTeachesStudent = async (db, teacherUserId, studentId) => {
  const [teacherClasses, studentClasses] = await Promise.all([
    getTeacherClassIds(teacherUserId), studentClassIds(db, studentId),
  ]);
  return studentClasses.some((c) => teacherClasses.includes(c));
};

// Single source of truth for the channel rules. Returns the recipients' user records.
export const assertCanMessage = async (db, sender, recipientIds, studentId) => {
  const wanted = [...new Set(recipientIds)];
  if (wanted.includes(sender.id)) throw new AppError('You cannot message yourself', 400);

  const recipients = await db.user.findMany({ where: { id: { in: wanted }, ...activeUser }, select: userBrief });
  if (recipients.length !== wanted.length) throw new AppError('One or more recipients do not exist', 400);
  const roles = recipients.map((r) => r.role);

  switch (sender.role) {
    case 'ADMIN':
    case 'ACCOUNTANT': {
      if (roles.some((r) => !['PARENT', 'STUDENT'].includes(r))) throw forbidden();
      if (studentId) {
        const student = await db.student.findFirst({ where: { id: studentId, deletedAt: null } });
        if (!student) throw new AppError('Student not found', 400);
      }
      break;
    }
    case 'STUDENT': {
      if (roles.some((r) => !ADMIN_SIDE.includes(r))) throw forbidden();
      break;
    }
    case 'TEACHER': {
      if (!studentId) throw new AppError('studentId is required when a teacher writes to parents', 400);
      if (roles.some((r) => r !== 'PARENT')) throw forbidden();
      if (!(await userTeachesStudent(db, sender.id, studentId))) {
        throw forbidden('This student is not in one of your classes');
      }
      const links = await db.studentParent.count({
        where: { studentId, parent: { userId: { in: wanted }, deletedAt: null } },
      });
      if (links !== wanted.length) throw forbidden('Recipients must be parents of this student');
      break;
    }
    case 'PARENT': {
      if (roles.some((r) => r !== 'TEACHER' && !ADMIN_SIDE.includes(r))) throw forbidden();
      if (studentId) await assertParentOfStudent(sender.id, studentId);

      const teachers = recipients.filter((r) => r.role === 'TEACHER');
      if (teachers.length) {
        if (!studentId) throw new AppError('studentId is required when a parent writes to teachers', 400);
        for (const t of teachers) {
          if (!(await userTeachesStudent(db, t.id, studentId))) {
            throw forbidden('This teacher does not teach your child');
          }
        }
      }
      break;
    }
    default:
      throw forbidden();
  }
  return recipients;
};

// People the current user may write to (feeds the "recipient" picker of the frontend)
export const listContacts = async (user, { studentId, search } = {}) => {
  const nameFilter = search
    ? { OR: ['firstName', 'lastName'].map((f) => ({ [f]: { contains: search, mode: 'insensitive' } })) }
    : {};
  const toContact = (u, extra = {}) => ({ userId: u.id, name: fullName(u), role: u.role, ...extra });

  if (ADMIN_SIDE.includes(user.role)) {
    const users = await prisma.user.findMany({
      where: { ...activeUser, role: { in: ['PARENT', 'STUDENT'] }, ...nameFilter },
      select: userBrief, orderBy: { lastName: 'asc' }, take: 100,
    });
    return users.map((u) => toContact(u));
  }

  if (user.role === 'STUDENT') {
    const users = await prisma.user.findMany({
      where: { ...activeUser, role: { in: ADMIN_SIDE } }, select: userBrief, orderBy: { lastName: 'asc' },
    });
    return users.map((u) => toContact(u));
  }

  if (user.role === 'TEACHER') {
    const classIds = await getTeacherClassIds(user.id);
    const links = await prisma.studentParent.findMany({
      where: {
        ...(studentId && { studentId }),
        student: { deletedAt: null, enrollments: { some: { classId: { in: classIds }, deletedAt: null } } },
        parent: { deletedAt: null, user: { ...activeUser, ...nameFilter } },
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        parent: { include: { user: { select: userBrief } } },
      },
      take: 200,
    });

    const byUser = new Map();
    for (const l of links) {
      const u = l.parent.user;
      const contact = byUser.get(u.id) ?? toContact(u, { students: [] });
      contact.students.push({ id: l.student.id, name: fullName(l.student) });
      byUser.set(u.id, contact);
    }
    return [...byUser.values()];
  }

  if (user.role === 'PARENT') {
    const kids = await prisma.studentParent.findMany({
      where: {
        parent: { userId: user.id, deletedAt: null },
        student: { deletedAt: null },
        ...(studentId && { studentId }),
      },
      include: {
        student: {
          select: {
            id: true, firstName: true, lastName: true,
            enrollments: { where: { deletedAt: null }, select: { classId: true } },
          },
        },
      },
    });
    const classIds = [...new Set(kids.flatMap((k) => k.student.enrollments.map((e) => e.classId)))];

    const [teachers, staff] = await Promise.all([
      prisma.teacher.findMany({
        where: {
          deletedAt: null, user: activeUser,
          OR: [
            { homeroomClasses: { some: { id: { in: classIds }, deletedAt: null } } },
            { assignments: { some: { classId: { in: classIds }, deletedAt: null } } },
          ],
        },
        include: {
          user: { select: userBrief },
          homeroomClasses: { select: { id: true } },
          assignments: { where: { deletedAt: null }, select: { classId: true } },
        },
      }),
      prisma.user.findMany({
        where: { ...activeUser, role: { in: ADMIN_SIDE } }, select: userBrief, orderBy: { lastName: 'asc' },
      }),
    ]);

    return [
      ...teachers.map((t) => {
        const taught = new Set([...t.homeroomClasses.map((c) => c.id), ...t.assignments.map((a) => a.classId)]);
        const students = kids
          .filter((k) => k.student.enrollments.some((e) => taught.has(e.classId)))
          .map((k) => ({ id: k.student.id, name: fullName(k.student) }));
        return toContact(t.user, { students });
      }),
      ...staff.map((u) => toContact(u)),
    ];
  }

  return [];
};