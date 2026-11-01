import { Prisma } from '@prisma/client';
import { z } from 'zod';

export const Decimal = Prisma.Decimal;
export const ZERO = () => new Decimal(0);

export const currency = () => process.env.CURRENCY || 'TND';
export const fmt = (value) => new Decimal(value).toFixed(3);
export const fmtDate = (d) => new Date(d).toISOString().slice(0, 10).split('-').reverse().join('/');

// A positive amount with at most 3 decimals
export const amountSchema = z
  .number()
  .positive()
  .max(1_000_000)
  .refine((v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-6, 'At most 3 decimals');