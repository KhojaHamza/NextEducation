import cron from 'node-cron';
import { runJobForAllSchools } from './runner.js';

// Runs inside the API process: fine for one instance. If you ever run several
// instances, enable it on one only (ENABLE_SCHEDULER=true) or use the host's cron.
const schedules = [
  { job: 'payments', env: 'REMINDERS_CRON', fallback: '0 8 * * 1' },      // Mondays 08:00
  { job: 'deadlines', env: 'DEADLINES_CRON', fallback: '0 17 * * *' },    // every day 17:00
  { job: 'absences', env: 'ABSENCES_CRON', fallback: '0 18 * * 1-5' },    // weekdays 18:00
];

export const startScheduler = () => {
  if (process.env.ENABLE_SCHEDULER !== 'true') return;

  for (const { job, env, fallback } of schedules) {
    const expression = process.env[env] || fallback;
    if (!cron.validate(expression)) {
      console.error(`[scheduler] Invalid ${env}: ${expression}`);
      continue;
    }
    cron.schedule(
      expression,
      async () => {
        try {
          console.log(`[${job}]`, JSON.stringify(await runJobForAllSchools(job)));
        } catch (err) {
          console.error(`[${job}] failed`, err);
        }
      },
      { timezone: 'Africa/Tunis' },
    );
    console.log(`[scheduler] ${job} scheduled (${expression})`);
  }
};