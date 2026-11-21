import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { platformPrisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

// Ce module n'expose que des donnees de pilotage (ecoles, compteurs, statuts).
// Aucune donnee personnelle d'eleve, de parent ou d'enseignant ne sort d'ici.

const RESERVED_CODES = new Set(['platform', 'admin', 'api', 'e', 'www', 'app', 'login', 'health']);

const SCHOOL_SELECT = {
  id: true, code: true, name: true, status: true, plan: true,
  subscriptionEnd: true, currency: true, address: true, phone: true,
  createdAt: true, updatedAt: true,
};

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const pick = (set) => set[crypto.randomInt(set.length)];

// 12 caracteres, au moins une majuscule, une minuscule, un chiffre (compatible avec la regle de changement de mot de passe).
export const generateTempPassword = () => {
  const all = UPPER + LOWER + DIGITS;
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS)];
  while (chars.length < 12) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

// Jamais de mot de passe ni de hash dans les details d'audit.
const audit = (db, { userId, action, entity, entityId, targetSchoolId, details }) =>
  db.platformAuditLog.create({
    data: {
      userId: userId ?? null,
      action,
      entity,
      entityId: entityId ?? null,
      targetSchoolId: targetSchoolId ?? null,
      details: details ?? undefined,
    },
  });

const findSchoolOrThrow = async (db, id) => {
  const school = await db.school.findFirst({ where: { id }, select: SCHOOL_SELECT });
  if (!school) throw new AppError('School not found', 404);
  return school;
};

export const listSchools = async ({ search, status } = {}) => {
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
  }
  return platformPrisma.school.findMany({
    where,
    orderBy: { id: 'asc' },
    select: { ...SCHOOL_SELECT, _count: { select: { users: true, students: true } } },
  });
};

export const getSchool = async (id) => {
  const school = await platformPrisma.school.findFirst({
    where: { id },
    select: { ...SCHOOL_SELECT, _count: { select: { users: true, students: true } } },
  });
  if (!school) throw new AppError('School not found', 404);
  const roles = await platformPrisma.user.groupBy({
    by: ['role'],
    where: { schoolId: id, deletedAt: null },
    _count: { _all: true },
  });
  return { ...school, usersByRole: Object.fromEntries(roles.map((r) => [r.role, r._count._all])) };
};

export const createSchool = async (actor, input) => {
  const code = input.code.trim().toLowerCase();
  if (RESERVED_CODES.has(code)) throw new AppError('This school code is reserved', 400);

  const adminEmail = input.admin.email.trim().toLowerCase();
  const temporaryPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const result = await platformPrisma.$transaction(async (tx) => {
    const exists = await tx.school.findFirst({ where: { code } });
    if (exists) throw new AppError('This school code is already used', 409);

    const school = await tx.school.create({
      data: {
        code,
        name: input.name.trim(),
        status: 'ACTIVE',
        plan: input.plan ?? 'basic',
        currency: input.currency ?? 'TND',
        subscriptionEnd: input.subscriptionEnd ? new Date(input.subscriptionEnd) : null,
        address: input.address ?? null,
        phone: input.phone ?? null,
      },
      select: SCHOOL_SELECT,
    });

    const admin = await tx.user.create({
      data: {
        schoolId: school.id,
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        firstName: input.admin.firstName.trim(),
        lastName: input.admin.lastName.trim(),
        mustChangePassword: true,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    await audit(tx, {
      userId: actor.id, action: 'CREATE_SCHOOL', entity: 'School', entityId: school.id,
      targetSchoolId: school.id, details: { code, name: school.name, adminEmail },
    });
    return { school, admin };
  });

  return { ...result, temporaryPassword };
};

export const updateSchool = async (actor, id, input) => {
  const before = await findSchoolOrThrow(platformPrisma, id);
  const data = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.plan !== undefined) data.plan = input.plan;
  if (input.currency !== undefined) data.currency = input.currency;
  if (input.address !== undefined) data.address = input.address;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.subscriptionEnd !== undefined) {
    data.subscriptionEnd = input.subscriptionEnd ? new Date(input.subscriptionEnd) : null;
  }
  if (Object.keys(data).length === 0) throw new AppError('Nothing to update', 400);

  const after = await platformPrisma.school.update({ where: { id }, data, select: SCHOOL_SELECT });
  await audit(platformPrisma, {
    userId: actor.id, action: 'UPDATE_SCHOOL', entity: 'School', entityId: id, targetSchoolId: id,
    details: { before, after },
  });
  return after;
};

export const setSchoolStatus = async (actor, id, status) => {
  const before = await findSchoolOrThrow(platformPrisma, id);
  if (before.status === status) return before;
  const after = await platformPrisma.school.update({ where: { id }, data: { status }, select: SCHOOL_SELECT });
  await audit(platformPrisma, {
    userId: actor.id, action: 'SET_SCHOOL_STATUS', entity: 'School', entityId: id, targetSchoolId: id,
    details: { from: before.status, to: status },
  });
  return after;
};

// Support : nouveau mot de passe temporaire pour un ADMIN d'ecole (jamais pour un autre role).
export const resetSchoolAdminPassword = async (actor, schoolId, email) => {
  await findSchoolOrThrow(platformPrisma, schoolId);
  const admin = await platformPrisma.user.findFirst({
    where: { schoolId, email: email.trim().toLowerCase(), role: 'ADMIN', deletedAt: null },
    select: { id: true, email: true },
  });
  if (!admin) throw new AppError('Admin not found in this school', 404);

  const temporaryPassword = generateTempPassword();
  await platformPrisma.user.update({
    where: { id: admin.id },
    data: { passwordHash: await bcrypt.hash(temporaryPassword, 10), mustChangePassword: true, isActive: true },
  });
  await audit(platformPrisma, {
    userId: actor.id, action: 'RESET_ADMIN_PASSWORD', entity: 'User', entityId: admin.id,
    targetSchoolId: schoolId, details: { adminEmail: admin.email },
  });
  return { admin, temporaryPassword };
};

export const listPlatformAuditLogs = async ({ schoolId, limit } = {}) =>
  platformPrisma.platformAuditLog.findMany({
    where: schoolId ? { targetSchoolId: schoolId } : {},
    orderBy: { id: 'desc' },
    take: Math.min(Math.max(Number(limit) || 50, 1), 200),
  });