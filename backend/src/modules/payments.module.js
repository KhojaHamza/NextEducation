import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { optionalDate, optionalEnum, optionalInt } from '../utils/query.js';
import { amountSchema, fmt } from '../utils/format.js';
import { assertParentOfStudent } from '../services/access.service.js';
import {
  computeStudentAccount, computeYearAccounts, resolveYearId, serializeAccount,
} from '../services/account.service.js';
import {
  cancelPayment, createPayment, getReceiptData, paymentInclude, updatePayment,
} from '../services/payment.service.js';
import { streamReceiptPdf } from '../services/receiptPdf.service.js';
import { runReminders } from '../services/reminder.service.js';
import { Decimal, ZERO } from '../utils/format.js';

const METHODS = ['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY'];
const methodEnum = z.enum(METHODS);

const createSchema = z
  .object({
    studentId: z.number().int().positive(),
    schoolYearId: z.number().int().positive().optional(),
    amount: amountSchema,
    method: methodEnum,
    reference: z.string().trim().max(100).optional(),
    note: z.string().trim().max(300).optional(),
    paidAt: z.coerce.date().optional(),
  })
  .refine((d) => d.method === 'CASH' || (d.reference && d.reference.length > 0), {
    message: 'A reference is required for transfers and mobile money',
    path: ['reference'],
  });

// Amount is deliberately absent: unknown fields are stripped by validation
const updateSchema = z
  .object({
    method: methodEnum,
    reference: z.string().trim().max(100).nullable(),
    note: z.string().trim().max(300).nullable(),
    paidAt: z.coerce.date(),
  })
  .partial();

const cancelSchema = z.object({ reason: z.string().trim().min(3).max(300) });

const router = Router();
router.use(authenticate);
const validId = (req, res, next, v) =>
  (/^\d+$/.test(v) ? next() : next(new AppError('Invalid id', 400)));
router.param('id', validId);
router.param('studentId', validId);

const finance = ['ADMIN', 'ACCOUNTANT'];

// ---------- Lists ----------

router.get('/', authorize(...finance), asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const where = {};

  const studentId = optionalInt(req.query.studentId, 'studentId');
  if (studentId) where.studentId = studentId;
  const schoolYearId = optionalInt(req.query.schoolYearId, 'schoolYearId');
  if (schoolYearId) where.schoolYearId = schoolYearId;
  const method = optionalEnum(req.query.method, METHODS, 'method');
  if (method) where.method = method;
  if (req.query.includeCancelled !== 'true') where.cancelledAt = null;

  const from = optionalDate(req.query.from, 'from');
  const to = optionalDate(req.query.to, 'to');
  if (from || to) where.paidAt = { ...(from && { gte: from }), ...(to && { lte: to }) };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where, include: paymentInclude, orderBy: { id: 'desc' }, skip: (page - 1) * limit, take: limit,
    }),
    prisma.payment.count({ where }),
  ]);
  res.json({
    status: 'success', data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}));

// Payments of the parent's own children
router.get('/mine', authorize('PARENT'), asyncHandler(async (req, res) => {
  const links = await prisma.studentParent.findMany({
    where: { parent: { userId: req.user.id, deletedAt: null }, student: { deletedAt: null } },
    select: { studentId: true },
  });
  const items = await prisma.payment.findMany({
    where: { studentId: { in: links.map((l) => l.studentId) } },
    include: paymentInclude, orderBy: { id: 'desc' }, take: 200,
  });
  res.json({ status: 'success', data: items });
}));

// Unpaid balances (default: overdue only; ?all=true lists every positive balance)
router.get('/overdue', authorize(...finance), asyncHandler(async (req, res) => {
  const schoolYearId = await resolveYearId(prisma, optionalInt(req.query.schoolYearId, 'schoolYearId'));
  const classId = optionalInt(req.query.classId, 'classId');
  const all = req.query.all === 'true';

  const accounts = (await computeYearAccounts(prisma, schoolYearId, { classId }))
    .filter((a) => (all ? a.balance.gt(0) : a.overdueAmount.gt(0)))
    .sort((a, b) => b.overdueAmount.comparedTo(a.overdueAmount));

  const sum = (key) => accounts.reduce((acc, a) => acc.plus(a[key]), ZERO());
  res.json({
    status: 'success',
    totals: { balance: fmt(sum('balance')), overdue: fmt(sum('overdueAmount')), students: accounts.length },
    data: accounts.map((a) => ({
      student: {
        id: a.student.id, matricule: a.student.matricule,
        firstName: a.student.firstName, lastName: a.student.lastName,
      },
      class: `${a.schoolClass.level} ${a.schoolClass.section}`,
      due: fmt(a.due), paid: fmt(a.paid), balance: fmt(a.balance), overdueAmount: fmt(a.overdueAmount),
    })),
  });
}));

// A student's account: installments, paid, balance. Parents: own children only.
router.get('/account/:studentId', authorize('ADMIN', 'ACCOUNTANT', 'PARENT'), asyncHandler(async (req, res) => {
  const studentId = Number(req.params.studentId);
  if (req.user.role === 'PARENT') await assertParentOfStudent(req.user.id, studentId);

  const schoolYearId = await resolveYearId(prisma, optionalInt(req.query.schoolYearId, 'schoolYearId'));
  const account = await computeStudentAccount(prisma, studentId, schoolYearId);
  res.json({
    status: 'success',
    data: {
      studentId, schoolYear: account.enrollment.schoolYear.label,
      class: `${account.enrollment.schoolClass.level} ${account.enrollment.schoolClass.section}`,
      ...serializeAccount(account),
    },
  });
}));

router.get('/:id/receipt', authorize('ADMIN', 'ACCOUNTANT', 'PARENT'), asyncHandler(async (req, res) => {
  const receipt = await getReceiptData(Number(req.params.id));
  if (req.user.role === 'PARENT') await assertParentOfStudent(req.user.id, receipt.payment.studentId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="recu-${receipt.payment.receiptNumber}.pdf"`);
  streamReceiptPdf(receipt, res);
}));

router.get('/:id', authorize(...finance), asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findUnique({
    where: { id: Number(req.params.id) }, include: paymentInclude,
  });
  if (!payment) throw new AppError('Payment not found', 404);
  res.json({ status: 'success', data: payment });
}));

// ---------- Writes ----------

router.post('/', authorize(...finance), validate(createSchema), asyncHandler(async (req, res) => {
  const result = await createPayment(req.body, req.user);
  res.status(201).json({
    status: 'success', data: result.payment, balance: result.balance, notified: result.notified,
  });
}));

router.patch('/:id', authorize(...finance), validate(updateSchema), asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await updatePayment(Number(req.params.id), req.body, req.user.id) });
}));

router.post('/:id/cancel', authorize('ADMIN'), validate(cancelSchema), asyncHandler(async (req, res) => {
  res.json({
    status: 'success',
    data: await cancelPayment(Number(req.params.id), req.body.reason, req.user.id),
  });
}));

// Manual trigger of the reminders (?dryRun=true previews without sending)
router.post('/reminders/run', authorize(...finance), asyncHandler(async (req, res) => {
  const result = await runReminders({ dryRun: req.query.dryRun === 'true' });
  res.json({ status: 'success', ...result });
}));

export default router;