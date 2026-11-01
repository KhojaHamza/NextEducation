import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Checks the token and loads the current user
export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401);
  }

  let payload;
  try {
    payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }

  const user = await prisma.user.findFirst({
    where: { id: Number(payload.sub), deletedAt: null, isActive: true },
    select: { id: true, email: true, role: true, firstName: true, lastName: true },
  });
  if (!user) throw new AppError('User no longer exists or is disabled', 401);

  req.user = user;
  next();
});

// Restricts a route to the given roles: authorize('ADMIN', 'ACCOUNTANT')
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to do this', 403));
  }
  next();
};