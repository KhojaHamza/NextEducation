import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { logAudit } from '../core/audit.service.js';
import { optionalEnum } from '../utils/query.js';
import { createUserAccount, generateTempPassword, userSelect } from '../services/userAccount.service.js';

const ROLES = ['ADMIN', 'TEACHER', 'PARENT', 'STUDENT', 'ACCOUNTANT'];

// Teachers and parents are created through their own routes (they need a profile)
const staffSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: z.string().trim().max(30).optional(),
  role: z.enum(['ADMIN', 'ACCOUNTANT']),
});
const activeSchema = z.object({ isActive: z.boolean() });

const router = Router();
router.use(authenticate, authorize('ADMIN'));
router.param('id', (req, res, next, v) =>
  (/^\d+$/.test(v) ? next() : next(new AppError('Invalid id', 400))));

router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const where = { deletedAt: null };

  const role = optionalEnum(req.query.role, ROLES, 'role');
  if (role) where.role = role;
  if (req.query.search) {
    where.OR = ['firstName', 'lastName', 'email'].map((f) => ({
      [f]: { contains: String(req.query.search), mode: 'insensitive' },
    }));
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where, select: userSelect, orderBy: { lastName: 'asc' }, skip: (page - 1) * limit, take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  res.json({
    status: 'success', data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}));

router.post('/', validate(staffSchema), asyncHandler(async (req, res) => {
  const result = await prisma.$transaction(async (tx) => {
    const { user, tempPassword } = await createUserAccount(tx, req.body);
    await logAudit(tx, {
      userId: req.user.id, action: 'CREATE', entity: 'User', entityId: user.id, newValues: user,
    });
    return { user, tempPassword };
  });
  res.status(201).json({ status: 'success', data: result.user, tempPassword: result.tempPassword });
}));

router.patch('/:id/active', validate(activeSchema), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { isActive } = req.body;
  const after = await prisma.$transaction(async (tx) => {
    const before = await tx.user.findFirst({ where: { id, deletedAt: null }, select: userSelect });
    if (!before) throw new AppError('User not found', 404);
    if (id === req.user.id) throw new AppError('You cannot change your own status', 409);

    if (before.role === 'ADMIN' && !isActive) {
      const others = await tx.user.count({
        where: { role: 'ADMIN', isActive: true, deletedAt: null, id: { not: id } },
      });
      if (others === 0) throw new AppError('This is the last active administrator', 409);
    }

    const updated = await tx.user.update({ where: { id }, data: { isActive }, select: userSelect });
    await logAudit(tx, {
      userId: req.user.id, action: 'UPDATE', entity: 'User', entityId: id,
      oldValues: before, newValues: updated,
    });
    return updated;
  });
  res.json({ status: 'success', data: after });
}));

// New temporary password (lost password, first handover). The user must change it at next login.
router.post('/:id/reset-password', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const tempPassword = generateTempPassword();
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new AppError('User not found', 404);
    await tx.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(tempPassword, 10), mustChangePassword: true },
    });
    await logAudit(tx, {
      userId: req.user.id, action: 'UPDATE', entity: 'User', entityId: id, newValues: { passwordReset: true },
    });
  });
  res.json({ status: 'success', tempPassword });
}));

export default router;