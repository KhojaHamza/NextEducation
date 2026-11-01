import { AppError } from '../utils/AppError.js';

export const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

// Translates common Prisma errors into readable responses
const fromPrisma = (err) => {
  if (err?.name !== 'PrismaClientKnownRequestError') return null;
  switch (err.code) {
    case 'P2002':
      return new AppError('A record with the same unique values already exists (it may be archived)', 409);
    case 'P2003':
      return new AppError('A referenced record does not exist', 400);
    case 'P2025':
      return new AppError('Record not found', 404);
    default:
      return null;
  }
};

export const errorHandler = (err, req, res, next) => {
  const error = fromPrisma(err) || err;
  const statusCode = error.statusCode || 500;

  if (statusCode === 500) console.error(err);

  res.status(statusCode).json({
    status: 'error',
    message: statusCode === 500 ? 'Internal server error' : error.message,
    ...(error.details && { details: error.details }),
  });
};