import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { logAudit } from '../core/audit.service.js';
import { optionalInt, optionalEnum, optionalDate } from '../utils/query.js';
import {
  assertCanAccessClass, assertParentOfStudent, classFilterFor,
} from '../services/access.service.js';

const STATUSES = ['NONE', 'PENDING', 'ACCEPTED', 'REJECTED'];
const include = {
  student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
  schoolClass: { select: { id: true, level: true, section: true } },
};

const createSchema = z.object({
  studentId: z.number().int().positive(),
  date: z.coerce.date(),
  period: z.enum(['MORNING', 'AFTERNOON']),
});
const justifySchema = z.object({ reason: z.string().trim().min(3).max(500) });
const reviewSchema = z.object({
  decision: z.enum(['ACCEPTED', 'REJECTED']),
  note: z.string().trim().max(300).optional(),
});

const findAbsence = async (db, id) => {
  const absence = await db.absence.findFirst({ where: { id, deletedAt: null }, include });
  if (!absence) throw new AppError('Absence not found', 404);
  return absence;
};

const router = Router();
router.use(authenticate);
router.param('id', (req, res, next, v) =>
  (/^\d+$/.test(v) ? next() : next(new AppError('Invalid id', 400))));

router.get('/', authorize('ADMIN', 'TEACHER'), asyncHandler(async (req, res) => {
  const where = { deletedAt: null };
  const classId = await classFilterFor(req.user, optionalInt(req.query.classId, 'classId'));
  if (classId !== undefined) where.classId = classId;

  const studentId = optionalInt(req.query.studentId, 'studentId');
  if (studentId) where.studentId = studentId;
  const status = optionalEnum(req.query.status, STATUSES, 'status');
  if (status) where.justificationStatus = status;

  const from = optionalDate(req.query.from, 'from');
  const to = optionalDate(req.query.to, 'to');
  if (from || to) where.date = { ...(from && { gte: from }), ...(to && { lte: to }) };

  const items = await prisma.absence.findMany({
    where, include, orderBy: [{ date: 'desc' }, { id: 'desc' }], take: 200,
  });
  res.json({ status: 'success', data: items });
}));

// A parent sees the absences of their own children only
router.get('/mine', authorize('PARENT'), asyncHandler(async (req, res) => {
  const links = await prisma.studentParent.findMany({
    where: { parent: { userId: req.user.id, deletedAt: null }, student: { deletedAt: null } },
    select: { studentId: true },
  });
  const items = await prisma.absence.findMany({
    where: { deletedAt: null, studentId: { in: links.map((l) => l.studentId) } },
    include, orderBy: [{ date: 'desc' }, { id: 'desc' }], take: 200,
  });
  res.json({ status: 'success', data: items });
}));

router.post('/', authorize('ADMIN', 'TEACHER'), validate(createSchema), asyncHandler(async (req, res) => {
  const { studentId, date, period } = req.body;
  const record = await prisma.$transaction(async (tx) => {
    const student = await tx.student.findFirst({ where: { id: studentId, deletedAt: null } });
    if (!student) throw new AppError('Student not found', 404);
    if (date > new Date()) throw new AppError('An absence cannot be in the future', 400);

    const year = await tx.schoolYear.findFirst({
      where: { startDate: { lte: date }, endDate: { gte: date }, deletedAt: null },
    });
    if (!year) throw new AppError('No school year covers this date', 400);

    const enrollment = await tx.enrollment.findFirst({
      where: { studentId, schoolYearId: year.id, deletedAt: null },
    });
    if (!enrollment) throw new AppError(`Student is not enrolled in ${year.label}`, 400);
    await assertCanAccessClass(req.user, enrollment.classId);

    const existing = await tx.absence.findUnique({
      where: { studentId_date_period: { studentId, date, period } },
    });
    if (existing && !existing.deletedAt) throw new AppError('This absence is already recorded', 409);

    const data = {
      classId: enrollment.classId, schoolYearId: year.id, recordedById: req.user.id,
      justificationStatus: 'NONE', justificationReason: null, reviewNote: null,
      reviewedAt: null, deletedAt: null,
    };
    const saved = existing
      ? await tx.absence.update({ where: { id: existing.id }, data, include })
      : await tx.absence.create({ data: { studentId, date, period, ...data }, include });

    await logAudit(tx, {
      userId: req.user.id, action: 'CREATE', entity: 'Absence', entityId: saved.id, newValues: saved,
    });
    return saved;
  });
  res.status(201).json({ status: 'success', data: record });
}));

router.delete('/:id', authorize('ADMIN', 'TEACHER'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await prisma.$transaction(async (tx) => {
    const before = await findAbsence(tx, id);
    await assertCanAccessClass(req.user, before.classId);
    await tx.absence.update({ where: { id }, data: { deletedAt: new Date() } });
    await logAudit(tx, {
      userId: req.user.id, action: 'DELETE', entity: 'Absence', entityId: id, oldValues: before,
    });
  });
  res.json({ status: 'success', message: 'Deleted' });
}));

// Parent submits a justification
router.post('/:id/justify', authorize('PARENT'), validate(justifySchema), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const record = await prisma.$transaction(async (tx) => {
    const before = await findAbsence(tx, id);
    await assertParentOfStudent(req.user.id, before.studentId);
    if (!['NONE', 'REJECTED'].includes(before.justificationStatus)) {
      throw new AppError('A justification was already submitted for this absence', 409);
    }
    const after = await tx.absence.update({
      where: { id },
      data: {
        justificationStatus: 'PENDING', justificationReason: req.body.reason,
        reviewNote: null, reviewedAt: null,
      },
      include,
    });
    await logAudit(tx, {
      userId: req.user.id, action: 'UPDATE', entity: 'Absence', entityId: id,
      oldValues: before, newValues: after,
    });
    return after;
  });
  res.json({ status: 'success', data: record });
}));

// Admin accepts or rejects (also works for a paper note brought to the office)
router.patch('/:id/review', authorize('ADMIN'), validate(reviewSchema), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const record = await prisma.$transaction(async (tx) => {
    const before = await findAbsence(tx, id);
    if (before.justificationStatus === 'ACCEPTED') {
      throw new AppError('This absence is already justified', 409);
    }
    const after = await tx.absence.update({
      where: { id },
      data: {
        justificationStatus: req.body.decision,
        reviewNote: req.body.note ?? null,
        reviewedAt: new Date(),
      },
      include,
    });
    await logAudit(tx, {
      userId: req.user.id, action: 'UPDATE', entity: 'Absence', entityId: id,
      oldValues: before, newValues: after,
    });
    return after;
  });
  res.json({ status: 'success', data: record });
}));

export default router;