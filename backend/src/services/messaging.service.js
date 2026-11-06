import path from 'node:path';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { logAudit } from '../core/audit.service.js';
import { assertCanMessage } from './messageAccess.service.js';
import { deliver } from './delivery.service.js';
import { deleteFile, inspectFile, openFile, saveFile } from './storage.service.js';

const MAX_ATTACHMENTS = 5;
const userBrief = { id: true, firstName: true, lastName: true, role: true };
const fullName = (u) => `${u.firstName} ${u.lastName}`;

export const messageInclude = {
  sender: { select: userBrief },
  student: { select: { id: true, firstName: true, lastName: true } },
  recipients: { include: { user: { select: userBrief } } },
  attachments: { select: { id: true, fileName: true, mimeType: true, size: true } },
};

export const shapeMessage = (m, viewerId) => ({
  id: m.id,
  threadId: m.threadId ?? m.id,
  subject: m.subject,
  body: m.body,
  important: m.important,
  status: m.status,
  sentAt: m.sentAt,
  mine: m.senderId === viewerId,
  sender: { id: m.sender.id, name: fullName(m.sender), role: m.sender.role },
  student: m.student ? { id: m.student.id, name: fullName(m.student) } : null,
  recipients: m.recipients.map((r) => ({
    userId: r.user.id, name: fullName(r.user), role: r.user.role,
    // read receipts are visible to the sender only
    ...(m.senderId === viewerId && { readAt: r.readAt }),
  })),
  attachments: m.attachments,
});

// Metadata only: message content must stay between its participants, the audit log is admin-readable
const auditMeta = (m, recipientIds) => ({
  id: m.id, threadId: m.threadId, status: m.status, studentId: m.studentId, recipientIds,
});

const notificationContent = (sender, message) => ({
  type: 'MESSAGE_RECEIVED',
  title: `Nouveau message : ${message.subject}`,
  body: `${fullName(sender)} vous a envoyé un message.`,
  data: { messageId: message.id, threadId: message.threadId ?? message.id, studentId: message.studentId },
  link: `${process.env.CLIENT_URL || ''}/messages/${message.threadId ?? message.id}`,
});

// In-app notifications are saved in the same transaction as the message
const notifyInApp = async (tx, sender, message, recipients) => {
  const content = notificationContent(sender, message);
  const now = new Date();
  await tx.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.id, type: content.type, channel: 'IN_APP', title: content.title,
      body: content.body, data: content.data, status: 'SENT', sentAt: now,
    })),
  });
  return content;
};

// Push (and email for important messages) after the commit, in the background
const dispatch = (recipients, content, message) =>
  void deliver(recipients.map((r) => ({ userId: r.id, email: r.email })), content, { email: message.important });

// Root message + participants (everyone who sent or received a message of the thread)
const loadThreadInfo = async (db, threadId) => {
  const root = await db.message.findFirst({ where: { id: threadId, threadId: null, status: 'SENT' } });
  if (!root) return null;
  const messages = await db.message.findMany({
    where: { status: 'SENT', OR: [{ id: threadId }, { threadId }] },
    select: { senderId: true, recipients: { select: { userId: true } } },
  });
  const participants = new Set();
  for (const m of messages) {
    participants.add(m.senderId);
    m.recipients.forEach((r) => participants.add(r.userId));
  }
  return { root, participants };
};

// ---------- Create / send ----------

export const saveMessage = async (user, input) => {
  const isDraft = input.draft === true;

  const result = await prisma.$transaction(async (tx) => {
    let { subject, body, recipientIds, studentId } = input;
    let threadId = null;
    let participants = null;

    if (input.replyToId) {
      const target = await tx.message.findFirst({
        where: { id: input.replyToId, status: 'SENT' }, select: { id: true, threadId: true },
      });
      const rootId = target ? (target.threadId ?? target.id) : null;
      const info = rootId ? await loadThreadInfo(tx, rootId) : null;
      if (!info || !info.participants.has(user.id)) throw new AppError('Conversation not found', 404);

      threadId = rootId;
      participants = info.participants;
      subject = info.root.subject;
      studentId = info.root.studentId ?? undefined;
      recipientIds = recipientIds ?? [...participants].filter((id) => id !== user.id);
    }

    const unique = [...new Set(recipientIds ?? [])];
    if (unique.includes(user.id)) throw new AppError('You cannot message yourself', 400);
    if (participants && unique.some((id) => !participants.has(id))) {
      throw new AppError('A reply can only go to people already in the conversation', 400);
    }

    const data = {
      senderId: user.id, threadId, studentId: studentId ?? null,
      subject: subject ?? '', body: body ?? '', important: input.important === true,
    };

    if (isDraft) {
      const message = await tx.message.create({
        data: { ...data, status: 'DRAFT', recipients: { create: unique.map((userId) => ({ userId })) } },
        include: messageInclude,
      });
      await logAudit(tx, {
        userId: user.id, action: 'CREATE', entity: 'Message', entityId: message.id, newValues: auditMeta(message, unique),
      });
      return { message, draft: true };
    }

    if (!unique.length) throw new AppError('At least one recipient is required', 400);
    const recipients = await assertCanMessage(tx, user, unique, studentId);

    const message = await tx.message.create({
      data: {
        ...data, status: 'SENT', sentAt: new Date(),
        recipients: { create: unique.map((userId) => ({ userId })) },
      },
      include: messageInclude,
    });
    const content = await notifyInApp(tx, user, message, recipients);
    await logAudit(tx, {
      userId: user.id, action: 'CREATE', entity: 'Message', entityId: message.id, newValues: auditMeta(message, unique),
    });
    return { message, recipients, content, draft: false };
  });

  if (!result.draft) dispatch(result.recipients, result.content, result.message);
  return shapeMessage(result.message, user.id);
};

