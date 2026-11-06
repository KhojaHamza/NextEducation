import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { Decimal, ZERO, fmt } from '../utils/format.js';

const todayUtc = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export const resolveYearId = async (db, schoolYearId) => {
  if (schoolYearId) return schoolYearId;
  const current = await db.schoolYear.findFirst({ where: { isCurrent: true, deletedAt: null } });
  if (!current) throw new AppError('No current school year: set one first', 400);
  return current.id;
};

// Applies the total paid to the installments, oldest due date first
export const allocate = (items, paid) => {
  const today = todayUtc();
  let remaining = new Decimal(paid);
  let due = ZERO();
  let overdueAmount = ZERO();

  const rows = items.map((item) => {
    const amount = new Decimal(item.amount);
    const applied = Decimal.min(amount, remaining);
    remaining = remaining.minus(applied);
    const outstanding = amount.minus(applied);
    const overdue = outstanding.gt(0) && item.dueDate < today;

    due = due.plus(amount);
    if (overdue) overdueAmount = overdueAmount.plus(outstanding);

    return {
      id: item.id, name: item.name, type: item.type, dueDate: item.dueDate,
      amount, paid: applied, outstanding, overdue,
      status: outstanding.isZero() ? 'PAID' : applied.isZero() ? 'UNPAID' : 'PARTIAL',
    };
  });

  return { due, paid: new Decimal(paid), balance: due.minus(paid), overdueAmount, items: rows };
};

export const serializeAccount = (a) => ({
  due: fmt(a.due),
  paid: fmt(a.paid),
  balance: fmt(a.balance),
  overdueAmount: fmt(a.overdueAmount),
  items: a.items.map((r) => ({
    ...r, amount: fmt(r.amount), paid: fmt(r.paid), outstanding: fmt(r.outstanding),
  })),
});

// upToPaymentId: balance as it was when that payment was recorded (used on receipts)
export const computeStudentAccount = async (db, studentId, schoolYearId, { upToPaymentId } = {}) => {
  const enrollment = await db.enrollment.findFirst({
    where: { studentId, schoolYearId, deletedAt: null },
    include: { schoolClass: true, schoolYear: true },
  });
  if (!enrollment) throw new AppError('Student is not enrolled for this school year', 404);

  const [items, agg] = await Promise.all([
    db.feeItem.findMany({
      where: {
        schoolYearId, deletedAt: null,
        OR: [{ level: null }, { level: enrollment.schoolClass.level }],
      },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    }),
    db.payment.aggregate({
      _sum: { amount: true },
      where: {
        studentId, schoolYearId, cancelledAt: null,
        ...(upToPaymentId && { id: { lte: upToPaymentId } }),
      },
    }),
  ]);

  return { enrollment, ...allocate(items, agg._sum.amount ?? ZERO()) };
};

// All students of a year in 3 queries (used for the unpaid list and reminders)
export const computeYearAccounts = async (db, schoolYearId, { classId } = {}) => {
  const [enrollments, items, paidGroups] = await Promise.all([
    db.enrollment.findMany({
      where: {
        schoolYearId, deletedAt: null, student: { deletedAt: null },
        ...(classId && { classId }),
      },
      include: { student: true, schoolClass: true },
    }),
    db.feeItem.findMany({
      where: { schoolYearId, deletedAt: null },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    }),
    db.payment.groupBy({
      by: ['studentId'],
      where: { schoolYearId, cancelledAt: null },
      _sum: { amount: true },
    }),
  ]);

  const paidBy = new Map(paidGroups.map((g) => [g.studentId, g._sum.amount ?? ZERO()]));

  return enrollments.map((e) => {
    const applicable = items.filter((i) => i.level === null || i.level === e.schoolClass.level);
    return {
      student: e.student,
      schoolClass: e.schoolClass,
      ...allocate(applicable, paidBy.get(e.studentId) ?? ZERO()),
    };
  });
};

// Years where a student still owes money (used before deleting a student)
export const getUnpaidYears = async (db, studentId) => {
  const enrollments = await db.enrollment.findMany({
    where: { studentId, deletedAt: null }, select: { schoolYearId: true },
  });
  const unpaid = [];
  for (const e of enrollments) {
    const acc = await computeStudentAccount(db, studentId, e.schoolYearId);
    if (acc.balance.gt(0)) unpaid.push({ label: acc.enrollment.schoolYear.label, balance: fmt(acc.balance) });
  }
  return unpaid;
};