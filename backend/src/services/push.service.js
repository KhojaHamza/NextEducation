import webpush from 'web-push';
import { prisma } from '../config/prisma.js';

let configured = false;
export const pushConfigured = () => {
  if (configured) return true;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
};

// Best effort, never throws. Logs one PUSH row per user who has at least one device.
export const sendPushToUser = async ({ userId, type, title, body, data }) => {
  try {
    if (!pushConfigured()) return;
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
    if (!subscriptions.length) return;

    const payload = JSON.stringify({ title, body: body.slice(0, 140), data: { ...data, type } });
    let delivered = 0;
    let lastError = null;

    await Promise.all(subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 86400 },
        );
        delivered += 1;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { id: s.id } }); // device unsubscribed
        } else {
          lastError = `Push service answered ${err.statusCode ?? 'with an error'}`;
        }
      }
    }));

    await prisma.notification.create({
      data: {
        userId, type, title, body: body.slice(0, 200), data: data ?? undefined, channel: 'PUSH',
        status: delivered ? 'SENT' : 'FAILED',
        error: delivered ? null : (lastError ?? 'Subscription expired'),
        sentAt: delivered ? new Date() : null,
      },
    });
  } catch (err) {
    console.error('[push] failed', err);
  }
};