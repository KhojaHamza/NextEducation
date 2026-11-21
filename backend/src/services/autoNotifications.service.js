import { prisma } from '../config/prisma.js';
import { notifyUsers } from './notify.service.js';

const TZ = 'Africa/Tunis';
const DAY = 24 * 60 * 60 * 1000;

const todayInTunis = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ }); // yyyy-mm-dd
const addDays = (ymd, n) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * DAY);
const frDate = (d) => d.toISOString().slice(0, 10).split('-').reverse().join('/');

// "userId:itemId" of notifications of this type already sent recently (avoids duplicates)
const recentKeys = async (type, days, field) => {
  const since = new Date(Date.now() - days * DAY);
  const rows = await prisma.notification.findMany({
    where: { type, channel: 'IN_APP', createdAt: { gte: since } },
    select: { userId: true, data: true },
  });
  return new Set(rows.map((r) => `${r.userId}:${r.data?.[field]}`));
};

// Active students of a class and their parents
const classRecipients = async (classId) => {
  const inClass = { deletedAt: null, enrollments: { some: { classId, deletedAt: null } } };
  const base = { isActive: true, deletedAt: null };
  const select = { id: true, email: true };
  const [students, parents] = await Promise.all([
    prisma.user.findMany({ where: { ...base, student: inClass }, select }),
    prisma.user.findMany({
      where: { ...base, parent: { deletedAt: null, children: { some: { student: inClass } } } },
      select,
    }),
  ]);
  return [...new Map([...students, ...parents].map((u) => [u.id, u])).values()];
};

// Tomorrow: tests, exams and homework due -> students and parents of the class
export const runDeadlineReminders = async ({ dryRun = false, intervalDays = 3 } = {}) => {
  const tomorrow = addDays(todayInTunis(), 1);
  const link = `${process.env.CLIENT_URL || ''}/calendrier`;

  const [evaluations, homeworks] = await Promise.all([
    prisma.evaluation.findMany({ where: { deletedAt: null, date: tomorrow }, include: { subject: true } }),
    prisma.homework.findMany({ where: { deletedAt: null, dueDate: tomorrow }, include: { subject: true } }),
  ]);

  const items = [
    ...evaluations.map((e) => ({
      type: 'EVALUATION_REMINDER', field: 'evaluationId', id: e.id, classId: e.classId,
      title: `${e.type === 'EXAM' ? 'Examen' : 'Contrôle'} demain : ${e.title}`,
      body: `${e.subject.name} - ${frDate(tomorrow)}`,
    })),
    ...homeworks.map((h) => ({
      type: 'HOMEWORK_REMINDER', field: 'homeworkId', id: h.id, classId: h.classId,
      title: `Devoir à rendre demain : ${h.title}`,
      body: h.subject.name,
    })),
  ];

  const summary = { dryRun, date: frDate(tomorrow), items: items.length, sent: 0, wouldSend: 0, skippedRecent: 0 };
  if (!items.length) return summary;

  const [doneEvaluations, doneHomeworks] = await Promise.all([
    recentKeys('EVALUATION_REMINDER', intervalDays, 'evaluationId'),
    recentKeys('HOMEWORK_REMINDER', intervalDays, 'homeworkId'),
  ]);

  for (const item of items) {
    const done = item.type === 'EVALUATION_REMINDER' ? doneEvaluations : doneHomeworks;
    const recipients = await classRecipients(item.classId);
    const fresh = recipients.filter((u) => !done.has(`${u.id}:${item.id}`));
    summary.skippedRecent += recipients.length - fresh.length;

    if (dryRun) { summary.wouldSend += fresh.length; continue; }
    summary.sent += await notifyUsers(
      prisma, fresh,
      { type: item.type, title: item.title, body: item.body, data: { [item.field]: item.id }, link },
    );
  }
  return summary;
};

// Parents of students with several unjustified absences (half-days) over the last days.
// Not repeated for the same student within intervalDays.
export const runAbsenceAlerts = async ({
  dryRun = false,
  threshold = Number(process.env.ABSENCE_ALERT_THRESHOLD) || 3,
  windowDays = 30,
  intervalDays = Number(process.env.ABSENCE_ALERT_INTERVAL_DAYS) || 14,
} = {}) => {
  const year = await prisma.schoolYear.findFirst({ where: { isCurrent: true, deletedAt: null } });
  if (!year) return { dryRun, skipped: 'No current school year' };

  const since = addDays(todayInTunis(), -windowDays);
  const rows = await prisma.absence.findMany({
    where: {
      schoolYearId: year.id, deletedAt: null, date: { gte: since },
      justificationStatus: { in: ['NONE', 'REJECTED'] },
    },
    select: { studentId: true },
  });

  const counts = new Map();
  for (const r of rows) counts.set(r.studentId, (counts.get(r.studentId) ?? 0) + 1);
  const flagged = [...counts].filter(([, n]) => n >= threshold);

  const summary = { dryRun, threshold, flaggedStudents: flagged.length, sent: 0, wouldSend: 0, skippedRecent: 0, withoutParent: 0 };
  if (!flagged.length) return summary;

  const ids = flagged.map(([studentId]) => studentId);
  const [students, links, done] = await Promise.all([
    prisma.student.findMany({ where: { id: { in: ids }, deletedAt: null } }),
    prisma.studentParent.findMany({
      where: {
        studentId: { in: ids },
        parent: { deletedAt: null, user: { deletedAt: null, isActive: true } },
      },
      include: { parent: { include: { user: { select: { id: true, email: true } } } } },
    }),
    recentKeys('ABSENCE_ALERT', intervalDays, 'studentId'),
  ]);
  const byId = new Map(students.map((s) => [s.id, s]));

  for (const [studentId, count] of flagged) {
    const student = byId.get(studentId);
    if (!student) continue;

    const parents = links.filter((l) => l.studentId === studentId).map((l) => l.parent.user);
    if (!parents.length) { summary.withoutParent += 1; continue; }

    const fresh = parents.filter((u) => !done.has(`${u.id}:${studentId}`));
    summary.skippedRecent += parents.length - fresh.length;
    if (dryRun) { summary.wouldSend += fresh.length; continue; }

    summary.sent += await notifyUsers(prisma, fresh, {
      type: 'ABSENCE_ALERT',
      title: `Absences répétées : ${student.firstName} ${student.lastName}`,
      body: `${student.firstName} ${student.lastName} compte ${count} demi-journées d’absence non justifiées ces ${windowDays} derniers jours.`,
      data: { studentId },
      link: `${process.env.CLIENT_URL || ''}/parent/absences`,
    });
  }
  return summary;
};