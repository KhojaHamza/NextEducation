import { prisma } from '../config/prisma.js';
import { computeYearAccounts } from './account.service.js';
import { createInAppNotification, sendEmailNotification } from './notification.service.js';
import { reminderMessage } from './messageTemplates.js';

// Reminds the parents of students with overdue installments.
// A parent is not reminded about the same student again within intervalDays.
export const runReminders = async ({
  dryRun = false,
  intervalDays = Number(process.env.REMINDER_INTERVAL_DAYS) || 7,
} = {}) => {
  const year = await prisma.schoolYear.findFirst({ where: { isCurrent: true, deletedAt: null } });
  if (!year) return { dryRun, skipped: 'No current school year' };

  const late = (await computeYearAccounts(prisma, year.id)).filter((a) => a.overdueAmount.gt(0));
  const summary = {
    dryRun, schoolYear: year.label, lateStudents: late.length,
    sent: 0, wouldSend: 0, skippedRecent: 0, withoutParent: 0,
  };
  if (!late.length) return summary;

  const since = new Date(Date.now() - intervalDays * 24 * 60 * 60 * 1000);
  const [links, recent] = await Promise.all([
    prisma.studentParent.findMany({
      where: {
        studentId: { in: late.map((a) => a.student.id) },
        parent: { deletedAt: null, user: { deletedAt: null, isActive: true } },
      },
      include: { parent: { include: { user: { select: { id: true, email: true } } } } },
    }),
    prisma.notification.findMany({
      where: { type: 'PAYMENT_REMINDER', channel: 'IN_APP', createdAt: { gte: since } },
      select: { userId: true, data: true },
    }),
  ]);
  const recentKeys = new Set(recent.map((n) => `${n.userId}:${n.data?.studentId}`));

  for (const account of late) {
    const parents = links.filter((l) => l.studentId === account.student.id);
    if (!parents.length) { summary.withoutParent += 1; continue; }

    const message = reminderMessage({
      student: account.student, balance: account.balance, overdueAmount: account.overdueAmount,
    });

    for (const link of parents) {
      const user = link.parent.user;
      if (recentKeys.has(`${user.id}:${account.student.id}`)) { summary.skippedRecent += 1; continue; }
      if (dryRun) { summary.wouldSend += 1; continue; }

      await createInAppNotification(prisma, { userId: user.id, ...message });
      await sendEmailNotification({ userId: user.id, email: user.email, ...message });
      summary.sent += 1;
    }
  }
  return summary;
};