export const sendDraft = async (user, id) => {
  const result = await prisma.$transaction(async (tx) => {
    const draft = await tx.message.findFirst({ where: { id, senderId: user.id }, include: { recipients: true } });
    if (!draft) throw new AppError('Message not found', 404);
    if (draft.status === 'SENT') throw new AppError('This message was already sent', 409);

    const ids = draft.recipients.map((r) => r.userId);
    if (!draft.subject.trim() || !draft.body.trim() || !ids.length) {
      throw new AppError('Subject, body and at least one recipient are required to send', 400);
    }
    const recipients = await assertCanMessage(tx, user, ids, draft.studentId ?? undefined);

    // Claims the draft atomically: a double click cannot send it twice
    const claimed = await tx.message.updateMany({
      where: { id, status: 'DRAFT' }, data: { status: 'SENT', sentAt: new Date() },
    });
    if (claimed.count === 0) throw new AppError('This message was already sent', 409);

    const message = await tx.message.findUnique({ where: { id }, include: messageInclude });
    const content = await notifyInApp(tx, user, message, recipients);
    await logAudit(tx, {
      userId: user.id, action: 'UPDATE', entity: 'Message', entityId: id, newValues: auditMeta(message, ids),
    });
    return { message, recipients, content };
  });

  dispatch(result.recipients, result.content, result.message);
  return shapeMessage(result.message, user.id);
};

// ---------- Drafts ----------

export const updateDraft = (user, id, input) =>
  prisma.$transaction(async (tx) => {
    const draft = await tx.message.findFirst({ where: { id, senderId: user.id } });
    if (!draft) throw new AppError('Message not found', 404);
    if (draft.status !== 'DRAFT') {
      throw new AppError('Sent messages are immutable and cannot be modified', 409);
    }

    const { recipientIds, ...fields } = input;
    const data = {};
    for (const key of ['subject', 'body', 'studentId', 'important']) {
      if (fields[key] !== undefined) data[key] = fields[key];
    }
    if (draft.threadId) { delete data.subject; delete data.studentId; } // a reply keeps its conversation's subject

    if (recipientIds) {
      const unique = [...new Set(recipientIds)];
      if (unique.includes(user.id)) throw new AppError('You cannot message yourself', 400);
      await tx.messageRecipient.deleteMany({ where: { messageId: id } });
      await tx.messageRecipient.createMany({ data: unique.map((userId) => ({ messageId: id, userId })) });
    }

    const message = await tx.message.update({ where: { id }, data, include: messageInclude });
    await logAudit(tx, {
      userId: user.id, action: 'UPDATE', entity: 'Message', entityId: id,
      newValues: auditMeta(message, message.recipients.map((r) => r.userId)),
    });
    return shapeMessage(message, user.id);
  });

export const deleteDraft = async (user, id) => {
  const keys = await prisma.$transaction(async (tx) => {
    const draft = await tx.message.findFirst({ where: { id, senderId: user.id }, include: { attachments: true } });
    if (!draft) throw new AppError('Message not found', 404);
    if (draft.status !== 'DRAFT') {
      throw new AppError(
        'A sent message cannot be deleted by its sender. Recipients can hide it from their own inbox.', 409,
      );
    }
    await tx.message.delete({ where: { id } }); // recipients and attachment rows cascade
    await logAudit(tx, {
      userId: user.id, action: 'DELETE', entity: 'Message', entityId: id, oldValues: auditMeta(draft, []),
    });
    return draft.attachments.map((a) => a.storageKey);
  });
  await Promise.all(keys.map((k) => deleteFile(k).catch(() => {})));
};

export const listDrafts = async (user) => {
  const drafts = await prisma.message.findMany({
    where: { senderId: user.id, status: 'DRAFT' }, include: messageInclude, orderBy: { updatedAt: 'desc' },
  });
  return drafts.map((m) => shapeMessage(m, user.id));
};

// ---------- Reading ----------

const visibleTo = (userId) => ({
  status: 'SENT',
  OR: [{ senderId: userId }, { recipients: { some: { userId, hiddenAt: null } } }],
});

