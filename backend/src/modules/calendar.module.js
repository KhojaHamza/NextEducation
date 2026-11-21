import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.js';
import { optionalDate } from '../utils/query.js';
import { visibleClassIds } from '../services/classScope.service.js';

const MAX_DAYS = 100;
const day = (d) => d.toISOString().slice(0, 10);

const router = Router();
router.use(authenticate);

// GET /api/calendar?from=2026-11-01&to=2026-11-30
// One list for every role: homework, tests, exams, school events, payment deadlines.
router.get('/', asyncHandler(async (req, res) => {
  const from = optionalDate(req.query.from, 'from');
  const to = optionalDate(req.query.to, 'to');
  if (!from || !to) throw new AppError('from and to are required', 400);
  if (to < from) throw new AppError('Invalid range', 400);
  if ((to - from) / 86400000 > MAX_DAYS) throw new AppError(`Range is limited to ${MAX_DAYS} days`, 400);

  const ids = await visibleClassIds(req.user);
  const hasClasses = ids === null || ids.length > 0;
  const classWhere = ids === null ? {} : { classId: { in: ids } };
  const role = req.user.role;
  const wantsFees = ['ADMIN', 'ACCOUNTANT', 'PARENT'].includes(role) && (role !== 'PARENT' || hasClasses);

  let feeLevel = {};
  if (role === 'PARENT' && ids?.length) {
    const classes = await prisma.schoolClass.findMany({ where: { id: { in: ids } }, select: { level: true } });
    feeLevel = { OR: [{ level: null }, { level: { in: [...new Set(classes.map((c) => c.level))] } }] };
  }

  const [homeworks, evaluations, events, fees] = await Promise.all([
    hasClasses
      ? prisma.homework.findMany({
          where: { deletedAt: null, dueDate: { gte: from, lte: to }, ...classWhere },
          include: { subject: true, schoolClass: true },
        })
      : [],
    hasClasses
      ? prisma.evaluation.findMany({
          where: { deletedAt: null, date: { gte: from, lte: to }, ...classWhere },
          include: { subject: true, schoolClass: true },
        })
      : [],
    prisma.schoolEvent.findMany({
      where: {
        deletedAt: null,
        date: { lte: to },
        OR: [{ endDate: null, date: { gte: from } }, { endDate: { gte: from } }],
      },
    }),
    wantsFees
      ? prisma.feeItem.findMany({
          where: { deletedAt: null, dueDate: { gte: from, lte: to }, ...feeLevel },
        })
      : [],
  ]);

  const where = (c) => `${c.level} ${c.section}`;
  const items = [
    ...homeworks.map((h) => ({
      key: `homework-${h.id}`, id: h.id, type: 'HOMEWORK', title: h.title,
      subtitle: `${h.subject.name} · ${where(h.schoolClass)}`, date: day(h.dueDate), endDate: null,
    })),
    ...evaluations.map((e) => ({
      key: `evaluation-${e.id}`, id: e.id, type: e.type === 'EXAM' ? 'EXAM' : 'TEST', title: e.title,
      subtitle: `${e.subject.name} · ${where(e.schoolClass)}`, date: day(e.date), endDate: null,
    })),
    ...events.map((e) => ({
      key: `event-${e.id}`, id: e.id, type: 'EVENT', title: e.title, subtitle: e.description ?? '',
      date: day(e.date), endDate: e.endDate ? day(e.endDate) : null,
    })),
    ...fees.map((f) => ({
      key: `fee-${f.id}`, id: f.id, type: 'DEADLINE', title: f.name,
      subtitle: 'Échéance de paiement', date: day(f.dueDate), endDate: null,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));

  res.json({ status: 'success', data: items });
}));

export default router;