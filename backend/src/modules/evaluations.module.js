import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { logAudit } from '../core/audit.service.js';
import { optionalInt, optionalEnum } from '../utils/query.js';
import {
  assertCanAccessClass, assertCanTeach, classFilterFor,
} from '../services/access.service.js';

const TERMS = ['T1', 'T2', 'T3'];
const include = { subject: true, schoolClass: true };

// No defaults here: DB defaults apply on create, and PATCH never overwrites by accident
const fields = {
  title: z.string().trim().min(1).max(120),
  type: z.enum(['CONTINUOUS', 'EXAM']),
  term: z.enum(TERMS),
  date: z.coerce.date(),
  maxScore: z.number().positive().max(100).optional(),
  weight: z.number().positive().max(10).optional(),
};
const createSchema = z.object({
  ...fields,
  classId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
});
const updateSchema = z.object(fields).partial();

const gradesSchema = z.object({
  grades: z.array(z.object({
    studentId: z.number().int().positive(),
    score: z.number().min(0).nullable(), // null removes the grade
    comment: z.string().trim().max(300).optional(),
  })).min(1).max(100),
});

const findEvaluation = async (db, id) => {
  const ev = await db.evaluation.findFirst({ where: { id, deletedAt: null }, include });
  if (!ev) throw new AppError('Evaluation not found', 404);
  return ev;
};

const assertDateInYear = async (db, schoolYearId, date) => {
  const year = await db.schoolYear.findUnique({ where: { id: schoolYearId } });
  if (date < year.startDate || date > year.endDate) {
    throw new AppError(`Date must be within the school year ${year.label}`, 400);
  }
};

const router = Router();
router.use(authenticate);
router.param('id', (req, res, next, v) =>
  (/^\d+$/.test(v) ? next() : next(new AppError('Invalid id', 400))));

const roles = ['ADMIN', 'TEACHER'];

router.get('/', authorize(...roles), asyncHandler(async (req, res) => {
  const where = { deletedAt: null };
  const classId = await classFilterFor(req.user, optionalInt(req.query.classId, 'classId'));
  if (classId !== undefined) where.classId = classId;

  const subjectId = optionalInt(req.query.subjectId, 'subjectId');
  if (subjectId) where.subjectId = subjectId;
  const term = optionalEnum(req.query.term, TERMS, 'term');
  if (term) where.term = term;

  const items = await prisma.evaluation.findMany({
    where, include, orderBy: [{ date: 'desc' }, { id: 'desc' }], take: 200,
  });
  res.json({ status: 'success', data: items });
}));

router.post('/', authorize(...roles), validate(createSchema), asyncHandler(async (req, res) => {
  const { classId, subjectId, date } = req.body;
  const record = await prisma.$transaction(async (tx) => {
    const [cls, subject] = await Promise.all([
      tx.schoolClass.findFirst({ where: { id: classId, deletedAt: null } }),
      tx.subject.findFirst({ where: { id: subjectId, deletedAt: null } }),
    ]);
    if (!cls) throw new AppError('Class not found', 400);
    if (!subject) throw new AppError('Subject not found', 400);
    if (subject.level !== cls.level) {
      throw new AppError(`Subject level (${subject.level}) does not match class level (${cls.level})`, 400);
    }
    await assertCanTeach(tx, req.user, classId, subjectId);
    await assertDateInYear(tx, cls.schoolYearId, date);

    const created = await tx.evaluation.create({ data: req.body, include });
    await logAudit(tx, {
      userId: req.user.id, action: 'CREATE', entity: 'Evaluation', entityId: created.id, newValues: created,
    });
    return created;
  });
  res.status(201).json({ status: 'success', data: record });
}));

router.patch('/:id', authorize(...roles), validate(updateSchema), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const record = await prisma.$transaction(async (tx) => {
    const before = await findEvaluation(tx, id);
    await assertCanTeach(tx, req.user, before.classId, before.subjectId);

    if (req.body.maxScore !== undefined) {
      const over = await tx.grade.count({
        where: { evaluationId: id, deletedAt: null, score: { gt: req.body.maxScore } },
      });
      if (over > 0) throw new AppError(`${over} existing grade(s) exceed the new maximum score`, 409);
    }
    if (req.body.date) await assertDateInYear(tx, before.schoolClass.schoolYearId, req.body.date);

    const after = await tx.evaluation.update({ where: { id }, data: req.body, include });
    await logAudit(tx, {
      userId: req.user.id, action: 'UPDATE', entity: 'Evaluation', entityId: id,
      oldValues: before, newValues: after,
    });
    return after;
  });
  res.json({ status: 'success', data: record });
}));

