import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { logAudit } from '../core/audit.service.js';
import { notifyUsers } from '../services/notify.service.js';

const createSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    description: z.string().trim().max(2000).optional(),
    date: z.coerce.date(),
    endDate: z.coerce.date().optional(),
  })
  .refine((d) => !d.endDate || d.endDate >= d.date, {
    message: 'End date must not be before the start date',
    path: ['endDate'],
  });

const router = Router();
router.use(authenticate);
router.param('id', (req, res, next, v) =>
  (/^\d+$/.test(v) ? next() : next(new AppError('Invalid id', 400))));

// Reading is done through GET /api/calendar. Only the administration manages events.
router.post('/', authorize('ADMIN'), validate(createSchema), asyncHandler(async (req, res) => {
  const record = await prisma.$transaction(async (tx) => {
    const created = await tx.schoolEvent.create({ data: { ...req.body, createdById: req.user.id } });
    await logAudit(tx, {
      userId: req.user.id, action: 'CREATE', entity: 'SchoolEvent', entityId: created.id, newValues: created,
    });
    return created;
  });
  // Everyone in the school is told; a failure here must not undo the event
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true, deletedAt: null, id: { not: req.user.id } },
      select: { id: true, email: true },
    });
    const when = record.date.toISOString().slice(0, 10).split('-').reverse().join('/');
    await notifyUsers(prisma, users, {
      type: 'SCHOOL_EVENT',
      title: `Nouvel événement : ${record.title}`,
      body: `Le ${when}${record.description ? ` - ${record.description.slice(0, 200)}` : ''}`,
      data: { eventId: record.id },
      link: `${process.env.CLIENT_URL || ''}/calendrier`,
    });
  } catch (err) {
    console.error('[events] notification failed', err);
  }

  res.status(201).json({ status: 'success', data: record });
}));

router.delete('/:id', authorize('ADMIN'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await prisma.$transaction(async (tx) => {
    const before = await tx.schoolEvent.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw new AppError('Event not found', 404);
    await tx.schoolEvent.update({ where: { id }, data: { deletedAt: new Date() } });
    await logAudit(tx, {
      userId: req.user.id, action: 'DELETE', entity: 'SchoolEvent', entityId: id, oldValues: before,
    });
  });
  res.json({ status: 'success', message: 'Deleted' });
}));

export default router;