import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { optionalInt } from '../utils/query.js';
import * as timetable from '../services/timetable.service.js';

const positiveId = z.number().int().positive();

// accepts 510 or "08:30", always stores minutes since midnight
const minuteSchema = z.union([
  z.number().int().min(0).max(1440),
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM')
    .transform((t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    }),
]);

const base = z.object({
  classId: positiveId,
  subjectId: positiveId,
  teacherId: positiveId,
  roomId: positiveId.nullable().optional(),
  dayOfWeek: z.enum(timetable.DAYS),
  startMinute: minuteSchema,
  endMinute: minuteSchema,
});

const endAfterStart = (d) =>
  d.startMinute === undefined || d.endMinute === undefined || d.endMinute > d.startMinute;
const endAfterStartError = { message: 'The end time must be after the start time', path: ['endMinute'] };

const createSchema = base.refine(endAfterStart, endAfterStartError);
// `slotId` tells the dry run which existing slot is being edited, so it does not conflict with itself
const checkSchema = base.extend({ slotId: positiveId.optional() }).refine(endAfterStart, endAfterStartError);
const updateSchema = base
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' })
  .refine(endAfterStart, endAfterStartError);

const router = Router();
router.use(authenticate);

const validId = (req, res, next, v) =>
  (/^\d+$/.test(v) ? next() : next(new AppError('Invalid id', 400)));
['id', 'classId', 'teacherId', 'roomId'].forEach((p) => router.param(p, validId));

const readers = authorize('ADMIN', 'TEACHER', 'PARENT', 'STUDENT');

// ---------- Reading ----------

router.get('/me', readers, asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await timetable.myTimetable(req.user) });
}));

router.get('/classes/:classId', readers, asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await timetable.classWeek(req.user, Number(req.params.classId)) });
}));

router.get('/teachers/:teacherId', authorize('ADMIN', 'TEACHER'), asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await timetable.teacherWeek(req.user, Number(req.params.teacherId)) });
}));

router.get('/rooms/:roomId', authorize('ADMIN'), asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await timetable.roomWeek(Number(req.params.roomId)) });
}));

// Flat list, limited to what the user may see
router.get('/', readers, asyncHandler(async (req, res) => {
  const filters = {};
  for (const key of ['classId', 'teacherId', 'roomId']) {
    const value = optionalInt(req.query[key], key);
    if (value) filters[key] = value;
  }
  if (req.query.dayOfWeek) {
    if (!timetable.DAYS.includes(req.query.dayOfWeek)) throw new AppError('Invalid dayOfWeek', 400);
    filters.dayOfWeek = req.query.dayOfWeek;
  }
  res.json({ status: 'success', data: await timetable.listSlots(req.user, filters) });
}));

// ---------- Writing (administrator only) ----------

// Dry run: tells whether a slot would be accepted, saves nothing
router.post('/check', authorize('ADMIN'), validate(checkSchema), asyncHandler(async (req, res) => {
  const { slotId, ...slot } = req.body;
  res.json({ status: 'success', ...(await timetable.checkOnly(slot, slotId)) });
}));

router.post('/', authorize('ADMIN'), validate(createSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ status: 'success', data: await timetable.createSlot(req.user, req.body) });
}));

router.patch('/:id', authorize('ADMIN'), validate(updateSchema), asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await timetable.updateSlot(req.user, Number(req.params.id), req.body) });
}));

router.delete('/:id', authorize('ADMIN'), asyncHandler(async (req, res) => {
  await timetable.deleteSlot(req.user, Number(req.params.id));
  res.json({ status: 'success', message: 'Timetable slot deleted' });
}));

export default router;