router.delete('/:id', authorize(...roles), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const confirm = req.query.confirm === 'true';
  await prisma.$transaction(async (tx) => {
    const before = await findEvaluation(tx, id);
    await assertCanTeach(tx, req.user, before.classId, before.subjectId);

    const gradeCount = await tx.grade.count({ where: { evaluationId: id, deletedAt: null } });
    if (gradeCount > 0 && !confirm) {
      throw new AppError(`This evaluation has ${gradeCount} grade(s): add ?confirm=true to delete them too`, 409);
    }
    const now = new Date();
    await tx.grade.updateMany({ where: { evaluationId: id, deletedAt: null }, data: { deletedAt: now } });
    await tx.evaluation.update({ where: { id }, data: { deletedAt: now } });
    await logAudit(tx, {
      userId: req.user.id, action: 'DELETE', entity: 'Evaluation', entityId: id, oldValues: before,
    });
  });
  res.json({ status: 'success', message: 'Deleted' });
}));

// Grade sheet: every enrolled student with their grade (or null)
router.get('/:id/grades', authorize(...roles), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const evaluation = await findEvaluation(prisma, id);
  await assertCanAccessClass(req.user, evaluation.classId);

  const [enrollments, grades] = await Promise.all([
    prisma.enrollment.findMany({
      where: { classId: evaluation.classId, deletedAt: null, student: { deletedAt: null } },
      include: { student: true },
      orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
    }),
    prisma.grade.findMany({ where: { evaluationId: id, deletedAt: null } }),
  ]);
  const byStudent = new Map(grades.map((g) => [g.studentId, g]));

  const sheet = enrollments.map((e) => {
    const g = byStudent.get(e.studentId);
    return {
      student: {
        id: e.student.id, matricule: e.student.matricule,
        firstName: e.student.firstName, lastName: e.student.lastName,
      },
      score: g ? Number(g.score) : null,
      comment: g?.comment ?? null,
    };
  });
  res.json({ status: 'success', evaluation, sheet });
}));

// Bulk entry: create, change or remove (score: null) several grades at once
router.put('/:id/grades', authorize(...roles), validate(gradesSchema), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { grades } = req.body;

  const ids = grades.map((g) => g.studentId);
  if (new Set(ids).size !== ids.length) throw new AppError('Duplicate student in the list', 400);

  const summary = await prisma.$transaction(async (tx) => {
    const evaluation = await findEvaluation(tx, id);
    await assertCanTeach(tx, req.user, evaluation.classId, evaluation.subjectId);

    const enrolled = await tx.enrollment.count({
      where: { classId: evaluation.classId, studentId: { in: ids }, deletedAt: null },
    });
    if (enrolled !== ids.length) throw new AppError('Some students are not enrolled in this class', 400);

    const max = Number(evaluation.maxScore);
    const tooHigh = grades.filter((g) => g.score !== null && g.score > max);
    if (tooHigh.length) {
      throw new AppError(
        `Score above the maximum (${max})`, 400,
        tooHigh.map((g) => ({ studentId: g.studentId, score: g.score })),
      );
    }

    const counts = { created: 0, updated: 0, deleted: 0, unchanged: 0 };
    for (const g of grades) {
      const existing = await tx.grade.findUnique({
        where: { evaluationId_studentId: { evaluationId: id, studentId: g.studentId } },
      });
      const active = existing && !existing.deletedAt ? existing : null;

      if (g.score === null) {
        if (!active) { counts.unchanged += 1; continue; }
        await tx.grade.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
        await logAudit(tx, {
          userId: req.user.id, action: 'DELETE', entity: 'Grade', entityId: existing.id, oldValues: active,
        });
        counts.deleted += 1;
        continue;
      }

      const comment = g.comment !== undefined ? g.comment : (active?.comment ?? null);
      if (active && Number(active.score) === g.score && active.comment === comment) {
        counts.unchanged += 1;
        continue;
      }

      const data = { score: g.score, comment, deletedAt: null };
      if (existing) {
        const after = await tx.grade.update({ where: { id: existing.id }, data });
        await logAudit(tx, {
          userId: req.user.id, action: active ? 'UPDATE' : 'CREATE', entity: 'Grade',
          entityId: existing.id, oldValues: active ?? undefined, newValues: after,
        });
        counts[active ? 'updated' : 'created'] += 1;
      } else {
        const after = await tx.grade.create({ data: { evaluationId: id, studentId: g.studentId, ...data } });
        await logAudit(tx, {
          userId: req.user.id, action: 'CREATE', entity: 'Grade', entityId: after.id, newValues: after,
        });
        counts.created += 1;
      }
    }
    return counts;
  }, { timeout: 20000, maxWait: 10000 });

  res.json({ status: 'success', ...summary });
}));

export default router;