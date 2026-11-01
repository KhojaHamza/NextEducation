import { Router } from 'express';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { optionalEnum, optionalInt } from '../utils/query.js';
import { assertCanAccessClass, assertCanViewStudent } from '../services/access.service.js';
import {
  TERMS_ALL, buildReportCard, computeClassResults, mention,
} from '../services/reportCard.service.js';
import { streamReportCardPdf } from '../services/reportCardPdf.service.js';

const router = Router();
router.use(authenticate);

const validId = (req, res, next, v) =>
  (/^\d+$/.test(v) ? next() : next(new AppError('Invalid id', 400)));
router.param('studentId', validId);
router.param('classId', validId);

const parseQuery = (req) => ({
  term: optionalEnum(req.query.term, TERMS_ALL, 'term') ?? 'ANNUAL',
  schoolYearId: optionalInt(req.query.schoolYearId, 'schoolYearId'),
});

// Ranking of a whole class
router.get('/class/:classId', authorize('ADMIN', 'TEACHER'), asyncHandler(async (req, res) => {
  const classId = Number(req.params.classId);
  await assertCanAccessClass(req.user, classId);
  const { term } = parseQuery(req);

  const r = await computeClassResults(classId, term);
  res.json({
    status: 'success',
    class: { id: r.class.id, level: r.class.level, section: r.class.section },
    term, classAverage: r.classAverage, rankedCount: r.rankedCount,
    students: r.students.map((s) => ({
      student: {
        id: s.student.id, matricule: s.student.matricule,
        firstName: s.student.firstName, lastName: s.student.lastName,
      },
      general: s.general, rank: s.rank, mention: mention(s.general),
    })),
  });
}));

router.get('/:studentId', authorize('ADMIN', 'TEACHER', 'PARENT'), asyncHandler(async (req, res) => {
  const studentId = Number(req.params.studentId);
  await assertCanViewStudent(req.user, studentId);
  const { term, schoolYearId } = parseQuery(req);
  res.json({ status: 'success', data: await buildReportCard(studentId, term, schoolYearId) });
}));

router.get('/:studentId/pdf', authorize('ADMIN', 'TEACHER', 'PARENT'), asyncHandler(async (req, res) => {
  const studentId = Number(req.params.studentId);
  await assertCanViewStudent(req.user, studentId);
  const { term, schoolYearId } = parseQuery(req);

  // Data is fully computed before streaming starts, so errors still return clean JSON
  const card = await buildReportCard(studentId, term, schoolYearId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="bulletin-${card.student.matricule}-${term}.pdf"`,
  );
  streamReportCardPdf(card, res);
}));

export default router;