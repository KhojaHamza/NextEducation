import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.entity) where.entity = String(req.query.entity);
    if (req.query.entityId) where.entityId = Number(req.query.entityId);

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { email: true } } },
    });
    res.json({ status: 'success', data: logs });
  }),
);

export default router;