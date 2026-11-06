import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { pushConfigured } from '../services/push.service.js';

const MAX_DEVICES = 10;

const subscribeSchema = z.object({
  endpoint: z.string().url().max(600).startsWith('https://'),
  keys: z.object({
    p256dh: z.string().min(10).max(200),
    auth: z.string().min(10).max(100),
  }),
});
const unsubscribeSchema = z.object({ endpoint: z.string().max(600) });

const router = Router();
router.use(authenticate);

// The browser needs the public VAPID key to create a subscription
router.get('/public-key', (req, res) => {
  res.json({
    status: 'success', enabled: pushConfigured(), key: process.env.VAPID_PUBLIC_KEY || null,
  });
});

router.post('/subscribe', validate(subscribeSchema), asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;
  const userAgent = req.headers['user-agent']?.slice(0, 200);

  // The same browser can be reused by another account: the endpoint moves to the new user
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: req.user.id, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    create: { userId: req.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
  });

  const mine = await prisma.pushSubscription.findMany({
    where: { userId: req.user.id }, orderBy: { id: 'desc' }, select: { id: true },
  });
  if (mine.length > MAX_DEVICES) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: mine.slice(MAX_DEVICES).map((s) => s.id) } } });
  }
  res.status(201).json({ status: 'success' });
}));

router.post('/unsubscribe', validate(unsubscribeSchema), asyncHandler(async (req, res) => {
  await prisma.pushSubscription.deleteMany({
    where: { endpoint: req.body.endpoint, userId: req.user.id },
  });
  res.json({ status: 'success' });
}));

export default router;