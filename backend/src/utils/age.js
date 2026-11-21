export const MIN_STUDENT_AGE = 5;

// Latest accepted birth date: today (Tunis) minus MIN_STUDENT_AGE years.
// Feb 29 falls back to Feb 28 so nobody is accepted a day too early.
export const latestBirthDate = (years = MIN_STUDENT_AGE) => {
  const [y, m, d] = new Date()
    .toLocaleDateString('en-CA', { timeZone: 'Africa/Tunis' })
    .split('-')
    .map(Number);
  const date = new Date(Date.UTC(y - years, m - 1, d));
  if (date.getUTCMonth() !== m - 1) return new Date(Date.UTC(y - years, m, 0));
  return date;
};

export const isOldEnough = (birthDate) => birthDate <= latestBirthDate();