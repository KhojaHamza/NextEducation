import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { logAudit } from '../core/audit.service.js';
import { createUserAccount, userSelect } from '../services/userAccount.service.js';

const userFields = {
  email: z.string().trim().toLowerCase().email(),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: z.string().trim().max(30).optional(),
};

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

export const createPersonRouter = ({
  role, model, entity, profileShape, beforeDelete, readRoles, writeRoles,
}) => {
  const userKeys = Object.keys(userFields);
  const profileKeys = Object.keys(profileShape);
  const include = { user: { select: userSelect } };
  const createSchema = z.object({ ...userFields, ...profileShape });
  const updateSchema = createSchema.partial();

  const findActive = async (db, id) => {
    const record = await db[model].findFirst({ where: { id, deletedAt: null }, include });
    if (!record) throw new AppError(`${entity} not found`, 404);
    return record;
  };

  const list = asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const where = { deletedAt: null };
    if (req.query.search) {
      where.user = {
        OR: ['firstName', 'lastName', 'email'].map((f) => ({
          [f]: { contains: String(req.query.search), mode: 'insensitive' },
        })),
      };
    }
    const [items, total] = await Promise.all([
      prisma[model].findMany({
        where, include, orderBy: { user: { lastName: 'asc' } },
        skip: (page - 1) * limit, take: limit,
      }),
      prisma[model].count({ where }),
    ]);
    res.json({
      status: 'success', data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  const get = asyncHandler(async (req, res) => {
    res.json({ status: 'success', data: await findActive(prisma, Number(req.params.id)) });
  });

  const create = asyncHandler(async (req, res) => {
    const result = await prisma.$transaction(async (tx) => {
      const { user, tempPassword } = await createUserAccount(tx, {
        ...pick(req.body, userKeys), role,
      });
      const record = await tx[model].create({
        data: { userId: user.id, ...pick(req.body, profileKeys) }, include,
      });
      await logAudit(tx, {
        userId: req.user.id, action: 'CREATE', entity, entityId: record.id, newValues: record,
      });
      return { record, tempPassword };
    });
    res.status(201).json({ status: 'success', data: result.record, tempPassword: result.tempPassword });
  });

  const update = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const record = await prisma.$transaction(async (tx) => {
      const before = await findActive(tx, id);
      const userData = pick(req.body, userKeys);

      if (userData.email && userData.email !== before.user.email) {
        const taken = await tx.user.findUnique({ where: { email: userData.email } });
        if (taken) throw new AppError('This email is already used', 409);
      }
      if (Object.keys(userData).length) {
        await tx.user.update({ where: { id: before.userId }, data: userData });
      }
      const after = await tx[model].update({
        where: { id }, data: pick(req.body, profileKeys), include,
      });
      await logAudit(tx, {
        userId: req.user.id, action: 'UPDATE', entity, entityId: id,
        oldValues: before, newValues: after,
      });
      return after;
    });
    res.json({ status: 'success', data: record });
  });

  const remove = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await prisma.$transaction(async (tx) => {
      const before = await findActive(tx, id);
      if (beforeDelete) await beforeDelete(tx, before);
      const now = new Date();
      await tx[model].update({ where: { id }, data: { deletedAt: now } });
      // The login is disabled too: the auth middleware rejects deleted users
      await tx.user.update({ where: { id: before.userId }, data: { deletedAt: now, isActive: false } });
      await logAudit(tx, {
        userId: req.user.id, action: 'DELETE', entity, entityId: id, oldValues: before,
      });
    });
    res.json({ status: 'success', message: 'Deleted' });
  });

  const router = Router();
  router.use(authenticate);
  router.param('id', (req, res, next, value) =>
    /^\d+$/.test(value) ? next() : next(new AppError('Invalid id', 400)));

  router.get('/', authorize(...readRoles), list);
  router.get('/:id', authorize(...readRoles), get);
  router.post('/', authorize(...writeRoles), validate(createSchema), create);
  router.patch('/:id', authorize(...writeRoles), validate(updateSchema), update);
  router.delete('/:id', authorize(...writeRoles), remove);
  return router;
};