import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { logAudit } from '../core/audit.service.js';

const include = {
  teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
  subject: true,
  schoolClass: true,
};
const schema = z.object({
  teacherId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  classId: z.number().int().positive(),
});

const router = Router();
router.use(authenticate);
router.param('id', (req, res, next, v) => (/^\d+$/.test(v) ? next() : next(new AppError('Invalid id', 400))));

router.get('/', authorize('ADMIN', 'ACCOUNTANT', 'TEACHER'), asyncHandler(async (req, res) => {
  const where = { deletedAt: null };
  if (req.query.classId) where.classId = Number(req.query.classId);
  if (req.query.teacherId) where.teacherId = Number(req.query.teacherId);
  const items = await prisma.teachingAssignment.findMany({ where, include, take: 500 });
  res.json({ status: 'success', data: items });
}));

router.post('/', authorize('ADMIN'), validate(schema), asyncHandler(async (req, res) => {
  const { teacherId, subjectId, classId } = req.body;
  const record = await prisma.$transaction(async (tx) => {
    const [teacher, subject, cls] = await Promise.all([
      tx.teacher.findFirst({ where: { id: teacherId, deletedAt: null } }),
      tx.subject.findFirst({ where: { id: subjectId, deletedAt: null } }),
      tx.schoolClass.findFirst({ where: { id: classId, deletedAt: null } }),
    ]);
    if (!teacher) throw new AppError('Teacher not found', 400);
    if (!subject) throw new AppError('Subject not found', 400);
    if (!cls) throw new AppError('Class not found', 400);
    if (subject.level !== cls.level) {
      throw new AppError(`Subject level (${subject.level}) does not match class level (${cls.level})`, 400);
    }

    const existing = await tx.teachingAssignment.findUnique({
      where: { teacherId_subjectId_classId: { teacherId, subjectId, classId } },
    });
    if (existing && !existing.deletedAt) throw new AppError('This assignment already exists', 409);

    const saved = existing
      ? await tx.teachingAssignment.update({ where: { id: existing.id }, data: { deletedAt: null }, include })
      : await tx.teachingAssignment.create({ data: { teacherId, subjectId, classId }, include });

    await logAudit(tx, { userId: req.user.id, action: 'CREATE', entity: 'TeachingAssignment', entityId: saved.id, newValues: saved });
    return saved;
  });
  res.status(201).json({ status: 'success', data: record });
}));

router.delete('/:id', authorize('ADMIN'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await prisma.$transaction(async (tx) => {
    const before = await tx.teachingAssignment.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new AppError('Assignment not found', 404);
    await tx.teachingAssignment.update({ where: { id }, data: { deletedAt: new Date() } });
    await logAudit(tx, { userId: req.user.id, action: 'DELETE', entity: 'TeachingAssignment', entityId: id, oldValues: before });
  });
  res.json({ status: 'success', message: 'Deleted' });
}));

export default router;