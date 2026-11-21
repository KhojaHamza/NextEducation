import jwt from 'jsonwebtoken';
import { prisma, platformPrisma, schoolContext } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const buildAuthenticate = ({ allowTemporaryPassword }) =>
  asyncHandler(async (req, res, next) => {
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

    // We don't know the school yet: use the platform client for this one lookup.
    const user = await platformPrisma.user.findFirst({
      where: { id: Number(payload.sub), deletedAt: null, isActive: true },
      select: {
        id: true, email: true, role: true, firstName: true, lastName: true,
        mustChangePassword: true, schoolId: true,
        school: { select: { status: true } },
      },
    });
    if (!user) throw new AppError('User no longer exists or is disabled', 401);

    // ---- SUPER_ADMIN: no school, no tenant context ----
    if (user.role === 'SUPER_ADMIN') {
      if (user.schoolId) throw new AppError('SUPER_ADMIN must not belong to a school', 500);
      return schoolContext.run(
        { userId: user.id, role: 'SUPER_ADMIN', schoolId: null },
        () => {
          req.user = {
            id: user.id, email: user.email, role: 'SUPER_ADMIN',
            firstName: user.firstName, lastName: user.lastName,
            mustChangePassword: user.mustChangePassword, schoolId: null,
          };
          next();
        },
      );
    }

    // ---- Regular users: must have an active school ----
    if (!user.schoolId) throw new AppError('User has no school', 403);
    if (!user.school || user.school.status !== 'ACTIVE') {
      throw new AppError('This school is not active', 403);
    }
    if (user.mustChangePassword && !allowTemporaryPassword) {
      throw new AppError('You must change your temporary password first', 403);
    }

    return schoolContext.run(
      { userId: user.id, schoolId: user.schoolId, role: user.role },
      () => {
        req.user = {
          id: user.id, email: user.email, role: user.role,
          firstName: user.firstName, lastName: user.lastName,
          mustChangePassword: user.mustChangePassword,
          schoolId: user.schoolId,
        };
        next();
      },
    );
  });

export const authenticate = buildAuthenticate({ allowTemporaryPassword: false });
export const authenticateAllowingTemporaryPassword = buildAuthenticate({ allowTemporaryPassword: true });

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to do this', 403));
  }
  next();
};