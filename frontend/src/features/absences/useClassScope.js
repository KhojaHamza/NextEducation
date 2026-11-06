import { useState } from 'react';
import { useAuth } from '../auth/useAuth.js';
import { useMyClasses } from '../evaluations/hooks.js';

// Which class is looked at. Administrator: any class (picker). Teacher: one of their classes.
// A teacher with a single class does not have to pick it.
export function useClassScope() {
  const { user } = useAuth();
  const isTeacher = user.role === 'TEACHER';
  const mine = useMyClasses(isTeacher);

  const all = mine.data ?? [];
  const current = all.filter((c) => c.schoolYear?.isCurrent);
  const myClasses = current.length ? current : all;

  const [picked, setPicked] = useState(null);
  const schoolClass = isTeacher ? (picked ?? (myClasses.length === 1 ? myClasses[0] : null)) : picked;

  return { isTeacher, mine, myClasses, schoolClass, setSchoolClass: setPicked };
}