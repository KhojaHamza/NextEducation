import { sendEmailNotification } from './notification.service.js';
import { sendPushToUser } from './push.service.js';

const BATCH = 20;

// Runs after the transaction committed. Never throws, so callers can fire and forget.
export const deliver = async (recipients, content, { email = false } = {}) => {
  try {
    for (let i = 0; i < recipients.length; i += BATCH) {
      await Promise.allSettled(
        recipients.slice(i, i + BATCH).map(async (r) => {
          await sendPushToUser({ userId: r.userId, ...content });
          if (email) await sendEmailNotification({ userId: r.userId, email: r.email, ...content });
        }),
      );
    }
  } catch (err) {
    console.error('[delivery] failed', err);
  }
};