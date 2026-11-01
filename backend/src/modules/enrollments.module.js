import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { logAudit } from '../core/audit.service.js';
import { enrollStudent, transferEnrollment } from '../services/enrollment.service.js';

const include = { student: true, schoolClass: true };
const createSchema = z.object({
  studentId: z.number().int().positive(),
  classId: z.number().int().positive(),
});
const transferSchema = z.object({ classId: z.number().int().positive() });

const router = Router();
router.use(authenticate);
router.param('id', (req, res, next, v) => (/^\d+$/.test(v) ? next() : next(new AppError('Invalid id', 400))));

const readRoles = ['ADMIN', 'ACCOUNTANT', 'TEACHER'];
const writeRoles = ['ADMIN', 'ACCOUNTANT'];

router.get('/', authorize(...readRoles), asyncHandler(async (req, res) => {
  const where = { deletedAt: null };
  if (req.query.classId) where.classId = Number(req.query.classId);
  if (req.query.schoolYearId) where.schoolYearId = Number(req.query.schoolYearId);
  const items = await prisma.enrollment.findMany({
    where, include, take: 500,
    orderBy: { student: { lastName: 'asc' } },
  });
  res.json({ status: 'success', data: items });
}));

router.post('/', authorize(...writeRoles), validate(createSchema), asyncHandler(async (req, res) => {
  const record = await prisma.$transaction(async (tx) => {
    const e = await enrollStudent(tx, req.body);
    const full = await tx.enrollment.findUnique({ where: { id: e.id }, include });
    await logAudit(tx, { userId: req.user.id, action: 'CREATE', entity: 'Enrollment', entityId: e.id, newValues: full });
    return full;
  });
  res.status(201).json({ status: 'success', data: record });
}));

router.patch('/:id', authorize(...writeRoles), validate(transferSchema), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const record = await prisma.$transaction(async (tx) => {
    const before = await tx.enrollment.findUnique({ where: { id } });
    await transferEnrollment(tx, { enrollmentId: id, classId: req.body.classId });
    const after = await tx.enrollment.findUnique({ where: { id }, include });
    await logAudit(tx, { userId: req.user.id, action: 'UPDATE', entity: 'Enrollment', entityId: id, oldValues: before, newValues: after });
    return after;
  });
  res.json({ status: 'success', data: record });
}));

router.delete('/:id', authorize(...writeRoles), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await prisma.$transaction(async (tx) => {
    const before = await tx.enrollment.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new AppError('Enrollment not found', 404);
    await tx.enrollment.update({ where: { id }, data: { deletedAt: new Date() } });
    await logAudit(tx, { userId: req.user.id, action: 'DELETE', entity: 'Enrollment', entityId: id, oldValues: before });
  });
  res.json({ status: 'success', message: 'Deleted' });
}));

export default router;