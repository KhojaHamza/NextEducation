import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { logAudit } from '../core/audit.service.js';
import { enrollStudent } from './enrollment.service.js';
import { getUnpaidYears } from './account.service.js';

const contact = { select: { id: true, email: true, firstName: true, lastName: true, phone: true } };

export const studentInclude = {
  parents: { include: { parent: { include: { user: contact } } } },
  enrollments: { where: { deletedAt: null }, include: { schoolClass: true } },
};

const findActive = async (db, id) => {
  const student = await db.student.findFirst({ where: { id, deletedAt: null }, include: studentInclude });
  if (!student) throw new AppError('Student not found', 404);
  return student;
};

// Matricule format: <start year>-<4-digit sequence>, e.g. 2026-0001
export const allocateMatricules = async (tx, schoolYearId, count) => {
  const year = await tx.schoolYear.findFirst({ where: { id: schoolYearId, deletedAt: null } });
  if (!year) throw new AppError('School year not found', 400);

  const prefix = String(year.startDate.getUTCFullYear());
  const last = await tx.student.findFirst({
    where: { matricule: { startsWith: `${prefix}-` } }, // archived students included: numbers are never reused
    orderBy: { matricule: 'desc' },
    select: { matricule: true },
  });
  const start = last ? Number(last.matricule.split('-')[1]) : 0;
  return Array.from({ length: count }, (_, i) => `${prefix}-${String(start + i + 1).padStart(4, '0')}`);
};

const checkParents = async (tx, parents) => {
  const ids = parents.map((p) => p.parentId);
  if (new Set(ids).size !== ids.length) throw new AppError('Duplicate parent in the list', 400);
  if (!ids.length) return;
  const found = await tx.parent.count({ where: { id: { in: ids }, deletedAt: null } });
  if (found !== ids.length) throw new AppError('One or more parents do not exist', 400);
};

const resolveEntryYear = async (tx, { entryYearId, classId }) => {
  if (classId) {
    const cls = await tx.schoolClass.findFirst({ where: { id: classId, deletedAt: null } });
    if (!cls) throw new AppError('Class not found', 400);
    if (entryYearId && entryYearId !== cls.schoolYearId) {
      throw new AppError('entryYearId does not match the class school year', 400);
    }
    return cls.schoolYearId;
  }
  if (entryYearId) return entryYearId;
  const current = await tx.schoolYear.findFirst({ where: { isCurrent: true, deletedAt: null } });
  if (!current) throw new AppError('No current school year: set one first', 400);
  return current.id;
};

// Shared by single creation and CSV import
export const createStudentRecord = async (tx, { data, matricule, userId }) => {
  const { parents = [], classId, ...fields } = data;
  await checkParents(tx, parents);

  const student = await tx.student.create({
    data: {
      ...fields,
      matricule,
      parents: { create: parents.map((p) => ({ parentId: p.parentId, relationship: p.relationship })) },
    },
  });
  if (classId) await enrollStudent(tx, { studentId: student.id, classId });

  const full = await findActive(tx, student.id);
  await logAudit(tx, { userId, action: 'CREATE', entity: 'Student', entityId: student.id, newValues: full });
  return full;
};

export const createStudent = (data, userId) =>
  prisma.$transaction(async (tx) => {
    const entryYearId = await resolveEntryYear(tx, data);
    const [matricule] = await allocateMatricules(tx, entryYearId, 1);
    return createStudentRecord(tx, { data: { ...data, entryYearId }, matricule, userId });
  });

export const listStudents = async (query, classScope = null) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const where = { deletedAt: null };

  if (query.search) {
    where.OR = ['firstName', 'lastName', 'matricule'].map((f) => ({
      [f]: { contains: String(query.search), mode: 'insensitive' },
    }));
  }

  const link = { deletedAt: null };
  if (query.classId) link.classId = Number(query.classId);
  if (query.schoolYearId) link.schoolYearId = Number(query.schoolYearId);
  if (Number.isNaN(link.classId) || Number.isNaN(link.schoolYearId)) {
    throw new AppError('Invalid filter', 400);
  }

  if (query.unassigned === 'true') where.enrollments = { none: { deletedAt: null } };
  else if (query.classId || query.schoolYearId) where.enrollments = { some: link };

  const [items, total] = await Promise.all([
    prisma.student.findMany({
      where, include: studentInclude,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.student.count({ where }),
  ]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getStudent = (id) => findActive(prisma, id);

export const updateStudent = (id, data, userId) =>
  prisma.$transaction(async (tx) => {
    const before = await findActive(tx, id);
    await tx.student.update({ where: { id }, data });
    const after = await findActive(tx, id);
    await logAudit(tx, { userId, action: 'UPDATE', entity: 'Student', entityId: id, oldValues: before, newValues: after });
    return after;
  });

export const setParents = (id, parents, userId) =>
  prisma.$transaction(async (tx) => {
    const before = await findActive(tx, id);
    await checkParents(tx, parents);
    await tx.studentParent.deleteMany({ where: { studentId: id } });
    if (parents.length) {
      await tx.studentParent.createMany({
        data: parents.map((p) => ({ studentId: id, parentId: p.parentId, relationship: p.relationship })),
      });
    }
    const after = await findActive(tx, id);
    await logAudit(tx, { userId, action: 'UPDATE', entity: 'Student', entityId: id, oldValues: before, newValues: after });
    return after;
  });

export const deleteStudent = (id, userId, { confirm = false } = {}) =>
  prisma.$transaction(async (tx) => {
    const before = await findActive(tx, id);

    const unpaid = await getUnpaidYears(tx, id);
    if (unpaid.length && !confirm) {
      const detail = unpaid.map((u) => `${u.balance} for ${u.label}`).join(', ');
      throw new AppError(`This student has an unpaid balance (${detail}): add ?confirm=true to delete anyway`, 409);
    }

    const now = new Date();
    await tx.enrollment.updateMany({ where: { studentId: id, deletedAt: null }, data: { deletedAt: now } });
    await tx.student.update({ where: { id }, data: { deletedAt: now } });
        if (before.userId) {
      await tx.user.update({ where: { id: before.userId }, data: { deletedAt: now, isActive: false } });
    }
    await logAudit(tx, { userId, action: 'DELETE', entity: 'Student', entityId: id, oldValues: before });
  });

// Row-level rule: a parent only sees their own children
export const listChildrenOfUser = async (userId) => {
  const parent = await prisma.parent.findFirst({ where: { userId, deletedAt: null } });
  if (!parent) return [];
  return prisma.student.findMany({
    where: { deletedAt: null, parents: { some: { parentId: parent.id } } },
    include: studentInclude,
  });
};