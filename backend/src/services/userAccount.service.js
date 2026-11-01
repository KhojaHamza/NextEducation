import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { AppError } from '../utils/AppError.js';

export const userSelect = {
  id: true, email: true, firstName: true, lastName: true, phone: true,
  role: true, isActive: true, mustChangePassword: true, createdAt: true,
};

export const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const body = Array.from({ length: 10 }, () => chars[crypto.randomInt(chars.length)]).join('');
  return `${body}${crypto.randomInt(10, 100)}`;
};

export const createUserAccount = async (tx, { email, firstName, lastName, phone, role }) => {
  const exists = await tx.user.findUnique({ where: { email } });
  if (exists) throw new AppError('This email is already used (possibly by an archived account)', 409);

  const tempPassword = generateTempPassword();
  const user = await tx.user.create({
    data: {
      email, firstName, lastName, phone, role,
      passwordHash: await bcrypt.hash(tempPassword, 10),
      mustChangePassword: true,
    },
    select: userSelect, // never returns or logs the hash
  });
  return { user, tempPassword };
};