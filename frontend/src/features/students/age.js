import { format, subYears } from 'date-fns';

export const MIN_STUDENT_AGE = 5;

// 'yyyy-MM-dd': the latest birth date allowed today (date-fns handles Feb 29)
export const latestBirthDate = () => format(subYears(new Date(), MIN_STUDENT_AGE), 'yyyy-MM-dd');