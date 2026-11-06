import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { logAudit } from '../core/audit.service.js';
import { getTeacherClassIds } from './access.service.js';
import { findConflicts, toHHMM } from './timetableConflicts.service.js';

export const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const fullName = (u) => `${u.firstName} ${u.lastName}`;
const className = (c) => `${c.level} ${c.section}`;

// Weekly views of a teacher or a room only show the school year in progress
const currentYearClass = { deletedAt: null, schoolYear: { isCurrent: true, deletedAt: null } };

export const slotInclude = {
  schoolClass: { select: { id: true, level: true, section: true } },
  subject: { select: { id: true, name: true } },
  teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
  room: { select: { id: true, name: true } },
};

export const shapeSlot = (s) => ({
  id: s.id,
  dayOfWeek: s.dayOfWeek,
  start: toHHMM(s.startMinute),
  end: toHHMM(s.endMinute),
  startMinute: s.startMinute, // numbers help a calendar grid position the blocks
  endMinute: s.endMinute,
  class: { id: s.schoolClass.id, name: className(s.schoolClass) },
  subject: { id: s.subject.id, name: s.subject.name },
  teacher: { id: s.teacher.id, name: fullName(s.teacher.user) },
  room: s.room ? { id: s.room.id, name: s.room.name } : null,
});

// { MONDAY: [...], TUESDAY: [...], ... } sorted by start time, ready for a calendar grid
export const toWeek = (slots) => {
  const sorted = [...slots].sort((a, b) => a.startMinute - b.startMinute);
  return Object.fromEntries(
    DAYS.map((d) => [d, sorted.filter((s) => s.dayOfWeek === d).map(shapeSlot)]),
  );
};

const auditMeta = (s) => ({
  id: s.id, classId: s.classId, subjectId: s.subjectId, teacherId: s.teacherId, roomId: s.roomId,
  dayOfWeek: s.dayOfWeek, start: toHHMM(s.startMinute), end: toHHMM(s.endMinute),
});

const conflictError = (conflicts) =>
  new AppError(`Timetable conflict: ${conflicts.map((c) => c.message).join(' | ')}`, 409);

// ---------- Checking ----------

// Throws 400 for invalid references. Returns the list of conflicts (empty list = the slot is free).
const checkSlot = async (tx, slot, ignoreId) => {
  if (slot.endMinute <= slot.startMinute) {
    throw new AppError('The end time must be after the start time', 400);
  }

  const schoolClass = await tx.schoolClass.findFirst({ where: { id: slot.classId, deletedAt: null } });
  if (!schoolClass) throw new AppError('Class not found', 400);
  const subject = await tx.subject.findFirst({ where: { id: slot.subjectId, deletedAt: null } });
  if (!subject) throw new AppError('Subject not found', 400);
  const teacher = await tx.teacher.findFirst({ where: { id: slot.teacherId, deletedAt: null } });
  if (!teacher) throw new AppError('Teacher not found', 400);
  if (slot.roomId != null) {
    const room = await tx.room.findFirst({ where: { id: slot.roomId, deletedAt: null, isAvailable: true } });
    if (!room) throw new AppError('Room not found or unavailable', 400);
  }

  // One timetable write at a time per school year: two admins cannot both pass the check
  // and then save clashing slots. The lock is released when the transaction ends.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(9, ${schoolClass.schoolYearId}::int)`;

  const conflicts = await findConflicts(tx, { ...slot, schoolYearId: schoolClass.schoolYearId }, ignoreId);

  // The teacher must really teach this subject to this class
  const assignment = await tx.teachingAssignment.findFirst({
    where: { teacherId: slot.teacherId, subjectId: slot.subjectId, classId: slot.classId, deletedAt: null },
  });
  if (!assignment) {
    conflicts.unshift({
      type: 'NOT_ASSIGNED', slotId: null,
      message: 'This teacher is not assigned to this subject and class',
    });
  }
  return conflicts;
};

// Dry run: nothing is saved
export const checkOnly = (slot, ignoreId) =>
  prisma.$transaction(async (tx) => {
    const conflicts = await checkSlot(tx, slot, ignoreId);
    return { ok: conflicts.length === 0, conflicts };
  });

// ---------- Writing ----------

export const createSlot = (user, input) =>
  prisma.$transaction(async (tx) => {
    const conflicts = await checkSlot(tx, input);
    if (conflicts.length) throw conflictError(conflicts);

    const slot = await tx.timetableSlot.create({ data: input, include: slotInclude });
    await logAudit(tx, {
      userId: user.id, action: 'CREATE', entity: 'TimetableSlot', entityId: slot.id, newValues: auditMeta(slot),
    });
    return shapeSlot(slot);
  });

export const updateSlot = (user, id, input) =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.timetableSlot.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new AppError('Timetable slot not found', 404);

    // The request only holds the changed fields: rebuild the complete slot before checking it
    const slot = {
      classId: input.classId ?? existing.classId,
      subjectId: input.subjectId ?? existing.subjectId,
      teacherId: input.teacherId ?? existing.teacherId,
      roomId: input.roomId === undefined ? existing.roomId : input.roomId,
      dayOfWeek: input.dayOfWeek ?? existing.dayOfWeek,
      startMinute: input.startMinute ?? existing.startMinute,
      endMinute: input.endMinute ?? existing.endMinute,
    };

    const conflicts = await checkSlot(tx, slot, id); // the slot must not conflict with itself
    if (conflicts.length) throw conflictError(conflicts);

    const updated = await tx.timetableSlot.update({ where: { id }, data: slot, include: slotInclude });
    await logAudit(tx, {
      userId: user.id, action: 'UPDATE', entity: 'TimetableSlot', entityId: id,
      oldValues: auditMeta(existing), newValues: auditMeta(updated),
    });
    return shapeSlot(updated);
  });

