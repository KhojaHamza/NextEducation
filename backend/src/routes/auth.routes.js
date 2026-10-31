import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import * as controller from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Slows down brute-force attempts on the login route
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { status: 'error', message: 'Too many login attempts, try again later' },
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'At least one uppercase letter')
    .regex(/[0-9]/, 'At least one number'),
});

router.post('/login', loginLimiter, validate(loginSchema), controller.login);
router.get('/me', authenticate, controller.me);
router.patch('/password', authenticate, validate(passwordSchema), controller.changePassword);

// TEMPORARY route to test RBAC, we remove it later
router.get('/admin-only', authenticate, authorize('ADMIN'), (req, res) => {
  res.json({ status: 'success', message: 'Welcome, admin' });
});

export default router;