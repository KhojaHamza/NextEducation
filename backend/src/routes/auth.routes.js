import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import * as controller from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import {
  authenticate,
  authenticateAllowingTemporaryPassword,
  authorize,
} from '../middlewares/auth.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { status: 'error', message: 'Too many login attempts, try again later' },
});

const platformLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { status: 'error', message: 'Too many login attempts, try again later' },
});

// On accepte n'importe quel format d'email pour le local (.local)
const loginSchema = z.object({
  schoolCode: z.string().trim().optional(),
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

const platformLoginSchema = z.object({
  email: z.string().trim().min(1),
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
router.post('/platform/login', platformLimiter, validate(platformLoginSchema), controller.platformLogin);
router.get('/me', authenticateAllowingTemporaryPassword, controller.me);
router.patch('/password', authenticateAllowingTemporaryPassword, validate(passwordSchema), controller.changePassword);

export default router;