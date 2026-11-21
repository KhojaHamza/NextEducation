import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { assertParentOfStudent, getTeacherClassIds } from './access.service.js';

// =====================================================================
//  RULES: edit these two tables to change who may write to whom
// =====================================================================

// Individual people a role may write to
export const ROLE_TARGETS = {
  ADMIN: ['STUDENT', 'PARENT', 'TEACHER', 'ACCOUNTANT'],
  PARENT: ['ADMIN', 'TEACHER', 'STUDENT', 'ACCOUNTANT'],
  STUDENT: ['ADMIN', 'TEACHER', 'PARENT'],
  ACCOUNTANT: ['ADMIN', 'TEACHER', 'PARENT'],
  TEACHER: ['ADMIN', 'STUDENT', 'PARENT'],
};

// Groups a role may write to
//   CLASS = the students of one class, ALL_TEACHERS, ALL_PARENTS, EVERYONE
export const GROUPS = {
  ADMIN: ['CLASS', 'ALL_TEACHERS', 'EVERYONE'],
  PARENT: [],
  STUDENT: ['CLASS'],
  ACCOUNTANT: ['ALL_PARENTS', 'EVERYONE'],
  TEACHER: ['CLASS', 'ALL_PARENTS', 'EVERYONE'],
};

// "Everyone": the administration reaches the students too, the others only the adults
const EVERYONE_ROLES = {
  ADMIN: ['ADMIN', 'TEACHER', 'PARENT', 'ACCOUNTANT', 'STUDENT'],
  default: ['ADMIN', 'TEACHER', 'PARENT', 'ACCOUNTANT'],
};

const MAX_AUDIENCE = 1000;

// Kept for other modules that may import it
export const ADMIN_SIDE = ['ADMIN', 'ACCOUNTANT'];

// =====================================================================

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

// Per recipient role: the extra Prisma filter that limits WHO of that role the sender may reach
const scopeFilters = async (db, sender) => {
  if (['ADMIN', 'ACCOUNTANT'].includes(sender.role)) return {};

  if (sender.role === 'TEACHER') {
    const classIds = await getTeacherClassIds(sender.id);
    const inMyClasses = { deletedAt: null, enrollments: { some: { classId: { in: classIds }, deletedAt: null } } };
    return {
      STUDENT: { student: inMyClasses },
      PARENT: { parent: { deletedAt: null, children: { some: { student: inMyClasses } } } },
    };
  }

  // PARENT and STUDENT: "mine" = my children (parent) or my own student record (student)
  const mine = sender.role === 'PARENT'
    ? { parents: { some: { parent: { userId: sender.id, deletedAt: null } } } }
    : { userId: sender.id };
  const enrollments = await db.enrollment.findMany({
    where: { deletedAt: null, student: { deletedAt: null, ...mine } }, select: { classId: true },
  });
  const classIds = [...new Set(enrollments.map((e) => e.classId))];

  const filters = {
    TEACHER: {
      teacher: {
        deletedAt: null,
        OR: [
          { homeroomClasses: { some: { id: { in: classIds }, deletedAt: null } } },
          { assignments: { some: { classId: { in: classIds }, deletedAt: null } } },
        ],
      },
    },
  };
  if (sender.role === 'PARENT') filters.STUDENT = { student: mine };
  else filters.PARENT = { parent: { deletedAt: null, children: { some: { student: mine } } } };
  return filters;
};

const recipientWhere = (roles, filters) => roles.map((role) => ({ role, ...(filters[role] ?? {}) }));

export const loadRecipients = async (db, ids) => {
  const wanted = [...new Set(ids)];
  const recipients = await db.user.findMany({ where: { id: { in: wanted }, ...activeUser }, select: userBrief });
  if (recipients.length !== wanted.length) throw new AppError('One or more recipients do not exist', 400);
  return recipients;
};