export const deleteSlot = (user, id) =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.timetableSlot.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new AppError('Timetable slot not found', 404);

    await tx.timetableSlot.update({ where: { id }, data: { deletedAt: new Date() } });
    await logAudit(tx, {
      userId: user.id, action: 'DELETE', entity: 'TimetableSlot', entityId: id, oldValues: auditMeta(existing),
    });
  });

// ---------- Who can see what ----------

// Parents see their children's classes, students their own: current school year only
const enrolledClassIds = async (user) => {
  const studentFilter = user.role === 'PARENT'
    ? { parents: { some: { parent: { userId: user.id, deletedAt: null } } } }
    : { userId: user.id };

  const rows = await prisma.enrollment.findMany({
    where: { deletedAt: null, schoolYear: { isCurrent: true }, student: { deletedAt: null, ...studentFilter } },
    select: { classId: true },
  });
  return [...new Set(rows.map((r) => r.classId))];
};

const visibleWhere = async (user) => {
  switch (user.role) {
    case 'ADMIN':
      return {};
    case 'TEACHER':
      return { OR: [{ teacher: { userId: user.id } }, { classId: { in: await getTeacherClassIds(user.id) } }] };
    case 'PARENT':
    case 'STUDENT':
      return { classId: { in: await enrolledClassIds(user) } };
    default:
      throw new AppError('You are not allowed to view the timetable', 403);
  }
};

// 404 rather than 403: we do not reveal that a class outside your scope exists
const assertCanViewClass = async (user, classId) => {
  if (user.role === 'ADMIN') return;
  const allowed = user.role === 'TEACHER' ? await getTeacherClassIds(user.id) : await enrolledClassIds(user);
  if (!allowed.includes(classId)) throw new AppError('Class not found', 404);
};

// ---------- Reading ----------

export const listSlots = async (user, filters) => {
  const scope = await visibleWhere(user);
  const slots = await prisma.timetableSlot.findMany({
    where: { AND: [{ deletedAt: null }, scope, filters] },
    include: slotInclude,
    orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
    take: 1000,
  });
  return slots.map(shapeSlot);
};

export const classWeek = async (user, classId) => {
  await assertCanViewClass(user, classId);
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: classId, deletedAt: null },
    select: { id: true, level: true, section: true, schoolYear: { select: { label: true } } },
  });
  if (!schoolClass) throw new AppError('Class not found', 404);

  const slots = await prisma.timetableSlot.findMany({
    where: { classId, deletedAt: null }, include: slotInclude,
  });
  return {
    class: { id: schoolClass.id, name: className(schoolClass), schoolYear: schoolClass.schoolYear.label },
    days: toWeek(slots),
  };
};

export const teacherWeek = async (user, teacherId) => {
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, deletedAt: null },
    select: { id: true, userId: true, user: { select: { firstName: true, lastName: true } } },
  });
  if (!teacher) throw new AppError('Teacher not found', 404);
  if (user.role !== 'ADMIN' && teacher.userId !== user.id) {
    throw new AppError('You can only view your own timetable', 403);
  }

  const slots = await prisma.timetableSlot.findMany({
    where: { teacherId, deletedAt: null, schoolClass: currentYearClass }, include: slotInclude,
  });
  return { teacher: { id: teacher.id, name: fullName(teacher.user) }, days: toWeek(slots) };
};

export const roomWeek = async (roomId) => {
  const room = await prisma.room.findFirst({ where: { id: roomId, deletedAt: null } });
  if (!room) throw new AppError('Room not found', 404);

  const slots = await prisma.timetableSlot.findMany({
    where: { roomId, deletedAt: null, schoolClass: currentYearClass }, include: slotInclude,
  });
  return { room: { id: room.id, name: room.name }, days: toWeek(slots) };
};

// Teacher: own week. Parent: one calendar per child. Student: own calendar.
export const myTimetable = async (user) => {
  if (user.role === 'TEACHER') {
    const slots = await prisma.timetableSlot.findMany({
      where: { deletedAt: null, teacher: { userId: user.id }, schoolClass: currentYearClass },
      include: slotInclude,
    });
    return { days: toWeek(slots) };
  }

  if (user.role === 'PARENT' || user.role === 'STUDENT') {
    const studentFilter = user.role === 'PARENT'
      ? { parents: { some: { parent: { userId: user.id, deletedAt: null } } } }
      : { userId: user.id };

    const enrollments = await prisma.enrollment.findMany({
      where: { deletedAt: null, schoolYear: { isCurrent: true }, student: { deletedAt: null, ...studentFilter } },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        schoolClass: { select: { id: true, level: true, section: true } },
      },
    });
    const slots = await prisma.timetableSlot.findMany({
      where: { deletedAt: null, classId: { in: enrollments.map((e) => e.classId) } },
      include: slotInclude,
    });
    return {
      students: enrollments.map((e) => ({
        student: { id: e.student.id, name: fullName(e.student) },
        class: { id: e.schoolClass.id, name: className(e.schoolClass) },
        days: toWeek(slots.filter((s) => s.classId === e.classId)),
      })),
    };
  }

  throw new AppError('Use /timetable/classes/:classId', 400);
};