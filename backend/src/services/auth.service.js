import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma, platformPrisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

const signToken = (user) =>
  jwt.sign({ sub: String(user.id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });

// Hash factice : evite de reveler par le temps de reponse qu'un e-mail existe.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

const SCHOOL_FIELDS = { id: true, code: true, status: true, name: true, currency: true };

const loginResult = (user, school) => {
  const { passwordHash, school: _school, ...safeUser } = user;
  return {
    token: signToken(user),
    user: safeUser,
    school: { id: school.id, code: school.code, name: school.name, currency: school.currency },
  };
};

// School user login. Same error message for unknown school / email / password.
// schoolCode est optionnel : sans code, on cherche l'e-mail dans les ecoles actives.
export const login = async (schoolCode, email, password) => {
  const fail = () => new AppError('Invalid credentials', 401);
  const mail = email.trim().toLowerCase();
  const code = schoolCode ? schoolCode.trim().toLowerCase() : '';

  if (code) {
    const school = await platformPrisma.school.findFirst({ where: { code }, select: SCHOOL_FIELDS });
    if (!school || school.status !== 'ACTIVE') throw fail();

    const user = await platformPrisma.user.findFirst({
      where: { email: mail, schoolId: school.id, deletedAt: null },
    });
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) throw fail();
    return loginResult(user, school);
  }

  const candidates = await platformPrisma.user.findMany({
    where: {
      email: mail, deletedAt: null, isActive: true,
      schoolId: { not: null }, school: { status: 'ACTIVE' },
    },
    include: { school: { select: SCHOOL_FIELDS } },
  });

  if (candidates.length === 0) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw fail();
  }

  const matches = [];
  for (const candidate of candidates) {
    if (await bcrypt.compare(password, candidate.passwordHash)) matches.push(candidate);
  }
  if (matches.length === 0) throw fail();
  // Le 409 n'est renvoye qu'apres verification du mot de passe : aucune fuite avant.
  if (matches.length > 1) {
    throw new AppError('This account exists in several schools: enter your school code', 409);
  }
  return loginResult(matches[0], matches[0].school);
};

export const platformLogin = async (email, password) => {
  const user = await platformPrisma.user.findFirst({
    where: { email: email.toLowerCase(), role: 'SUPER_ADMIN', deletedAt: null },
  });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError('Invalid credentials', 401);
  }
  const { passwordHash, ...safeUser } = user;
  return { token: signToken(user), user: safeUser };
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await platformPrisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw new AppError('User not found', 401);
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError('Current password is incorrect', 400);
  }
  await platformPrisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 10),
      mustChangePassword: false,
    },
  });
};