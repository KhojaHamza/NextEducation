import { deliver } from './delivery.service.js';

// In-app notification for each user, then push (and e-mail if asked) in the background.
// users: [{ id, email }]. content: { type, title, body, data, link }. Returns how many people were notified.
export const notifyUsers = async (db, users, content, { email = false } = {}) => {
  if (!users.length) return 0;
  const now = new Date();
  await db.notification.createMany({
    data: users.map((u) => ({
      userId: u.id, type: content.type, channel: 'IN_APP', title: content.title, body: content.body,
      data: content.data ?? undefined, status: 'SENT', sentAt: now,
    })),
  });

  // A failed push or e-mail must never break the caller
  Promise.resolve()
    .then(() => deliver(users.map((u) => ({ userId: u.id, email: u.email })), content, { email }))
    .catch((err) => console.error('[notify] delivery failed', err));

  return users.length;
};