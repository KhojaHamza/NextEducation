import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { logAudit } from '../core/audit.service.js';
import { deliver } from '../services/delivery.service.js';

const ROLES = ['ADMIN', 'TEACHER', 'PARENT', 'STUDENT', 'ACCOUNTANT'];

const createSchema = z.object({
  title: z.string().trim().min(3).max(150),
  body: z.string().trim().min(3).max(5000),
  audience: z.union([z.literal('ALL'), z.array(z.enum(ROLES)).min(1)]),
  sendEmail: z.boolean().optional(), // default true: general announcements are also emailed
  correctsId: z.number().int().positive().optional(),
});

const router = Router();
router.use(authenticate);
router.param('id', (req, res, next, v) =>
  (/^\d+$/.test(v) ? next() : next(new AppError('Invalid id', 400))));

// The admin sees everything; everyone else sees announcements aimed at their role
const audienceFilter = (user) => (user.role === 'ADMIN' ? {} : { audience: { has: user.role } });

const shape = (a) => ({
  id: a.id, title: a.title, body: a.body, audience: a.audience, publishedAt: a.publishedAt,
  author: `${a.author.firstName} ${a.author.lastName}`,
  correctsId: a.correctsId,
  corrections: a.corrections,
});

const buildInclude = (user) => ({
  author: { select: { firstName: true, lastName: true } },
  corrections: {
    where: audienceFilter(user), orderBy: { publishedAt: 'asc' },
    select: { id: true, title: true, publishedAt: true },
  },
});

router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const where = audienceFilter(req.user);

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where, include: buildInclude(req.user), orderBy: { id: 'desc' }, skip: (page - 1) * limit, take: limit,
    }),
    prisma.announcement.count({ where }),
  ]);
  res.json({
    status: 'success', data: items.map(shape),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const item = await prisma.announcement.findFirst({
    where: { id: Number(req.params.id), ...audienceFilter(req.user) },
    include: buildInclude(req.user),
  });
  if (!item) throw new AppError('Announcement not found', 404);
  res.json({ status: 'success', data: shape(item) });
}));

// There is deliberately no PATCH and no DELETE: publish a corrective announcement instead
router.post('/', authorize('ADMIN'), validate(createSchema), asyncHandler(async (req, res) => {
  const { title, body, correctsId } = req.body;
  const audience = req.body.audience === 'ALL' ? ROLES : [...new Set(req.body.audience)];

  const result = await prisma.$transaction(async (tx) => {
    if (correctsId) {
      const original = await tx.announcement.findUnique({ where: { id: correctsId } });
      if (!original) throw new AppError('The announcement to correct does not exist', 400);
    }

    const announcement = await tx.announcement.create({
      data: { title, body, audience, correctsId: correctsId ?? null, authorId: req.user.id },
      include: buildInclude(req.user),
    });

    const users = await tx.user.findMany({
      where: { role: { in: audience }, isActive: true, deletedAt: null, id: { not: req.user.id } },
      select: { id: true, email: true },
    });

    const content = {
      type: 'ANNOUNCEMENT',
      title: `${correctsId ? 'Correction' : 'Annonce'} : ${title}`,
      body: body.length > 300 ? `${body.slice(0, 297)}...` : body,
      data: { announcementId: announcement.id },
      link: `${process.env.CLIENT_URL || ''}/announcements/${announcement.id}`,
    };
    const now = new Date();
    await tx.notification.createMany({
      data: users.map((u) => ({
        userId: u.id, type: content.type, channel: 'IN_APP', title: content.title,
        body: content.body, data: content.data, status: 'SENT', sentAt: now,
      })),
    });

    await logAudit(tx, {
      userId: req.user.id, action: 'CREATE', entity: 'Announcement', entityId: announcement.id,
      newValues: { id: announcement.id, title, audience, correctsId },
    });
    return { announcement, users, content };
  });

  // Push and email run in the background; the response does not wait for them
  void deliver(
    result.users.map((u) => ({ userId: u.id, email: u.email })),
    result.content,
    { email: req.body.sendEmail !== false },
  );

  res.status(201).json({
    status: 'success', data: shape(result.announcement), notified: result.users.length,
  });
}));

export default router;