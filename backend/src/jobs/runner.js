import { platformPrisma, schoolContext } from '../config/prisma.js';
import { runReminders } from '../services/reminder.service.js';
import { runAbsenceAlerts, runDeadlineReminders } from '../services/autoNotifications.service.js';

export const JOBS = {
  payments: runReminders,
  deadlines: runDeadlineReminders,
  absences: runAbsenceAlerts,
};

// Runs one job for every active school, each one inside its own school context
export const runJobForAllSchools = async (name, options = {}) => {
  const job = JOBS[name];
  const schools = await platformPrisma.school.findMany({
    where: { status: 'ACTIVE' }, select: { id: true, code: true },
  });

  const results = {};
  for (const school of schools) {
    try {
      results[school.code] = await schoolContext.run(
        { userId: null, schoolId: school.id, role: 'ADMIN' },
        () => job(options),
      );
    } catch (err) {
      console.error(`[jobs] ${name} failed for ${school.code}`, err);
      results[school.code] = { error: String(err.message).slice(0, 200) };
    }
  }
  return results;
};