import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { optionalEnum } from '../utils/query.js';

const router = Router();
router.use(authenticate);
router.param('id', (req, res, next, v) =>
  (/^\d+$/.test(v) ? next() : next(new AppError('Invalid id', 400))));

// My in-app notifications
router.get('/', asyncHandler(async (req, res) => {
  const where = { userId: req.user.id, channel: 'IN_APP' };
  if (req.query.unread === 'true') where.readAt = null;
  const items = await prisma.notification.findMany({ where, orderBy: { id: 'desc' }, take: 100 });
  res.json({ status: 'success', data: items });
}));

router.get('/unread-count', asyncHandler(async (req, res) => {
  const count = await prisma.notification.count({
    where: { userId: req.user.id, channel: 'IN_APP', readAt: null },
  });
  res.json({ status: 'success', count });
}));

router.post('/read-all', asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user.id, channel: 'IN_APP', readAt: null }, data: { readAt: new Date() },
  });
  res.json({ status: 'success', updated: result.count });
}));

// Delivery log: who was notified, through which channel, with what result
router.get('/log', authorize('ADMIN'), asyncHandler(async (req, res) => {
  const where = {};
  const status = optionalEnum(req.query.status, ['SENT', 'FAILED', 'SKIPPED'], 'status');
  if (status) where.status = status;
  const channel = optionalEnum(req.query.channel, ['IN_APP', 'EMAIL'], 'channel');
  if (channel) where.channel = channel;
  if (req.query.type) where.type = String(req.query.type);

  const items = await prisma.notification.findMany({
    where, orderBy: { id: 'desc' }, take: 100,
    select: {
      id: true, type: true, channel: true, status: true, error: true, title: true,
      createdAt: true, sentAt: true, user: { select: { id: true, email: true } },
    },
  });
  res.json({ status: 'success', data: items });
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const result = await prisma.notification.updateMany({
    where: { id, userId: req.user.id, readAt: null }, data: { readAt: new Date() },
  });
  if (result.count === 0) {
    const exists = await prisma.notification.findFirst({ where: { id, userId: req.user.id } });
    if (!exists) throw new AppError('Notification not found', 404);
  }
  res.json({ status: 'success' });
}));

export default router;