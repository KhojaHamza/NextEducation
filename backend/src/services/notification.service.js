import { prisma } from '../config/prisma.js';
import { sendMail } from './mailer.service.js';

// Active parent accounts linked to a student
export const getParentRecipients = async (db, studentId) => {
  const links = await db.studentParent.findMany({
    where: {
      studentId,
      parent: { deletedAt: null, user: { deletedAt: null, isActive: true } },
    },
    include: { parent: { include: { user: { select: { id: true, email: true } } } } },
  });
  return links.map((l) => ({ userId: l.parent.user.id, email: l.parent.user.email }));
};

export const createInAppNotification = (db, { userId, type, title, body, data }) =>
  db.notification.create({
    data: {
      userId, type, title, body, data: data ?? undefined,
      channel: 'IN_APP', status: 'SENT', sentAt: new Date(),
    },
  });

// Never throws: a failed email must not undo a payment. The outcome is logged either way.
export const sendEmailNotification = async ({ userId, email, type, title, body, data, link }) => {
  let status = 'SKIPPED';
  let error = null;
  let sentAt = null;

  try {
    const { sent } = await sendMail({ to: email, subject: title, text: link ? `${body}\n\n${link}` : body });
    if (sent) { status = 'SENT'; sentAt = new Date(); }
  } catch (err) {
    status = 'FAILED';
    error = String(err.message).slice(0, 300);
  }

  try {
    return await prisma.notification.create({
      data: { userId, type, title, body, data: data ?? undefined, channel: 'EMAIL', status, error, sentAt },
    });
  } catch (err) {
    console.error('Could not log email notification', err);
    return { status };
  }
};