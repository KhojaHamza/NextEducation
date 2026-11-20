import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { computeClassResults } from './reportCard.service.js';

// Moyenne générale /20 à partir de laquelle un élève est considéré comme ayant réussi.
// (Même seuil que la mention « Passable » des bulletins.)
export const PASS_MARK = 10;
// Une matière dont la moyenne est sous ce seuil est signalée « à renforcer ».
export const WEAK_SUBJECT_MARK = 10;

const STRUGGLING_LIST_LIMIT = 50;
const TOP_LIST_LIMIT = 5;

const round2 = (n) => Math.round(n * 100) / 100;
const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
const pct = (part, total) => (total ? round2((part / total) * 100) : null);

const BANDS = [
  { label: 'Moins de 8', min: 0, max: 8 },
  { label: '8 à 10', min: 8, max: 10 },
  { label: '10 à 12', min: 10, max: 12 },
  { label: '12 à 14', min: 12, max: 14 },
  { label: '14 à 16', min: 14, max: 16 },
  { label: '16 et plus', min: 16, max: Infinity },
];

const studentInfo = (s) => ({
  id: s.id, matricule: s.matricule, firstName: s.firstName, lastName: s.lastName,
});
const classInfo = (c) => ({ id: c.id, level: c.level, section: c.section });

// Tout passe par le client Prisma « isolé » : seules les données de l'école connectée sont lues.
export const buildPedagogyDashboard = async ({ term, schoolYearId }) => {
  const year = await prisma.schoolYear.findFirst({
    where: schoolYearId
      ? { id: schoolYearId, deletedAt: null }
      : { isCurrent: true, deletedAt: null },
  });
  if (!year) throw new AppError('School year not found', 404);

  const classes = await prisma.schoolClass.findMany({
    where: { schoolYearId: year.id, deletedAt: null },
    orderBy: [{ level: 'asc' }, { section: 'asc' }],
  });

  const classRows = [];
  const graded = []; // un élément par élève ayant au moins une note
  const subjectAcc = new Map(); // nom de matière -> { sum, count, passed }
  let enrolled = 0;

  for (const cls of classes) {
    const results = await computeClassResults(cls.id, term);
    const classGraded = results.students.filter((s) => s.general !== null);
    const passed = classGraded.filter((s) => s.general >= PASS_MARK).length;
    enrolled += results.students.length;

    classRows.push({
      ...classInfo(cls),
      enrolled: results.students.length,
      graded: classGraded.length,
      average: results.classAverage,
      passed,
      failed: classGraded.length - passed,
      passRate: pct(passed, classGraded.length),
      failRate: pct(classGraded.length - passed, classGraded.length),
    });

    for (const s of results.students) {
      for (const sub of s.subjects) {
        if (sub.average === null) continue;
        const acc = subjectAcc.get(sub.name) ?? { sum: 0, count: 0, passed: 0 };
        acc.sum += sub.average;
        acc.count += 1;
        if (sub.average >= PASS_MARK) acc.passed += 1;
        subjectAcc.set(sub.name, acc);
      }
      if (s.general !== null) {
        graded.push({ student: s.student, schoolClass: cls, general: s.general, subjects: s.subjects });
      }
    }
  }

  const passed = graded.filter((g) => g.general >= PASS_MARK).length;
  const failed = graded.length - passed;

  const struggling = graded
    .filter((g) => g.general < PASS_MARK)
    .sort((a, b) => a.general - b.general);

  const subjects = [...subjectAcc.entries()]
    .map(([name, acc]) => ({
      name,
      graded: acc.count,
      average: round2(acc.sum / acc.count),
      passRate: pct(acc.passed, acc.count),
    }))
    .sort((a, b) => b.average - a.average);

  return {
    term,
    schoolYear: { id: year.id, label: year.label },
    passMark: PASS_MARK,
    totals: {
      enrolled,
      graded: graded.length,
      withoutGrades: enrolled - graded.length,
      schoolAverage: graded.length ? round2(mean(graded.map((g) => g.general))) : null,
      passed,
      failed,
      passRate: pct(passed, graded.length),
      failRate: pct(failed, graded.length),
    },
    distribution: BANDS.map((b) => ({
      label: b.label,
      passing: b.min >= PASS_MARK,
      count: graded.filter((g) => g.general >= b.min && g.general < b.max).length,
    })),
    classes: classRows,
    subjects,
    topStudents: [...graded]
      .sort((a, b) => b.general - a.general)
      .slice(0, TOP_LIST_LIMIT)
      .map((g) => ({ student: studentInfo(g.student), schoolClass: classInfo(g.schoolClass), general: g.general })),
    struggling: {
      total: struggling.length,
      students: struggling.slice(0, STRUGGLING_LIST_LIMIT).map((g) => ({
        student: studentInfo(g.student),
        schoolClass: classInfo(g.schoolClass),
        general: g.general,
        weakSubjects: g.subjects
          .filter((s) => s.average !== null && s.average < WEAK_SUBJECT_MARK)
          .sort((a, b) => a.average - b.average)
          .map((s) => ({ name: s.name, average: s.average })),
      })),
    },
  };
};
