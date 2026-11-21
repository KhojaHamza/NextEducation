import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { logAudit } from '../core/audit.service.js';
import { optionalDate, optionalInt } from '../utils/query.js';
import { assertCanTeach } from '../services/access.service.js';
import { classScope } from '../services/classScope.service.js';
import { deliver } from '../services/delivery.service.js';

const include = {
  subject: true,
  schoolClass: true,
  author: { select: { firstName: true, lastName: true } },
};

const fields = {
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(5000),
  dueDate: z.coerce.date(),
};
const createSchema = z.object({
  ...fields,
  classId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
});
const updateSchema = z.object(fields).partial();

const todayUtc = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const findHomework = async (db, id) => {
  const hw = await db.homework.findFirst({ where: { id, deletedAt: null }, include });
  if (!hw) throw new AppError('Homework not found', 404);
  return hw;
};

// Students of the class and their parents (active accounts only)
const classRecipients = async (db, classId) => {
  const inClass = { deletedAt: null, enrollments: { some: { classId, deletedAt: null } } };
  const base = { isActive: true, deletedAt: null };
  const select = { id: true, email: true };
  const [students, parents] = await Promise.all([
    db.user.findMany({ where: { ...base, student: inClass }, select }),
    db.user.findMany({
      where: { ...base, parent: { deletedAt: null, children: { some: { student: inClass } } } },
      select,
    }),
  ]);
  return [...new Map([...students, ...parents].map((u) => [u.id, u])).values()];
};

const router = Router();
router.use(authenticate);
router.param('id', (req, res, next, v) =>
  (/^\d+$/.test(v) ? next() : next(new AppError('Invalid id', 400))));

const writers = ['ADMIN', 'TEACHER'];

// Query: classId, subjectId, from, to (on the due date). With "from": soonest first, otherwise latest first.
router.get('/', asyncHandler(async (req, res) => {
  const where = {
    deletedAt: null,
    ...(await classScope(req.user, optionalInt(req.query.classId, 'classId'))),
  };
  const subjectId = optionalInt(req.query.subjectId, 'subjectId');
  if (subjectId) where.subjectId = subjectId;

  const from = optionalDate(req.query.from, 'from');
  const to = optionalDate(req.query.to, 'to');
  if (from || to) where.dueDate = { ...(from && { gte: from }), ...(to && { lte: to }) };

  const items = await prisma.homework.findMany({
    where, include, orderBy: [{ dueDate: from ? 'asc' : 'desc' }, { id: 'desc' }], take: 200,
  });
  res.json({ status: 'success', data: items });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const hw = await findHomework(prisma, Number(req.params.id));
  await classScope(req.user, hw.classId);
  res.json({ status: 'success', data: hw });
}));

router.post('/', authorize(...writers), validate(createSchema), asyncHandler(async (req, res) => {
  const { classId, subjectId, title, description, dueDate } = req.body;

  const { homework, recipients } = await prisma.$transaction(async (tx) => {
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
    if (dueDate < todayUtc()) throw new AppError('Due date cannot be in the past', 400);

    const created = await tx.homework.create({
      data: { classId, subjectId, title, description, dueDate, authorId: req.user.id },
      include,
    });

    const users = await classRecipients(tx, classId);
    const due = dueDate.toISOString().slice(0, 10).split('-').reverse().join('/');
    await tx.notification.createMany({
      data: users.map((u) => ({
        userId: u.id, type: 'HOMEWORK', channel: 'IN_APP',
        title: `Nouveau devoir : ${title}`,
        body: `${subject.name} - à rendre pour le ${due}`,
        data: { homeworkId: created.id }, status: 'SENT', sentAt: new Date(),
      })),
    });

    await logAudit(tx, {
      userId: req.user.id, action: 'CREATE', entity: 'Homework', entityId: created.id, newValues: created,
    });
    return { homework: created, recipients: { users, subject: subject.name, due } };
  });

  if (recipients.users.length) {
    void deliver(
      recipients.users.map((u) => ({ userId: u.id, email: u.email })),
      {
        type: 'HOMEWORK',
        title: `Nouveau devoir : ${title}`,
        body: `${recipients.subject} - à rendre pour le ${recipients.due}`,
        data: { homeworkId: homework.id },
        link: `${process.env.CLIENT_URL || ''}/devoirs`,
      },
      { email: false },
    );
  }

  res.status(201).json({ status: 'success', data: homework });
}));

router.patch('/:id', authorize(...writers), validate(updateSchema), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const record = await prisma.$transaction(async (tx) => {
    const before = await findHomework(tx, id);
    await assertCanTeach(tx, req.user, before.classId, before.subjectId);

    const { dueDate } = req.body;
    if (dueDate && dueDate.getTime() !== before.dueDate.getTime() && dueDate < todayUtc()) {
      throw new AppError('Due date cannot be in the past', 400);
    }

    const after = await tx.homework.update({ where: { id }, data: req.body, include });
    await logAudit(tx, {
      userId: req.user.id, action: 'UPDATE', entity: 'Homework', entityId: id,
      oldValues: before, newValues: after,
    });
    return after;
  });
  res.json({ status: 'success', data: record });
}));

router.delete('/:id', authorize(...writers), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await prisma.$transaction(async (tx) => {
    const before = await findHomework(tx, id);
    await assertCanTeach(tx, req.user, before.classId, before.subjectId);
    await tx.homework.update({ where: { id }, data: { deletedAt: new Date() } });
    await logAudit(tx, {
      userId: req.user.id, action: 'DELETE', entity: 'Homework', entityId: id, oldValues: before,
    });
  });
  res.json({ status: 'success', message: 'Deleted' });
}));

export default router;