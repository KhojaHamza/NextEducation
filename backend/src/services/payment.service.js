import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { logAudit } from '../core/audit.service.js';
import { Decimal, currency, fmt } from '../utils/format.js';
import { computeStudentAccount, resolveYearId } from './account.service.js';
import {
  createInAppNotification, getParentRecipients, sendEmailNotification,
} from './notification.service.js';
import { paymentCancelledMessage, paymentReceivedMessage } from './messageTemplates.js';

export const paymentInclude = {
  student: { select: { id: true, matricule: true, firstName: true, lastName: true } },
};

// Serializes every payment write: no overpayment race, no duplicate receipt numbers.
// (pg_advisory_xact_lock returns "void", which Prisma can only run through $executeRaw.)
const lockPayments = (tx) => tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(7001)');

const startOfTodayUtc = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const findPayment = async (db, id) => {
  const payment = await db.payment.findUnique({ where: { id }, include: paymentInclude });
  if (!payment) throw new AppError('Payment not found', 404);
  return payment;
};

// R-<school year start>-<6 digits>. Cancelled payments keep their number: numbers are never reused.
const nextReceiptNumber = async (tx, year) => {
  const prefix = `R-${year.startDate.getUTCFullYear()}-`;
  const last = await tx.payment.findFirst({
    where: { receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: 'desc' },
    select: { receiptNumber: true },
  });
  const seq = last ? Number(last.receiptNumber.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(6, '0')}`;
};

export const createPayment = async (data, user) => {
  const paidAt = data.paidAt ?? startOfTodayUtc();
  if (paidAt > new Date()) throw new AppError('Payment date cannot be in the future', 400);

  const result = await prisma.$transaction(async (tx) => {
    await lockPayments(tx);

    const student = await tx.student.findFirst({ where: { id: data.studentId, deletedAt: null } });
    if (!student) throw new AppError('Student not found', 404);

    const schoolYearId = await resolveYearId(tx, data.schoolYearId);
    const year = await tx.schoolYear.findFirst({ where: { id: schoolYearId, deletedAt: null } });
    if (!year) throw new AppError('School year not found', 400);

    const before = await computeStudentAccount(tx, student.id, schoolYearId);
    if (before.items.length === 0) {
      throw new AppError('No fees are defined for this student level and school year', 409);
    }
    if (new Decimal(data.amount).gt(before.balance)) {
      throw new AppError(`Amount exceeds the outstanding balance (${fmt(before.balance)} ${currency()})`, 409);
    }

    const payment = await tx.payment.create({
      data: {
        receiptNumber: await nextReceiptNumber(tx, year),
        studentId: student.id, schoolYearId,
        amount: data.amount, method: data.method,
        reference: data.reference ?? null, note: data.note ?? null,
        paidAt, recordedById: user.id,
      },
      include: paymentInclude,
    });

    const after = await computeStudentAccount(tx, student.id, schoolYearId);
    const message = paymentReceivedMessage({ student, payment, balance: after.balance });
    const parents = await getParentRecipients(tx, student.id);
    for (const p of parents) {
      await createInAppNotification(tx, { userId: p.userId, ...message });
    }

    await logAudit(tx, {
      userId: user.id, action: 'CREATE', entity: 'Payment', entityId: payment.id, newValues: payment,
    });
    return { payment, balance: after.balance, parents, message };
  });

  // After the commit: emails are best effort and logged
  const emails = [];
  for (const p of result.parents) {
    emails.push(await sendEmailNotification({ userId: p.userId, email: p.email, ...result.message }));
  }

  return {
    payment: result.payment,
    balance: fmt(result.balance),
    notified: { inApp: result.parents.length, email: emails.map((e) => e.status) },
  };
};

// Only descriptive fields: the amount is immutable (cancel and re-enter instead)
export const updatePayment = (id, data, userId) =>
  prisma.$transaction(async (tx) => {
    const before = await findPayment(tx, id);
    if (before.cancelledAt) throw new AppError('A cancelled payment cannot be edited', 409);

    const method = data.method ?? before.method;
    const reference = data.reference !== undefined ? data.reference : before.reference;
    if (method !== 'CASH' && !reference) {
      throw new AppError('A reference is required for transfers and mobile money', 400);
    }
    if (data.paidAt && data.paidAt > new Date()) {
      throw new AppError('Payment date cannot be in the future', 400);
    }

    const after = await tx.payment.update({ where: { id }, data, include: paymentInclude });
    await logAudit(tx, {
      userId, action: 'UPDATE', entity: 'Payment', entityId: id, oldValues: before, newValues: after,
    });
    return after;
  });

export const cancelPayment = (id, reason, userId) =>
  prisma.$transaction(async (tx) => {
    await lockPayments(tx);
    const before = await findPayment(tx, id);
    if (before.cancelledAt) throw new AppError('This payment is already cancelled', 409);

    const after = await tx.payment.update({
      where: { id },
      data: { cancelledAt: new Date(), cancelReason: reason, cancelledById: userId },
      include: paymentInclude,
    });

    const account = await computeStudentAccount(tx, before.studentId, before.schoolYearId).catch(() => null);
    if (account) {
      const message = paymentCancelledMessage({
        student: before.student, payment: after, balance: account.balance,
      });
      for (const p of await getParentRecipients(tx, before.studentId)) {
        await createInAppNotification(tx, { userId: p.userId, ...message });
      }
    }

    await logAudit(tx, {
      userId, action: 'DELETE', entity: 'Payment', entityId: id, oldValues: before, newValues: after,
    });
    return after;
  });

export const getReceiptData = async (id) => {
  const payment = await prisma.payment.findUnique({
    where: { id }, include: { student: true, schoolYear: true },
  });
  if (!payment) throw new AppError('Payment not found', 404);

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: payment.studentId, schoolYearId: payment.schoolYearId },
    include: { schoolClass: true },
    orderBy: { id: 'desc' },
  });
  const account = await computeStudentAccount(
    prisma, payment.studentId, payment.schoolYearId, { upToPaymentId: payment.id },
  ).catch(() => null);

  return {
    payment, student: payment.student, schoolYear: payment.schoolYear,
    schoolClass: enrollment?.schoolClass ?? null, account,
  };
};