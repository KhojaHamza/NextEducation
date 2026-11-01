import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { optionalInt } from '../utils/query.js';
import { listContacts } from '../services/messageAccess.service.js';
import * as messaging from '../services/messaging.service.js';

const positiveId = z.number().int().positive();

const sendSchema = z
  .object({
    subject: z.string().trim().min(1).max(150).optional(),
    body: z.string().trim().min(1).max(5000),
    recipientIds: z.array(positiveId).min(1).max(50).optional(),
    studentId: positiveId.optional(),
    important: z.boolean().optional(),
    replyToId: positiveId.optional(),
    draft: z.literal(false).optional(),
  })
  .refine((d) => d.replyToId || (d.subject && d.recipientIds), {
    message: 'subject and recipientIds are required for a new message',
    path: ['subject'],
  });

// A draft may be incomplete
const draftSchema = z.object({
  subject: z.string().trim().max(150).optional(),
  body: z.string().trim().max(5000).optional(),
  recipientIds: z.array(positiveId).max(50).optional(),
  studentId: positiveId.optional(),
  important: z.boolean().optional(),
  replyToId: positiveId.optional(),
  draft: z.literal(true),
});

const updateSchema = z
  .object({
    subject: z.string().trim().max(150),
    body: z.string().trim().max(5000),
    recipientIds: z.array(positiveId).max(50),
    studentId: positiveId.nullable(),
    important: z.boolean(),
  })
  .partial();

const chooseCreateSchema = (req, res, next) =>
  validate(req.body?.draft === true ? draftSchema : sendSchema)(req, res, next);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
});

const router = Router();
router.use(authenticate);

const validId = (req, res, next, v) =>
  (/^\d+$/.test(v) ? next() : next(new AppError('Invalid id', 400)));
['id', 'threadId', 'attachmentId'].forEach((p) => router.param(p, validId));

// ---------- Reading ----------

router.get('/contacts', asyncHandler(async (req, res) => {
  const studentId = optionalInt(req.query.studentId, 'studentId');
  const search = req.query.search ? String(req.query.search).slice(0, 50) : undefined;
  res.json({ status: 'success', data: await listContacts(req.user, { studentId, search }) });
}));

router.get('/threads', asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await messaging.listThreads(req.user) });
}));

router.get('/threads/:threadId', asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await messaging.getThread(req.user, Number(req.params.threadId)) });
}));

router.get('/drafts', asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await messaging.listDrafts(req.user) });
}));

router.get('/unread-count', asyncHandler(async (req, res) => {
  res.json({ status: 'success', count: await messaging.unreadCount(req.user) });
}));

// Who opened which conversation (metadata only: admins cannot read other people's messages)
router.get('/access-log', authorize('ADMIN'), asyncHandler(async (req, res) => {
  const where = {};
  const threadId = optionalInt(req.query.threadId, 'threadId');
  if (threadId) where.threadId = threadId;
  const userId = optionalInt(req.query.userId, 'userId');
  if (userId) where.userId = userId;

  const items = await prisma.messageAccessLog.findMany({
    where, orderBy: { id: 'desc' }, take: 200,
    include: { user: { select: { id: true, email: true, role: true } } },
  });
  res.json({ status: 'success', data: items });
}));

router.get('/:id/attachments/:attachmentId', asyncHandler(async (req, res) => {
  const { attachment, stream } = await messaging.getAttachment(
    req.user, Number(req.params.id), Number(req.params.attachmentId),
  );
  res.setHeader('Content-Type', attachment.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  stream.on('error', (err) => res.destroy(err));
  stream.pipe(res);
}));

// ---------- Writing ----------

router.post('/', chooseCreateSchema, asyncHandler(async (req, res) => {
  res.status(201).json({ status: 'success', data: await messaging.saveMessage(req.user, req.body) });
}));

router.patch('/:id', validate(updateSchema), asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await messaging.updateDraft(req.user, Number(req.params.id), req.body) });
}));

router.post('/:id/send', asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await messaging.sendDraft(req.user, Number(req.params.id)) });
}));

// Only drafts can be deleted; a sent message answers 409
router.delete('/:id', asyncHandler(async (req, res) => {
  await messaging.deleteDraft(req.user, Number(req.params.id));
  res.json({ status: 'success', message: 'Draft deleted' });
}));

// Recipient-side deletion
router.post('/:id/hide', asyncHandler(async (req, res) => {
  await messaging.hideMessage(req.user, Number(req.params.id));
  res.json({ status: 'success', message: 'Message hidden from your inbox' });
}));

router.post('/:id/attachments', upload.array('files', 3), asyncHandler(async (req, res) => {
  const data = await messaging.addAttachments(req.user, Number(req.params.id), req.files);
  res.status(201).json({ status: 'success', data });
}));

router.delete('/:id/attachments/:attachmentId', asyncHandler(async (req, res) => {
  await messaging.removeAttachment(req.user, Number(req.params.id), Number(req.params.attachmentId));
  res.json({ status: 'success', message: 'Attachment removed' });
}));

export default router;