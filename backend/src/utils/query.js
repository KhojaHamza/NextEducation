import { AppError } from './AppError.js';

export const optionalInt = (value, name) => {
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(`Invalid ${name}`, 400);
  return n;
};

export const optionalEnum = (value, allowed, name) => {
  if (value === undefined || value === '') return undefined;
  if (!allowed.includes(value)) {
    throw new AppError(`Invalid ${name}: expected one of ${allowed.join(', ')}`, 400);
  }
  return value;
};

export const optionalDate = (value, name) => {
  if (value === undefined || value === '') return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new AppError(`Invalid ${name}`, 400);
  return d;
};