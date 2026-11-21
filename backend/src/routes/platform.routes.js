import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import * as service from '../services/platform.service.js';

const router = Router();
router.use(authenticate, authorize('SUPER_ADMIN'));
router.param('id', (req, res, next, v) =>
  (/^\d+$/.test(v) ? next() : next(new AppError('Invalid id', 400))));

const STATUSES = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'DISABLED'];
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

const createSchema = z.object({
  code: z.string().trim().toLowerCase().min(3).max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, digits and single hyphens only'),
  name: z.string().trim().min(2).max(120),
  plan: z.string().trim().min(1).max(30).optional(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
  subscriptionEnd: dateOnly.nullable().optional(),
  address: z.string().trim().max(255).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  admin: z.object({
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    email: z.string().trim().email(),
  }),
});

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  plan: z.string().trim().min(1).max(30),
  currency: z.string().trim().length(3).toUpperCase(),
  subscriptionEnd: dateOnly.nullable(),
  address: z.string().trim().max(255).nullable(),
  phone: z.string().trim().max(30).nullable(),
}).partial();

const statusSchema = z.object({ status: z.enum(STATUSES) });
const resetSchema = z.object({ email: z.string().trim().min(1) });

const noStore = (res) => res.set('Cache-Control', 'no-store');

router.get('/schools', asyncHandler(async (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
  const data = await service.listSchools({ status, search });
  res.json({ status: 'success', data });
}));

router.get('/schools/:id', asyncHandler(async (req, res) => {
  const data = await service.getSchool(Number(req.params.id));
  res.json({ status: 'success', data });
}));

router.post('/schools', validate(createSchema), asyncHandler(async (req, res) => {
  const data = await service.createSchool(req.user, req.body);
  noStore(res).status(201).json({ status: 'success', data });
}));

router.patch('/schools/:id', validate(updateSchema), asyncHandler(async (req, res) => {
  const data = await service.updateSchool(req.user, Number(req.params.id), req.body);
  res.json({ status: 'success', data });
}));

router.patch('/schools/:id/status', validate(statusSchema), asyncHandler(async (req, res) => {
  const data = await service.setSchoolStatus(req.user, Number(req.params.id), req.body.status);
  res.json({ status: 'success', data });
}));

router.post('/schools/:id/admin-password-reset', validate(resetSchema), asyncHandler(async (req, res) => {
  const data = await service.resetSchoolAdminPassword(req.user, Number(req.params.id), req.body.email);
  noStore(res).json({ status: 'success', data });
}));

router.get('/audit-logs', asyncHandler(async (req, res) => {
  const schoolId = /^\d+$/.test(String(req.query.schoolId ?? '')) ? Number(req.query.schoolId) : undefined;
  const data = await service.listPlatformAuditLogs({ schoolId, limit: req.query.limit });
  res.json({ status: 'success', data });
}));

export default router;