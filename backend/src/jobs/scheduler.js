import cron from 'node-cron';
import { runReminders } from '../services/reminder.service.js';

// Runs inside the API process: fine for one instance. If you ever run several
// instances, enable it on one only (ENABLE_SCHEDULER=true) or use the host's cron.
export const startScheduler = () => {
  if (process.env.ENABLE_SCHEDULER !== 'true') return;

  const expression = process.env.REMINDERS_CRON || '0 8 * * 1'; // Mondays at 08:00
  if (!cron.validate(expression)) {
    console.error(`[scheduler] Invalid REMINDERS_CRON: ${expression}`);
    return;
  }

  cron.schedule(
    expression,
    async () => {
      try {
        console.log('[reminders]', JSON.stringify(await runReminders()));
      } catch (err) {
        console.error('[reminders] failed', err);
      }
    },
    { timezone: 'Africa/Tunis' },
  );
  console.log(`[scheduler] Payment reminders scheduled (${expression})`);
};