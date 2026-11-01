import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

export const TERMS_ALL = ['T1', 'T2', 'T3', 'ANNUAL'];

const round2 = (n) => Math.round(n * 100) / 100;
const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;

export const mention = (avg) => {
  if (avg === null || avg === undefined) return '';
  if (avg >= 16) return 'Très bien';
  if (avg >= 14) return 'Bien';
  if (avg >= 12) return 'Assez bien';
  if (avg >= 10) return 'Passable';
  return 'Insuffisant';
};

export const computeClassResults = async (classId, term) => {
  const cls = await prisma.schoolClass.findFirst({ where: { id: classId, deletedAt: null } });
  if (!cls) throw new AppError('Class not found', 404);

  const [subjects, enrollments, evaluations] = await Promise.all([
    prisma.subject.findMany({ where: { level: cls.level, deletedAt: null }, orderBy: { name: 'asc' } }),
    prisma.enrollment.findMany({
      where: { classId, deletedAt: null, student: { deletedAt: null } },
      include: { student: true },
    }),
    prisma.evaluation.findMany({
      where: { classId, deletedAt: null, ...(term !== 'ANNUAL' && { term }) },
      include: { grades: { where: { deletedAt: null } } },
    }),
  ]);

  // Weighted sum of grades converted to /20, per student and subject
  const acc = new Map();
  for (const ev of evaluations) {
    const max = Number(ev.maxScore);
    const weight = Number(ev.weight);
    for (const g of ev.grades) {
      const key = `${g.studentId}:${ev.subjectId}`;
      const cur = acc.get(key) ?? { sum: 0, weight: 0 };
      cur.sum += (Number(g.score) / max) * 20 * weight;
      cur.weight += weight;
      acc.set(key, cur);
    }
  }

  const students = enrollments.map((e) => {
    const rows = subjects.map((s) => {
      const cur = acc.get(`${e.studentId}:${s.id}`);
      const raw = cur ? cur.sum / cur.weight : null;
      return { subjectId: s.id, name: s.name, coefficient: Number(s.coefficient), raw };
    });

    const graded = rows.filter((r) => r.raw !== null);
    const coefTotal = graded.reduce((a, r) => a + r.coefficient, 0);
    const generalRaw = coefTotal
      ? graded.reduce((a, r) => a + r.raw * r.coefficient, 0) / coefTotal
      : null;

    return {
      student: e.student,
      general: generalRaw === null ? null : round2(generalRaw),
      rank: null,
      subjects: rows.map((r) => ({
        subjectId: r.subjectId, name: r.name, coefficient: r.coefficient,
        average: r.raw === null ? null : round2(r.raw),
        classAverage: null,
      })),
    };
  });

  // Class average per subject
  for (const s of subjects) {
    const values = students
      .map((st) => st.subjects.find((x) => x.subjectId === s.id).average)
      .filter((v) => v !== null);
    const avg = values.length ? round2(mean(values)) : null;
    students.forEach((st) => { st.subjects.find((x) => x.subjectId === s.id).classAverage = avg; });
  }

  // Ranking: ties share the same rank
  const ranked = students.filter((s) => s.general !== null).sort((a, b) => b.general - a.general);
  ranked.forEach((s, i) => {
    s.rank = i > 0 && s.general === ranked[i - 1].general ? ranked[i - 1].rank : i + 1;
  });

  students.sort((a, b) => {
    if (a.general !== null && b.general !== null) return b.general - a.general;
    if (a.general !== null) return -1;
    if (b.general !== null) return 1;
    return a.student.lastName.localeCompare(b.student.lastName);
  });

  return {
    class: cls,
    term,
    students,
    rankedCount: ranked.length,
    classAverage: ranked.length ? round2(mean(ranked.map((s) => s.general))) : null,
  };
};

export const buildReportCard = async (studentId, term, schoolYearId) => {
  const student = await prisma.student.findFirst({ where: { id: studentId, deletedAt: null } });
  if (!student) throw new AppError('Student not found', 404);

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId, deletedAt: null,
      ...(schoolYearId ? { schoolYearId } : { schoolYear: { isCurrent: true, deletedAt: null } }),
    },
    include: { schoolClass: true, schoolYear: true },
  });
  if (!enrollment) throw new AppError('Student has no enrollment for this school year', 404);

  const results = await computeClassResults(enrollment.classId, term);
  const me = results.students.find((s) => s.student.id === studentId);

  const absences = await prisma.absence.findMany({
    where: { studentId, schoolYearId: enrollment.schoolYearId, deletedAt: null },
    select: { justificationStatus: true },
  });
  const justified = absences.filter((a) => a.justificationStatus === 'ACCEPTED').length;

  return {
    term,
    schoolYear: { id: enrollment.schoolYear.id, label: enrollment.schoolYear.label },
    class: { id: enrollment.schoolClass.id, level: enrollment.schoolClass.level, section: enrollment.schoolClass.section },
    student: {
      id: student.id, matricule: student.matricule, firstName: student.firstName,
      lastName: student.lastName, birthDate: student.birthDate,
    },
    subjects: me.subjects,
    general: me.general,
    rank: me.rank,
    rankedCount: results.rankedCount,
    classAverage: results.classAverage,
    mention: mention(me.general),
    absences: { total: absences.length, justified, unjustified: absences.length - justified },
  };
};