export const listThreads = async (user) => {
  const messages = await prisma.message.findMany({
    where: visibleTo(user.id),
    include: {
      sender: { select: userBrief },
      student: { select: { id: true, firstName: true, lastName: true } },
      recipients: { select: { userId: true, readAt: true } },
    },
    orderBy: { sentAt: 'desc' },
    take: 300,
  });

  const threads = new Map();
  for (const m of messages) {
    const key = m.threadId ?? m.id;
    const unread = m.recipients.some((r) => r.userId === user.id && r.readAt === null) ? 1 : 0;
    const thread = threads.get(key);

    if (!thread) {
      threads.set(key, {
        threadId: key,
        subject: m.subject,
        important: m.important,
        student: m.student ? { id: m.student.id, name: fullName(m.student) } : null,
        lastMessage: {
          id: m.id, sentAt: m.sentAt, from: fullName(m.sender),
          mine: m.senderId === user.id, preview: m.body.slice(0, 120),
        },
        unreadCount: unread,
        messageCount: 1,
      });
    } else {
      thread.messageCount += 1;
      thread.unreadCount += unread;
    }
  }
  return [...threads.values()];
};

// Opening a conversation marks it read and is written to the access log
export const getThread = async (user, threadId) => {
  const messages = await prisma.message.findMany({
    where: { AND: [visibleTo(user.id), { OR: [{ id: threadId }, { threadId }] }] },
    include: messageInclude,
    orderBy: { sentAt: 'asc' },
  });
  if (!messages.length) throw new AppError('Conversation not found', 404);

  await prisma.$transaction([
    prisma.messageRecipient.updateMany({
      where: { userId: user.id, readAt: null, messageId: { in: messages.map((m) => m.id) } },
      data: { readAt: new Date() },
    }),
    prisma.messageAccessLog.create({ data: { userId: user.id, threadId, action: 'VIEW_THREAD' } }),
  ]);
  return messages.map((m) => shapeMessage(m, user.id));
};

export const unreadCount = (user) =>
  prisma.messageRecipient.count({
    where: { userId: user.id, readAt: null, hiddenAt: null, message: { status: 'SENT' } },
  });

// Recipient-side deletion: hides the message from this user's inbox only
export const hideMessage = async (user, id) => {
  const message = await prisma.message.findFirst({
    where: { id, status: 'SENT' }, select: { id: true, senderId: true },
  });
  if (!message) throw new AppError('Message not found', 404);
  if (message.senderId === user.id) {
    throw new AppError('A sent message cannot be deleted by its sender', 409);
  }
  const result = await prisma.messageRecipient.updateMany({
    where: { messageId: id, userId: user.id }, data: { hiddenAt: new Date() },
  });
  if (result.count === 0) throw new AppError('Message not found', 404);
};

// ---------- Attachments ----------

export const addAttachments = async (user, messageId, files) => {
  const draft = await prisma.message.findFirst({
    where: { id: messageId, senderId: user.id },
    include: { _count: { select: { attachments: true } } },
  });
  if (!draft) throw new AppError('Message not found', 404);
  if (draft.status !== 'DRAFT') throw new AppError('Attachments cannot be added to a sent message', 409);
  if (!files?.length) throw new AppError('Attach at least one file in the "files" field', 400);
  if (draft._count.attachments + files.length > MAX_ATTACHMENTS) {
    throw new AppError(`A message can have at most ${MAX_ATTACHMENTS} attachments`, 400);
  }

  const inspected = files.map((file) => ({ file, ...inspectFile(file.originalname, file.buffer) }));

  const keys = [];
  try {
    for (const item of inspected) keys.push(await saveFile(item.file.buffer, item.ext));
    return await prisma.$transaction(
      inspected.map((item, i) =>
        prisma.messageAttachment.create({
          data: {
            messageId, storageKey: keys[i], mimeType: item.mime, size: item.file.size,
            fileName: path.basename(item.file.originalname).slice(0, 120),
          },
          select: { id: true, fileName: true, mimeType: true, size: true },
        })),
    );
  } catch (err) {
    await Promise.all(keys.map((k) => deleteFile(k).catch(() => {})));
    throw err;
  }
};

export const removeAttachment = async (user, messageId, attachmentId) => {
  const attachment = await prisma.messageAttachment.findFirst({
    where: { id: attachmentId, messageId, message: { senderId: user.id, status: 'DRAFT' } },
  });
  if (!attachment) throw new AppError('Attachment not found (only drafts can be changed)', 404);
  await prisma.messageAttachment.delete({ where: { id: attachmentId } });
  await deleteFile(attachment.storageKey).catch(() => {});
};

export const getAttachment = async (user, messageId, attachmentId) => {
  const attachment = await prisma.messageAttachment.findFirst({
    where: {
      id: attachmentId, messageId,
      message: { OR: [{ senderId: user.id }, { status: 'SENT', recipients: { some: { userId: user.id, hiddenAt: null } } }] },
    },
    include: { message: { select: { id: true, threadId: true, status: true } } },
  });
  if (!attachment) throw new AppError('Attachment not found', 404);

  if (attachment.message.status === 'SENT') {
    await prisma.messageAccessLog.create({
      data: {
        userId: user.id, threadId: attachment.message.threadId ?? attachment.message.id,
        messageId, attachmentId, action: 'DOWNLOAD_ATTACHMENT',
      },
    });
  }
  return { attachment, stream: await openFile(attachment.storageKey) };
};