// Individual recipients. Returns their user records.
export const assertCanMessage = async (db, sender, recipientIds, studentId) => {
  const wanted = [...new Set(recipientIds)];
  if (wanted.includes(sender.id)) throw new AppError('You cannot message yourself', 400);

  const recipients = await loadRecipients(db, wanted);
  const allowed = ROLE_TARGETS[sender.role] ?? [];
  if (recipients.some((r) => !allowed.includes(r.role))) throw forbidden();

  const filters = await scopeFilters(db, sender);
  const ok = await db.user.count({
    where: { id: { in: wanted }, ...activeUser, OR: recipientWhere(allowed, filters) },
  });
  if (ok !== wanted.length) {
    throw forbidden('You can only write to people connected to you (your classes, children or teachers)');
  }

  if (studentId) {
    if (sender.role === 'PARENT') {
      await assertParentOfStudent(sender.id, studentId);
    } else if (sender.role === 'TEACHER') {
      if (!(await userTeachesStudent(db, sender.id, studentId))) {
        throw forbidden('This student is not in one of your classes');
      }
    } else if (ADMIN_SIDE.includes(sender.role)) {
      const student = await db.student.findFirst({ where: { id: studentId, deletedAt: null } });
      if (!student) throw new AppError('Student not found', 400);
    }
  }
  return recipients;
};

// A group audience -> the user records it reaches (the rule is checked here)
export const resolveAudience = async (db, sender, audience) => {
  const { type } = audience;
  if (!(GROUPS[sender.role] ?? []).includes(type)) throw forbidden();

  let where;
  if (type === 'CLASS') {
    const { classId } = audience;
    const cls = await db.schoolClass.findFirst({ where: { id: classId, deletedAt: null } });
    if (!cls) throw new AppError('Class not found', 400);

    if (sender.role === 'TEACHER') {
      if (!(await getTeacherClassIds(sender.id)).includes(classId)) throw forbidden('This is not one of your classes');
    }
    if (sender.role === 'STUDENT') {
      const own = await db.enrollment.findFirst({
        where: { classId, deletedAt: null, student: { userId: sender.id, deletedAt: null } },
      });
      if (!own) throw forbidden('You can only write to your own class');
    }
    where = { role: 'STUDENT', student: { deletedAt: null, enrollments: { some: { classId, deletedAt: null } } } };
  } else if (type === 'ALL_TEACHERS') {
    where = { role: 'TEACHER', teacher: { deletedAt: null } };
  } else if (type === 'ALL_PARENTS') {
    const filters = await scopeFilters(db, sender); // a teacher only reaches the parents of their classes
    where = { role: 'PARENT', ...(filters.PARENT ?? {}) };
  } else {
    where = { role: { in: EVERYONE_ROLES[sender.role] ?? EVERYONE_ROLES.default } };
  }

  const users = await db.user.findMany({
    where: { ...activeUser, id: { not: sender.id }, ...where },
    select: userBrief,
    take: MAX_AUDIENCE + 1,
  });
  if (users.length === 0) throw new AppError('No recipients in this audience', 400);
  if (users.length > MAX_AUDIENCE) throw new AppError(`Audience too large (maximum ${MAX_AUDIENCE})`, 400);
  return users;
};

// Feeds the "recipient" picker: people the user may write to (filter by role and name)
export const listContacts = async (user, { search, role } = {}) => {
  const allowed = ROLE_TARGETS[user.role] ?? [];
  const roles = role ? allowed.filter((r) => r === role) : allowed;
  if (!roles.length) return [];

  const filters = await scopeFilters(prisma, user);
  const nameFilter = search
    ? [{ OR: ['firstName', 'lastName'].map((f) => ({ [f]: { contains: search, mode: 'insensitive' } })) }]
    : [];

  const users = await prisma.user.findMany({
    where: {
      ...activeUser, id: { not: user.id },
      AND: [{ OR: recipientWhere(roles, filters) }, ...nameFilter],
    },
    select: userBrief,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    take: 200,
  });
  return users.map((u) => ({ userId: u.id, name: fullName(u), role: u.role }));
};

// Roles, groups and classes the user can pick in the composer
export const listAudiences = async (user) => {
  const groups = GROUPS[user.role] ?? [];
  let classes = [];
  if (groups.includes('CLASS')) {
    const where = { deletedAt: null, schoolYear: { isCurrent: true } };
    if (user.role === 'TEACHER') where.id = { in: await getTeacherClassIds(user.id) };
    if (user.role === 'STUDENT') {
      where.enrollments = { some: { deletedAt: null, student: { userId: user.id, deletedAt: null } } };
    }
    const rows = await prisma.schoolClass.findMany({
      where, orderBy: [{ level: 'asc' }, { section: 'asc' }], select: { id: true, level: true, section: true },
    });
    classes = rows.map((c) => ({ id: c.id, label: `${c.level} ${c.section}` }));
  }
  return { roles: ROLE_TARGETS[user.role] ?? [], groups, classes };
};